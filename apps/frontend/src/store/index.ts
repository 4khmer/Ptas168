import { create } from 'zustand'
import type {
  BuildingDto, FloorDto, RoomDto, ContractDto, TenantDto,
  ServiceFeeDto, RoomServiceDto, UserDto, BankPaymentDto,
  TelegramLinkDto, BankNotificationGroupDto,
  InvoiceStatusResponse, InvoicePaymentMethodWire,
  MintCodeResponse, AuthResponse,
} from '@ptas/contracts'
import type {
  InvoiceUiDto, InvoiceSettings, GroupedMeterReading,
  MeterReadingLatest,
  CreateTenantArgs, UpdateTenantArgs, UpdateProfileArgs,
  AddTenantToRoomArgs, UpdateContractArgs,
  BuildingInput, FloorInput, UpdateRoomArgs,
  CreateServiceFeeArgs, UpdateServiceFeeArgs,
  RoomServiceInput,
  CreateSubUserArgs, UpdateSubUserArgs,
} from '@ptas/sdk'
import { resolveInvoiceStatus } from '../lib/billing'
import { getStoredLanguage, persistLanguage } from '../lib/i18n'
import {
  getToken, setToken,
  authApi, buildingsApi, floorsApi, roomsApi, tenantsApi, contractsApi,
  roomServicesApi, meterReadingsApi, invoicesApi, serviceFeesApi,
  settingsApi, usersApi, bankPaymentsApi, telegramLinksApi, bankNotificationGroupsApi,
  groupMeterReadings, adaptInvoice, parseInvoiceSettings,
} from '../sdk'

// ── Local types ────────────────────────────────────────────────────────────

/** What the store keeps about the logged-in user. UserDto with role lowercased. */
export interface AuthUser {
  id: string
  name: string
  username: string
  phone: string
  profileImage: string | null
  role: string
  via: string
}

/** UI shape returned by getRoomServices selector — adds derived display fields. */
export interface RoomServiceUi {
  id: string
  roomId: string
  serviceId: string
  enabled: boolean
  priceOverride: number | null
  name: string
  icon: string
  type: 'fixed' | 'utility'
  serviceType: string
  unitLabel: string
  effectiveRate: number
  defaultRate: number
}

export interface PagedInvoicesState {
  items: InvoiceUiDto[]
  total: number
  page: number
  hasMore: boolean
  byStatus: { all: number; progress: number; paid: number; overdue: number; cancelled: number }
  lastQueryKey: string
  loading: boolean
}

export interface OwnerProfile {
  name: string
  phone: string
  profileImage: string | null
}

/** Result type from the room → status join used by Rooms list + Room Detail. */
export interface RoomWithStatus {
  room: RoomDto
  contract: ContractDto | null
  tenant: { id?: string; name?: string; phone?: string } | null
  floor: FloorDto | undefined
  building: BuildingDto | undefined
  occupied: boolean
}

export interface AddMeterReadingInput {
  date: string
  waterPrev?: number | null
  waterCurrent?: number | null
  elecPrev?: number | null
  elecCurrent?: number | null
}

export interface CreateInvoiceFormInput {
  roomId: string
  billPeriodStart?: string
  billPeriodEnd?: string
  periodStart?: string
  periodEnd?: string
  dueDateOffsetDays?: number
  dueOption?: number
  waterPrev?: number | null
  waterCurrent?: number | null
  elecPrev?: number | null
  elecCurrent?: number | null
}

const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  header: { enabled: true, profileImage: null, bizName: '', tinNo: '', address: '', bizPhone: '' },
  body:   { enabled: true, invoiceNoDigits: 6 },
  footer: { enabled: true, note: '' },
  qr:     { enabled: false, qrString: '' },
}

// ── Store interface ────────────────────────────────────────────────────────

interface StoreState {
  // ── Auth state ──
  token: string | null
  isLoggedIn: boolean
  authUser: AuthUser | null

  // ── Entity caches ──
  buildings: BuildingDto[]
  floors: FloorDto[]
  rooms: RoomDto[]
  contracts: ContractDto[]
  tenants: TenantDto[]
  masterServices: ServiceFeeDto[]
  roomServices: RoomServiceDto[]
  meterReadings: GroupedMeterReading[]
  latestMeterReadings: Record<string, MeterReadingLatest[]>
  invoices: InvoiceUiDto[]
  pagedInvoices: PagedInvoicesState

  exchangeRate: number
  language: string

  // ── Loading + error ──
  loading: Record<string, boolean>
  error: string | null

  subUsers: UserDto[]
  bankPayments: BankPaymentDto[]
  telegramLinks: TelegramLinkDto[]
  bankNotificationGroups: BankNotificationGroupDto[]
  ownerProfile: OwnerProfile
  invoiceSettings: InvoiceSettings

  // ── Internal helpers ──
  _setLoading: (key: string, val: boolean) => void
  _onAuthFailure: (err: unknown) => void

