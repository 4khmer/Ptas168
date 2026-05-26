import { create } from 'zustand'
import { resolveInvoiceStatus } from '../lib/billing.js'
import { getStoredLanguage, persistLanguage } from '../lib/i18n.js'
import {
  getToken, setToken,
  authApi, buildingsApi, floorsApi, roomsApi, tenantsApi, contractsApi,
  roomServicesApi, meterReadingsApi, invoicesApi, serviceFeesApi,
  settingsApi, usersApi, bankPaymentsApi, telegramLinksApi, bankNotificationGroupsApi,
  groupMeterReadings, adaptInvoice, parseInvoiceSettings,
} from '../sdk.js'

const DEFAULT_INVOICE_SETTINGS = {
  header: { enabled: true, profileImage: null, bizName: '', tinNo: '', address: '', bizPhone: '' },
  body:   { enabled: true, invoiceNoDigits: 6 },
  footer: { enabled: true, note: '' },
  qr:     { enabled: false, qrString: '' },
}

export const useStore = create((set, get) => ({

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
  latestMeterReadings: {}, // { roomId: [{ serviceType, previousReading, currentReading, autoFilled, lastRecordDate }] }
  invoices: [],

  // Paginated state for the Billing tab. Separate from the `invoices` cache,
  // which other pages still rely on as a flat all-rows array.
  // lastQueryKey is the serialized filter signature; when it changes we reset.
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
  language: getStoredLanguage(),

  // ── Loading + error ──
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
    if (err?.status === 401) {
      setToken(null)
      set({ isLoggedIn: false, token: null, authUser: null })
    }
  },

  // ── Selectors (unchanged from before) ──────────────────────────────────────

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
      : (room.occupied ? { name: room.tenantName } : null)
    const floor    = floors.find(f => f.id === room.floorId)
    const building = buildings.find(b => b.id === room.buildingId)
    return { room, contract, tenant, floor, building, occupied: room.occupied || !!contract }
  },

  getAllRoomsWithStatus() {
    return get().rooms.map(r => get().getRoomWithStatus(r.id))
  },

  resolveInvoice(inv) {
    return { ...inv, status: resolveInvoiceStatus(inv.status, inv.dueDate) }
  },

  getInvoicesByRoom(roomId) {
    return get().invoices
      .filter(inv => inv.roomId === roomId)
      .map(inv => get().resolveInvoice(inv))
      .sort((a, b) => new Date(b.periodStart) - new Date(a.periodStart))
  },

  getAllInvoices() {
    return get().invoices
      .map(inv => get().resolveInvoice(inv))
      .sort((a, b) => new Date(b.periodStart) - new Date(a.periodStart))
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
        type: rs.serviceType === 'FIXED' ? 'fixed' : 'utility',
        serviceType: rs.serviceType,
        unitLabel: rs.unit ? `$/${rs.unit}` : '$/mo',
        effectiveRate: rs.effectiveRate,
        defaultRate: rs.defaultRate,
      }))
  },

  getLastMeterReading(roomId) {
    return get().meterReadings
      .filter(r => r.roomId === roomId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null
  },

  getMeterReadings(roomId) {
    return get().meterReadings
      .filter(r => r.roomId === roomId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  },

  getTenantRooms(tenantId) {
    return get().contracts
      .filter(c => c.tenantId === tenantId)
      .map(c => ({ ...get().getRoomWithStatus(c.roomId), contract: c }))
  },

  // ── Auth actions ───────────────────────────────────────────────────────────

  async loginWithCredentials(username, password) {
    set({ error: null })
    get()._setLoading('login', true)
    try {
      const data = await authApi.loginWithCredentials(username, password)
      setToken(data.token)
      set({
        isLoggedIn: true,
        token: data.token,
        authUser: {
          id: data.user.id,
          name: data.user.name,
          username: data.user.username || '',
          phone: data.user.phone || '',
          profileImage: data.user.profileImage ?? null,
          role: (data.user.role || 'manager').toLowerCase(),
          via: data.user.via || 'credentials',
        },
      })
      get().loadInitialData().catch(() => {})
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message || 'Invalid phone or password' }
    } finally {
      get()._setLoading('login', false)
    }
  },

  async loginWithTelegram() {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null
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
        authUser: {
          id: data.user.id,
          name: data.user.name,
          username: data.user.username || '',
          phone: data.user.phone || '',
          profileImage: data.user.profileImage ?? null,
          role: (data.user.role || 'manager').toLowerCase(),
          via: 'telegram',
        },
      })
      get().loadInitialData().catch(() => {})
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message || 'Telegram login failed' }
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
      set({
        authUser: {
          id: u.id,
          name: u.name,
          username: u.username || '',
          phone: u.phone || '',
          profileImage: u.profileImage ?? null,
          role: (u.role || 'manager').toLowerCase(),
          via: u.via || 'credentials',
        },
      })
    } catch (e) {
      get()._onAuthFailure(e)
    }
  },

  async updateAuthProfile({ name, username, phone, profileImage }) {
    const { authUser } = get()
    if (!authUser) return
    try {
      const updated = await authApi.updateProfile({
        fullName: name,
        ...(username !== undefined     ? { username }     : {}),
        phone,
        ...(profileImage !== undefined ? { profileImage } : {}),
      })
      set({
        authUser: {
          ...authUser,
          name: updated.name || name,
          username: updated.username || username || authUser.username,
          phone: updated.phone || phone,
          profileImage: updated.profileImage ?? profileImage,
        },
      })
    } catch (e) {
      // On username conflict / validation error, surface the message — DO NOT
      // optimistically apply the change locally (that would mislead the user).
      get()._onAuthFailure(e)
      throw e
    }
  },

  async changeAuthPassword(currentPassword, newPassword) {
    try {
      await authApi.changePassword(currentPassword, newPassword)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message || 'Password change failed' }
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
      const seenFloors = new Map()
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
      set({ error: e.message })
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
      set({ error: e.message })
    }
  },

  async loadTenants() {
    get()._setLoading('tenants', true)
    try {
      const data = await tenantsApi.list()
      set({ tenants: data })
    } catch (e) {
      set({ error: e.message })
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
      set({ error: e.message })
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
      set(s => ({ pagedInvoices: { ...s.pagedInvoices, loading: false }, error: e.message }))
    }
  },

  async loadInvoiceCounts({ q = '', from = '', to = '' } = {}) {
    try {
      const counts = await invoicesApi.listCounts({ q, from, to })
      set(s => ({ pagedInvoices: { ...s.pagedInvoices, byStatus: { ...s.pagedInvoices.byStatus, ...counts } } }))
    } catch (e) {
      set({ error: e.message })
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
      set({ error: e.message })
      return null
    }
  },

  async loadBankPayments() {
    get()._setLoading('bankPayments', true)
    try {
      const data = await bankPaymentsApi.list()
      set({ bankPayments: Array.isArray(data) ? data : [] })
    } catch (e) {
      set({ error: e.message })
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
      set({ error: e.message })
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
      set({ error: e.message })
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
      set({ error: e.message })
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
      set({ error: e.message })
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
      return { error: e.message }
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
      return { error: e.message }
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
      return { error: e.message }
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

    const ops = []
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
      const meterOps = []
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
      const room = await roomsApi.get(data.roomId)
      set(s => ({ rooms: s.rooms.map(r => r.id === data.roomId ? room : r) }))
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
      return { error: e.message }
    }
  },

  // ── Settings ───────────────────────────────────────────────────────────────

  async updateExchangeRate(rate) {
    await settingsApi.update({ KHR_EXCHANGE_RATE: String(rate) })
    set({ exchangeRate: parseFloat(rate) || 0 })
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
    const updated = { ...get().invoiceSettings[section] }
    const kv = {}
    if (section === 'header') {
      if ('enabled' in data)  kv.INVOICE_HEADER_ENABLED = String(updated.enabled)
      if ('bizName' in data)  kv.INVOICE_BIZ_NAME       = updated.bizName  || ''
      if ('tinNo' in data)    kv.INVOICE_TIN_NO         = updated.tinNo    || ''
      if ('address' in data)  kv.INVOICE_ADDRESS        = updated.address  || ''
      if ('bizPhone' in data) kv.INVOICE_BIZ_PHONE      = updated.bizPhone || ''
    } else if (section === 'footer') {
      if ('enabled' in data) kv.INVOICE_FOOTER_ENABLED = String(updated.enabled)
      if ('note' in data)    kv.INVOICE_FOOTER_NOTE    = updated.note || ''
    } else if (section === 'body') {
      if ('invoiceNoDigits' in data) kv.INVOICE_NO_DIGITS = String(updated.invoiceNoDigits)
    } else if (section === 'qr') {
      if ('enabled' in data)  kv.INVOICE_QR_ENABLED = String(updated.enabled)
      if ('qrString' in data) kv.INVOICE_QR_STRING  = updated.qrString || ''
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
      if (e?.status !== 403) set({ error: e.message })
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