  // ── Selectors ──
  getActiveContract: (roomId: string) => ContractDto | null
  getRoomWithStatus: (roomId: string) => RoomWithStatus | null
  getAllRoomsWithStatus: () => Array<RoomWithStatus | null>
  resolveInvoice: (inv: InvoiceUiDto) => InvoiceUiDto
  getInvoicesByRoom: (roomId: string) => InvoiceUiDto[]
  getAllInvoices: () => InvoiceUiDto[]
  getInvoiceById: (id: string) => InvoiceUiDto | null
  getRoomServices: (roomId: string) => RoomServiceUi[]
  getLastMeterReading: (roomId: string) => GroupedMeterReading | null
  getMeterReadings: (roomId: string) => GroupedMeterReading[]
  getTenantRooms: (tenantId: string) => Array<RoomWithStatus & { contract: ContractDto } | null>

  // ── Auth actions ──
  loginWithCredentials: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  loginWithTelegram: () => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  bootstrapSession: () => Promise<void>
  updateAuthProfile: (args: { name?: string; username?: string; phone?: string | null; profileImage?: string | null }) => Promise<void>
  changeAuthPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>

  // ── Loaders ──
  loadInitialData: () => Promise<void>
  loadFloors: (buildingId?: string) => Promise<void>
  loadTenants: () => Promise<void>
  loadAllInvoices: () => Promise<void>
  loadInvoicesPage: (args?: { q?: string; status?: InvoiceStatusResponse; from?: string; to?: string; pageSize?: number }) => Promise<void>
  loadInvoiceCounts: (args?: { q?: string; from?: string; to?: string }) => Promise<void>
  resetPagedInvoices: () => void
  loadInvoiceById: (id: string) => Promise<InvoiceUiDto | null>
  loadBankPayments: () => Promise<void>
  loadTelegramLinks: () => Promise<void>
  getTelegramLinkForRoom: (roomId: string) => TelegramLinkDto | null
  requestTelegramLinkCode: (roomId: string) => Promise<MintCodeResponse>
  removeTelegramLink: (id: string) => Promise<void>
  loadBankNotificationGroups: () => Promise<void>
  requestBankNotificationGroupCode: () => Promise<MintCodeResponse>
  removeBankNotificationGroup: (id: string) => Promise<void>
  loadRoomInvoices: (roomId: string) => Promise<void>
  loadRoomData: (roomId: string) => Promise<void>
  loadLatestMeterReadings: (roomId: string) => Promise<MeterReadingLatest[]>
  loadTenantContracts: (tenantId?: string) => Promise<void>

  // ── Building CRUD ──
  addBuilding: (data: BuildingInput) => Promise<BuildingDto>
  updateBuilding: (id: string, data: BuildingInput) => Promise<void>
  deleteBuilding: (id: string) => Promise<{ error: string | null }>

  // ── Floor CRUD ──
  addFloor: (data: { buildingId: string; name: string; remark?: string | null }) => Promise<FloorDto>
  updateFloor: (id: string, data: FloorInput) => Promise<void>
  deleteFloor: (id: string) => Promise<{ error: string | null }>

  // ── Room CRUD ──
  addRoom: (data: { floorId: string; buildingId?: string; name: string; size?: string; price: number | string }) => Promise<RoomDto>
  updateRoom: (id: string, data: UpdateRoomArgs) => Promise<void>
  deleteRoom: (id: string) => Promise<{ error: string | null }>

  // ── Tenant CRUD ──
  addTenant: (data: CreateTenantArgs) => Promise<TenantDto>
  updateTenant: (id: string, data: UpdateTenantArgs) => Promise<void>
  lookupTenantByPhone: (phone: string) => Promise<TenantDto | null>

  // ── Contracts (tenant ↔ room) ──
  addTenantToRoom: (roomId: string, data: AddTenantToRoomArgs) => Promise<ContractDto>
  removeTenantFromRoom: (contractId: string, reason?: string) => Promise<void>
  updateContract: (contractId: string, data: UpdateContractArgs) => Promise<void>

  // ── Room services ──
  setRoomServices: (roomId: string, services: RoomServiceInput[]) => Promise<void>

  // ── Meter readings ──
  addMeterReading: (roomId: string, data: AddMeterReadingInput) => Promise<void>

  // ── Invoices ──
  createInvoice: (data: CreateInvoiceFormInput) => Promise<InvoiceUiDto>
  markInvoicePaid: (invoiceId: string, method: InvoicePaymentMethodWire) => Promise<void>
  cancelInvoice: (invoiceId: string, reason?: string) => Promise<void>
  getInvoicePdfUrl: () => Promise<string | null>

  // ── Service fees ──
  addMasterService: (data: CreateServiceFeeArgs) => Promise<ServiceFeeDto>
  updateMasterService: (id: string, data: UpdateServiceFeeArgs) => Promise<void>
  deleteMasterService: (id: string) => Promise<{ error: string | null }>

  // ── Settings ──
  updateExchangeRate: (rate: number | string) => Promise<void>
  setLanguage: (lang: string) => void
  updateInvoiceSettings: <K extends keyof InvoiceSettings>(section: K, data: Partial<InvoiceSettings[K]>) => Promise<void>

  // ── Sub-users ──
  loadSubUsers: () => Promise<void>
  addSubUser: (data: CreateSubUserArgs) => Promise<UserDto>
  updateSubUser: (id: string, data: UpdateSubUserArgs) => Promise<void>
  deleteSubUser: (id: string) => Promise<void>
}

// ── Implementation ─────────────────────────────────────────────────────────

function toAuthUser(u: UserDto | AuthResponse['user']): AuthUser {
  return {
    id: u.id,
    name: u.name,
    username: u.username || '',
    phone: u.phone || '',
    profileImage: u.profileImage ?? null,
    role: (u.role || 'manager').toLowerCase(),
    via: u.via || 'credentials',
  }
}

export const useStore = create<StoreState>()((set, get) => ({

  // ── Auth ──
  token: getToken(),
  isLoggedIn: !!getToken(),
  authUser: null,

  // ── Entity caches ──
  buildings: [],
  floors: [],
  rooms: [],
  contracts: [],
  tenants: [],
  masterServices: [],
  roomServices: [],
  meterReadings: [],
  latestMeterReadings: {},
  invoices: [],

  pagedInvoices: {
    items: [],
    total: 0,
    page: 0,
    hasMore: false,
    byStatus: { all: 0, progress: 0, paid: 0, overdue: 0, cancelled: 0 },
    lastQueryKey: '',
    loading: false,
  },

  exchangeRate: 4000,
  // getStoredLanguage returns string|null because it reads localStorage; at
  // runtime the unsupported-value branch always returns 'en', but TS can't
  // narrow through Array.includes. Fall back to 'en' to satisfy the type.
  language: getStoredLanguage() || 'en',

  loading: {},
  error: null,

  subUsers: [],
  bankPayments: [],
  telegramLinks: [],
  bankNotificationGroups: [],
  ownerProfile: { name: '', phone: '', profileImage: null },
  invoiceSettings: DEFAULT_INVOICE_SETTINGS,

  // ── Internal helpers ──
  _setLoading(key, val) {
    set(s => ({ loading: { ...s.loading, [key]: val } }))
  },

  _onAuthFailure(err) {
    const status = (err as { status?: number } | null | undefined)?.status
    if (status === 401) {
      setToken(null)
      set({ isLoggedIn: false, token: null, authUser: null })
    }
  },

  // ── Selectors ──────────────────────────────────────────────────────────────

  getActiveContract(roomId) {
    return get().contracts.find(c => c.roomId === roomId && c.status === 'active') || null
  },

  getRoomWithStatus(roomId) {
    const { rooms, contracts, buildings, floors } = get()
    const room = rooms.find(r => r.id === roomId)
    if (!room) return null
    const contract = contracts.find(c => c.roomId === roomId && c.status === 'active') || null
    const tenant = contract
      ? { id: contract.tenantId, name: contract.tenantName, phone: contract.tenantPhone }
      : (room.occupied && room.tenantName ? { name: room.tenantName } : null)
    const floor    = floors.find(f => f.id === room.floorId)
    const building = buildings.find(b => b.id === room.buildingId)
    return { room, contract, tenant, floor, building, occupied: room.occupied || !!contract }
  },

  getAllRoomsWithStatus() {
    return get().rooms.map(r => get().getRoomWithStatus(r.id))
  },

  resolveInvoice(inv) {
    // resolveInvoiceStatus is still JS; cast the narrowed string back to the union.
    return { ...inv, status: resolveInvoiceStatus(inv.status, inv.dueDate) as InvoiceStatusResponse }
  },

  getInvoicesByRoom(roomId) {
    return get().invoices
      .filter(inv => inv.roomId === roomId)
      .map(inv => get().resolveInvoice(inv))
      .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())
  },

  getAllInvoices() {
    return get().invoices
      .map(inv => get().resolveInvoice(inv))
      .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())
  },

  getInvoiceById(id) {
    // The Billing tab populates `pagedInvoices.items` rather than the
    // global `invoices` array, so look there first when the user came
    // from that tab. Falls back to the global cache (Payments / Room
    // Detail / direct mutations) and finally to null.
    const inv =
      get().pagedInvoices?.items?.find(i => i.id === id) ||
      get().invoices.find(i => i.id === id)
    return inv ? get().resolveInvoice(inv) : null
  },

  getRoomServices(roomId) {
    return get().roomServices
      .filter(rs => rs.roomId === roomId && rs.enabled)
      .map(rs => ({
        id: rs.id,
        roomId: rs.roomId,
        serviceId: rs.serviceId,
        enabled: rs.enabled,
        priceOverride: rs.priceOverride,
        name: rs.serviceName,
        icon: rs.serviceIcon,
        type: (rs.serviceType === 'FIXED' ? 'fixed' : 'utility') as 'fixed' | 'utility',
        serviceType: rs.serviceType,
        unitLabel: rs.unit ? `$/${rs.unit}` : '$/mo',
        effectiveRate: rs.effectiveRate,
        defaultRate: rs.defaultRate,
      }))
  },

  getLastMeterReading(roomId) {
    return get().meterReadings
      .filter(r => r.roomId === roomId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null
  },

  getMeterReadings(roomId) {
    return get().meterReadings
      .filter(r => r.roomId === roomId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  },

  getTenantRooms(tenantId) {
    return get().contracts
      .filter(c => c.tenantId === tenantId)
      .map(c => {
        const row = get().getRoomWithStatus(c.roomId)
        return row ? { ...row, contract: c } : null
      })
  },

  // ── Auth actions ───────────────────────────────────────────────────────────

  async loginWithCredentials(username, password) {
    set({ error: null })
    get()._setLoading('login', true)
    try {
      const data = await authApi.loginWithCredentials(username, password)
      setToken(data.token)
      set({ isLoggedIn: true, token: data.token, authUser: toAuthUser(data.user) })
      get().loadInitialData().catch(() => {})
      return { success: true }
    } catch (e) {
      return { success: false, error: (e as Error).message || 'Invalid phone or password' }
    } finally {
      get()._setLoading('login', false)
    }
  },

  async loginWithTelegram() {
    const tg = typeof window !== 'undefined'
      ? (window as { Telegram?: { WebApp?: { initData?: string; initDataUnsafe?: { user?: { first_name: string; last_name?: string } } } } }).Telegram?.WebApp
      : null
    const initData = tg?.initData

    // Outside Telegram (dev) → fall back to local-only stub so the UI still works.
    if (!initData) {
      const tgUser = tg?.initDataUnsafe?.user
      const name = tgUser
        ? `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`
        : 'Telegram User'
      set({
        isLoggedIn: true,
        token: null,
        authUser: { id: 'local', name, username: '', phone: '', profileImage: null, role: 'manager', via: 'telegram' },
      })
      return { success: true }
    }

    set({ error: null })
    get()._setLoading('login', true)
    try {
      const data = await authApi.loginWithTelegram(initData)
      setToken(data.token)
      set({
        isLoggedIn: true,
        token: data.token,
        authUser: { ...toAuthUser(data.user), via: 'telegram' },
      })
      get().loadInitialData().catch(() => {})
      return { success: true }
    } catch (e) {
      return { success: false, error: (e as Error).message || 'Telegram login failed' }
    } finally {
      get()._setLoading('login', false)
    }
  },

  async logout() {
    try { await authApi.logout() } catch { /* swallow — JWT is stateless */ }
    setToken(null)
    set({
      isLoggedIn: false, token: null, authUser: null,
      buildings: [], floors: [], rooms: [], contracts: [], tenants: [],
      masterServices: [], roomServices: [], meterReadings: [], invoices: [],
      latestMeterReadings: {}, subUsers: [],
      invoiceSettings: DEFAULT_INVOICE_SETTINGS,
    })
  },

  // Rehydrate authUser from /auth/me when the app boots with a stored token.
  // The token survives reload via localStorage; authUser does not, so the
  // profile menu would otherwise stay hidden until next login.
  async bootstrapSession() {
    if (!get().token || get().authUser) return
    try {
      const u = await authApi.getProfile()
      set({ authUser: toAuthUser(u) })
    } catch (e) {
      get()._onAuthFailure(e)
    }
  },

  async updateAuthProfile({ name, username, phone, profileImage }) {
    const { authUser } = get()
    if (!authUser) return
    try {
      const args: UpdateProfileArgs = { phone: phone ?? undefined }
      if (name !== undefined) args.fullName = name
      if (username !== undefined) args.username = username
      if (profileImage !== undefined) args.profileImage = profileImage
      const updated = await authApi.updateProfile(args)
      set({
        authUser: {
          ...authUser,
          name: updated.name || name || authUser.name,
          username: updated.username || username || authUser.username,
          phone: updated.phone || phone || authUser.phone || '',
          profileImage: updated.profileImage ?? profileImage ?? authUser.profileImage,
        },
      })
    } catch (e) {
      get()._onAuthFailure(e)
      throw e
    }
  },

  async changeAuthPassword(currentPassword, newPassword) {
    try {
      await authApi.changePassword(currentPassword, newPassword)
      return { success: true }
    } catch (e) {
      return { success: false, error: (e as Error).message || 'Password change failed' }
    }
  },

  // ── Initial / lazy load ────────────────────────────────────────────────────

  async loadInitialData() {
    if (!get().isLoggedIn) return
    get()._setLoading('init', true)
    try {
      const [buildings, rooms, masterServices, settings, contracts] = await Promise.all([
        buildingsApi.list(),
        roomsApi.list(),
        serviceFeesApi.list(),
        settingsApi.get(),
        contractsApi.list({ status: 'active' }),
      ])

      // Derive floors from rooms (each room carries floorId+floorName) — saves a request
      const seenFloors = new Map<string, FloorDto>()
      for (const r of rooms) {
        if (r.floorId && !seenFloors.has(r.floorId)) {
          seenFloors.set(r.floorId, { id: r.floorId, buildingId: r.buildingId, name: r.floorName || '', remark: '' })
        }
      }
      const floors = Array.from(seenFloors.values())

      const exchangeRate = settings.KHR_EXCHANGE_RATE ? parseFloat(settings.KHR_EXCHANGE_RATE) || 4000 : 4000
      const invoiceSettings = parseInvoiceSettings(settings)

      set({ buildings, rooms, floors, masterServices, contracts, exchangeRate, invoiceSettings })

      // Background loads (non-blocking)
      get().loadSubUsers().catch(() => {})
    } catch (e) {
      set({ error: (e as Error).message })
      get()._onAuthFailure(e)
    } finally {
      get()._setLoading('init', false)
    }
  },

  async loadFloors(buildingId) {
    try {
      const data = await floorsApi.list(buildingId)
      set(s => ({
        floors: [...s.floors.filter(f => f.buildingId !== buildingId), ...data],
      }))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  async loadTenants() {
    get()._setLoading('tenants', true)
    try {
      const data = await tenantsApi.list()
      set({ tenants: data })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      get()._setLoading('tenants', false)
    }
  },

  async loadAllInvoices() {
    get()._setLoading('invoices', true)
    try {
      const data = await invoicesApi.list()
      set({ invoices: data.map(adaptInvoice) })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      get()._setLoading('invoices', false)
    }
  },

  // Loads one page of invoices for the Billing tab. When the filter signature
  // (q/status/from/to) changes vs. the prior call, results replace the list;
  // otherwise they append, so the IntersectionObserver sentinel can drive
  // infinite scroll without losing already-loaded rows.
  async loadInvoicesPage({ q = '', status, from = '', to = '', pageSize = 20 } = {}) {
    const queryKey = JSON.stringify({ q, status: status || '', from, to })
    const prev = get().pagedInvoices
    const isNewQuery = prev.lastQueryKey !== queryKey
    if (prev.loading) return
    const nextPage = isNewQuery ? 1 : prev.page + 1
    if (!isNewQuery && !prev.hasMore) return

    set(s => ({ pagedInvoices: { ...s.pagedInvoices, loading: true, lastQueryKey: queryKey } }))
    try {
      const data = await invoicesApi.listPage({ q, status, from, to, page: nextPage, pageSize })
      const adaptedItems = (data.items || []).map(adaptInvoice)
      set(s => ({
        pagedInvoices: {
          ...s.pagedInvoices,
          items: isNewQuery ? adaptedItems : [...s.pagedInvoices.items, ...adaptedItems],
          total: data.total ?? 0,
          page: data.page ?? nextPage,
          hasMore: !!data.hasMore,
          loading: false,
        },
      }))
    } catch (e) {
      set(s => ({ pagedInvoices: { ...s.pagedInvoices, loading: false }, error: (e as Error).message }))
    }
  },

  async loadInvoiceCounts({ q = '', from = '', to = '' } = {}) {
    try {
      const counts = await invoicesApi.listCounts({ q, from, to })
      set(s => ({ pagedInvoices: { ...s.pagedInvoices, byStatus: { ...s.pagedInvoices.byStatus, ...counts } } }))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  resetPagedInvoices() {
    set(s => ({
      pagedInvoices: {
        ...s.pagedInvoices,
        items: [], total: 0, page: 0, hasMore: false, lastQueryKey: '', loading: false,
      },
    }))
  },

  // Fetch a single invoice by id and add it to the global `invoices`
  // cache. Used by InvoiceDetail when the user lands on /invoice/:id
  // directly (deep link or page refresh) and neither `invoices` nor
  // `pagedInvoices.items` has the row yet. Returns the adapted invoice
  // or null when the API rejects.
  async loadInvoiceById(id) {
    if (!id) return null
    try {
      const raw = await invoicesApi.get(id)
      const adapted = adaptInvoice(raw)
      set(s => {
        const exists = s.invoices.some(i => i.id === adapted.id)
        return exists
          ? { invoices: s.invoices.map(i => i.id === adapted.id ? adapted : i) }
          : { invoices: [...s.invoices, adapted] }
      })
      return adapted
    } catch (e) {
      set({ error: (e as Error).message })
      return null
    }
  },

  async loadBankPayments() {
    get()._setLoading('bankPayments', true)
    try {
      const data = await bankPaymentsApi.list()
      set({ bankPayments: Array.isArray(data) ? data : [] })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      get()._setLoading('bankPayments', false)
    }
  },

  async loadTelegramLinks() {
    get()._setLoading('telegramLinks', true)
    try {
      const data = await telegramLinksApi.list()
      set({ telegramLinks: Array.isArray(data) ? data : [] })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      get()._setLoading('telegramLinks', false)
    }
  },

  getTelegramLinkForRoom(roomId) {
    if (!roomId) return null
    return get().telegramLinks.find(l => l.roomId === roomId) ?? null
  },

  async requestTelegramLinkCode(roomId) {
    return await telegramLinksApi.requestCode(roomId)
  },

  async removeTelegramLink(id) {
    await telegramLinksApi.remove(id)
    set(s => ({ telegramLinks: s.telegramLinks.filter(l => l.id !== id) }))
  },

  async loadBankNotificationGroups() {
    get()._setLoading('bankNotificationGroups', true)
    try {
      const data = await bankNotificationGroupsApi.list()
      set({ bankNotificationGroups: Array.isArray(data) ? data : [] })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      get()._setLoading('bankNotificationGroups', false)
    }
  },

  async requestBankNotificationGroupCode() {
    return await bankNotificationGroupsApi.requestCode()
  },

  async removeBankNotificationGroup(id) {
    await bankNotificationGroupsApi.remove(id)
    set(s => ({ bankNotificationGroups: s.bankNotificationGroups.filter(g => g.id !== id) }))
  },

  async loadRoomInvoices(roomId) {
    try {
      const data = await invoicesApi.list({ roomId })
      const adapted = data.map(adaptInvoice)
      set(s => ({ invoices: [...s.invoices.filter(inv => inv.roomId !== roomId), ...adapted] }))
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  async loadRoomData(roomId) {
    get()._setLoading(`room_${roomId}`, true)
    try {
      const [contracts, services, readings] = await Promise.all([
        contractsApi.list({ roomId }),
        roomServicesApi.list(roomId),
        meterReadingsApi.list(roomId),
      ])
      const grouped = groupMeterReadings(readings, roomId)
      set(s => ({
        contracts:    [...s.contracts.filter(c => c.roomId !== roomId), ...contracts],
        roomServices: [...s.roomServices.filter(rs => rs.roomId !== roomId), ...services],
        meterReadings: [...s.meterReadings.filter(r => r.roomId !== roomId), ...grouped],
      }))
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      get()._setLoading(`room_${roomId}`, false)
    }
  },

  async loadLatestMeterReadings(roomId) {
    try {
      const data = await meterReadingsApi.latest(roomId)
      set(s => ({ latestMeterReadings: { ...s.latestMeterReadings, [roomId]: data } }))
      return data
    } catch {
      return []
    }
  },

  async loadTenantContracts(/* tenantId */) {
    // Frontend derives via getTenantRooms + already-loaded contracts.
    // Could be extended to call contractsApi.list({ tenantId }).
  },

  // ── Building CRUD ──────────────────────────────────────────────────────────

  async addBuilding(data) {
    const b = await buildingsApi.create(data)
    set(s => ({ buildings: [...s.buildings, b] }))
    return b
  },

  async updateBuilding(id, data) {
    const b = await buildingsApi.update(id, data)
    set(s => ({ buildings: s.buildings.map(x => x.id === id ? b : x) }))
  },

  async deleteBuilding(id) {
    try {
      await buildingsApi.delete(id)
      set(s => ({
        buildings: s.buildings.filter(b => b.id !== id),
        floors: s.floors.filter(f => f.buildingId !== id),
        rooms: s.rooms.filter(r => r.buildingId !== id),
      }))
      return { error: null }
    } catch (e) {
      return { error: (e as Error).message }
    }
  },

  // ── Floor CRUD ─────────────────────────────────────────────────────────────

  async addFloor(data) {
    const f = await floorsApi.create(data.buildingId, { name: data.name, remark: data.remark })
    set(s => ({ floors: [...s.floors, f] }))
    return f
  },

  async updateFloor(id, data) {
    const f = await floorsApi.update(id, data)
    set(s => ({ floors: s.floors.map(x => x.id === id ? f : x) }))
  },

  async deleteFloor(id) {
    try {
      await floorsApi.delete(id)
      set(s => ({
        floors: s.floors.filter(f => f.id !== id),
        rooms: s.rooms.filter(r => r.floorId !== id),
      }))
      return { error: null }
    } catch (e) {
      return { error: (e as Error).message }
    }
  },

  // ── Room CRUD ──────────────────────────────────────────────────────────────

  async addRoom(data) {
    const r = await roomsApi.create(data.floorId, { name: data.name, size: data.size, price: data.price })
    set(s => ({ rooms: [...s.rooms, r] }))
    return r
  },

  async updateRoom(id, data) {
    const r = await roomsApi.update(id, data)
    set(s => ({ rooms: s.rooms.map(x => x.id === id ? r : x) }))
  },

  async deleteRoom(id) {
    try {
      await roomsApi.delete(id)
      set(s => ({ rooms: s.rooms.filter(r => r.id !== id) }))
      return { error: null }
    } catch (e) {
      return { error: (e as Error).message }
    }
  },

  // ── Tenant CRUD ────────────────────────────────────────────────────────────

  async addTenant(data) {
    const t = await tenantsApi.create(data)
    set(s => ({ tenants: [...s.tenants, t] }))
    return t
  },

  async updateTenant(id, data) {
    const t = await tenantsApi.update(id, data)
    set(s => {
      // Patch denormalized snapshots so Rooms list + Room Detail update immediately.
      const contracts = s.contracts.map(c =>
        c.tenantId === id ? { ...c, tenantName: t.name, tenantPhone: t.phone } : c,
      )
      const affectedRoomIds = new Set(
        contracts.filter(c => c.tenantId === id && c.status === 'active').map(c => c.roomId),
      )
      const rooms = s.rooms.map(r =>
        affectedRoomIds.has(r.id) ? { ...r, tenantName: t.name } : r,
      )
      return {
        tenants: s.tenants.map(x => x.id === id ? t : x),
        contracts,
        rooms,
      }
    })
  },

  async lookupTenantByPhone(phone) {
    try { return await tenantsApi.lookupByPhone(phone) } catch { return null }
  },

  // ── Tenant ↔ Room (contracts) ──────────────────────────────────────────────

  async addTenantToRoom(roomId, data) {
    const contract = await contractsApi.addTenantToRoom(roomId, data)

    // Backend has already auto-assigned every Service Fee with isDefault=true
    // (configured under More → Service Fees). Refresh the room services so
    // the Room Detail screen reflects the new auto-added rows immediately.
    try {
      const [services, room] = await Promise.all([
        roomServicesApi.list(roomId),
        roomsApi.get(roomId),
      ])
      set(s => ({
        contracts: [...s.contracts, contract],
        roomServices: [...s.roomServices.filter(rs => rs.roomId !== roomId), ...services],
        rooms: s.rooms.map(r => r.id === roomId ? room : r),
      }))
    } catch {
      // Fallback: still record the contract optimistically
      set(s => ({
        contracts: [...s.contracts, contract],
        rooms: s.rooms.map(r => r.id === roomId
          ? { ...r, occupied: true, tenantName: contract.tenantName } : r),
      }))
    }

    return contract
  },

  async removeTenantFromRoom(contractId, reason) {
    const updated = await contractsApi.terminate(contractId, reason)
    try {
      const room = await roomsApi.get(updated.roomId)
      set(s => ({
        contracts: s.contracts.map(c => c.id === contractId ? updated : c),
        rooms: s.rooms.map(r => r.id === updated.roomId ? room : r),
      }))
    } catch {
      set(s => ({
        contracts: s.contracts.map(c => c.id === contractId ? updated : c),
        rooms: s.rooms.map(r => r.id === updated.roomId
          ? { ...r, occupied: false, tenantName: null, canStartBill: false } : r),
      }))
    }
  },

  async updateContract(contractId, data) {
    const updated = await contractsApi.update(contractId, data)
    set(s => ({ contracts: s.contracts.map(c => c.id === contractId ? updated : c) }))
  },

  // ── Room Services ──────────────────────────────────────────────────────────

  async setRoomServices(roomId, services) {
    const refreshed = await roomServicesApi.set(roomId, services)
    set(s => ({
      roomServices: [...s.roomServices.filter(rs => rs.roomId !== roomId), ...refreshed],
    }))
  },

  // ── Meter Readings ─────────────────────────────────────────────────────────

  async addMeterReading(roomId, data) {
    const recordedByName = get().authUser?.name || 'Manager'
    const recordDate = data.date

    const ops: Array<Promise<unknown>> = []
    if (data.waterCurrent != null) {
      ops.push(meterReadingsApi.create(roomId, {
        serviceType: 'WATER',
        recordDate,
        recordedByName,
        previousReading: data.waterPrev ?? 0,
        currentReading: data.waterCurrent,
      }))
    }
    if (data.elecCurrent != null) {
      ops.push(meterReadingsApi.create(roomId, {
        serviceType: 'ELECTRICITY',
        recordDate,
        recordedByName,
        previousReading: data.elecPrev ?? 0,
        currentReading: data.elecCurrent,
      }))
    }
    await Promise.all(ops)

    const rows = await meterReadingsApi.list(roomId)
    const grouped = groupMeterReadings(rows, roomId)
    set(s => ({
      meterReadings: [...s.meterReadings.filter(r => r.roomId !== roomId), ...grouped],
    }))
  },

  // ── Invoices ───────────────────────────────────────────────────────────────

  async createInvoice(data) {
    // Backend computes the invoice from server-side state.
    // In "auto" meter mode, the readings are auto-filled from the last record
    // and a fresh reading would just duplicate it (usage = 0), so we skip the
    // persist step and let the bill use the most recent stored reading.
    const room = get().rooms.find(r => r.id === data.roomId)
    const isAutoMode = room?.meterReadingMode === 'auto'

    if (!isAutoMode) {
      const recordedByName = get().authUser?.name || 'Manager'
      const today = new Date().toISOString().split('T')[0]
      const meterOps: Array<Promise<unknown>> = []
      if (data.waterCurrent != null) {
        meterOps.push(meterReadingsApi.create(data.roomId, {
          serviceType: 'WATER',
          recordDate: today,
          recordedByName,
          previousReading: data.waterPrev ?? 0,
          currentReading: data.waterCurrent,
        }))
      }
      if (data.elecCurrent != null) {
        meterOps.push(meterReadingsApi.create(data.roomId, {
          serviceType: 'ELECTRICITY',
          recordDate: today,
          recordedByName,
          previousReading: data.elecPrev ?? 0,
          currentReading: data.elecCurrent,
        }))
      }
      if (meterOps.length) await Promise.all(meterOps)
    }

    const apiInv = await invoicesApi.create(data)
    const adapted = adaptInvoice(apiInv)
    set(s => ({ invoices: [adapted, ...s.invoices] }))

    // Refresh room (canStartBill flips false)
    try {
      const refreshed = await roomsApi.get(data.roomId)
      set(s => ({ rooms: s.rooms.map(r => r.id === data.roomId ? refreshed : r) }))
    } catch { /* noop */ }

    return adapted
  },

  async markInvoicePaid(invoiceId, method) {
    const apiInv = await invoicesApi.pay(invoiceId, method)
    const adapted = adaptInvoice(apiInv)
    set(s => ({
      invoices: s.invoices.map(inv => inv.id === invoiceId ? adapted : inv),
      pagedInvoices: {
        ...s.pagedInvoices,
        items: s.pagedInvoices.items.map(inv => inv.id === invoiceId ? adapted : inv),
      },
    }))
  },

  async cancelInvoice(invoiceId, reason) {
    const apiInv = await invoicesApi.cancel(invoiceId, reason)
    const adapted = adaptInvoice(apiInv)
    set(s => ({
      invoices: s.invoices.map(inv => inv.id === invoiceId ? adapted : inv),
      pagedInvoices: {
        ...s.pagedInvoices,
        items: s.pagedInvoices.items.map(inv => inv.id === invoiceId ? adapted : inv),
      },
    }))
  },

  async getInvoicePdfUrl() {
    return null
  },

  // ── Master Service Fees ────────────────────────────────────────────────────

  async addMasterService(data) {
    const sf = await serviceFeesApi.create(data)
    set(s => ({ masterServices: [...s.masterServices, sf] }))
    return sf
  },

  async updateMasterService(id, data) {
    const sf = await serviceFeesApi.update(id, data)
    set(s => ({ masterServices: s.masterServices.map(m => m.id === id ? sf : m) }))
  },

  async deleteMasterService(id) {
    try {
      await serviceFeesApi.delete(id)
      set(s => ({
        masterServices: s.masterServices.filter(m => m.id !== id),
        roomServices: s.roomServices.filter(rs => rs.serviceId !== id),
      }))
      return { error: null }
    } catch (e) {
      return { error: (e as Error).message }
    }
  },

  // ── Settings ───────────────────────────────────────────────────────────────

  async updateExchangeRate(rate) {
    await settingsApi.update({ KHR_EXCHANGE_RATE: String(rate) })
    set({ exchangeRate: parseFloat(String(rate)) || 0 })
  },

  setLanguage(lang) {
    persistLanguage(lang)
    set({ language: lang })
  },

  async updateInvoiceSettings(section, data) {
    // Optimistic local update
    set(s => ({
      invoiceSettings: { ...s.invoiceSettings, [section]: { ...s.invoiceSettings[section], ...data } },
    }))

    // Map nested → flat key/value for backend
    const updated = { ...get().invoiceSettings[section] } as Record<string, unknown>
    const kv: Record<string, string> = {}
    const d = data as Record<string, unknown>
    if (section === 'header') {
      if ('enabled' in d)  kv.INVOICE_HEADER_ENABLED = String(updated.enabled)
      if ('bizName' in d)  kv.INVOICE_BIZ_NAME       = String(updated.bizName  || '')
      if ('tinNo' in d)    kv.INVOICE_TIN_NO         = String(updated.tinNo    || '')
      if ('address' in d)  kv.INVOICE_ADDRESS        = String(updated.address  || '')
      if ('bizPhone' in d) kv.INVOICE_BIZ_PHONE      = String(updated.bizPhone || '')
    } else if (section === 'footer') {
      if ('enabled' in d) kv.INVOICE_FOOTER_ENABLED = String(updated.enabled)
      if ('note' in d)    kv.INVOICE_FOOTER_NOTE    = String(updated.note || '')
    } else if (section === 'body') {
      if ('invoiceNoDigits' in d) kv.INVOICE_NO_DIGITS = String(updated.invoiceNoDigits)
    } else if (section === 'qr') {
      if ('enabled' in d)  kv.INVOICE_QR_ENABLED = String(updated.enabled)
      if ('qrString' in d) kv.INVOICE_QR_STRING  = String(updated.qrString || '')
    }

    if (Object.keys(kv).length) {
      try { await settingsApi.update(kv) } catch { /* keep optimistic */ }
    }
  },

  // ── Sub Users ──────────────────────────────────────────────────────────────

  async loadSubUsers() {
    try {
      const data = await usersApi.list()
      set({ subUsers: data })
    } catch (e) {
      // 403 is expected for non-owner/manager roles — silently ignore
      const status = (e as { status?: number } | null | undefined)?.status
      if (status !== 403) set({ error: (e as Error).message })
    }
  },

  async addSubUser(data) {
    const u = await usersApi.create(data)
    set(s => ({ subUsers: [...s.subUsers, u] }))
    return u
  },

  async updateSubUser(id, data) {
    const u = await usersApi.update(id, data)
    set(s => ({ subUsers: s.subUsers.map(x => x.id === id ? u : x) }))
  },

  async deleteSubUser(id) {
    await usersApi.delete(id)
    set(s => ({ subUsers: s.subUsers.filter(u => u.id !== id) }))
  },

}))
