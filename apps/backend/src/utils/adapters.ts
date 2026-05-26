// Convert Prisma rows to the frontend-expected response shape.
// Field names mirror the frontend store exactly.

import type {
  Building, Floor, Room, Tenant, Contract, ServiceFee, RoomService,
  MeterReading, Invoice, InvoiceLineItem, Notification, User, BankPayment,
} from '@prisma/client'

const dec = (v: { toNumber(): number } | null | undefined): number =>
  v == null ? 0 : v.toNumber()
const decOrNull = (v: { toNumber(): number } | null | undefined): number | null =>
  v == null ? null : v.toNumber()

const toIsoDate = (d: Date | null | undefined): string | null =>
  d ? d.toISOString().slice(0, 10) : null

export interface BuildingDto {
  id: string
  name: string
  remark: string
}

export function toBuildingDto(b: Building): BuildingDto {
  return { id: b.id, name: b.name, remark: b.remark ?? '' }
}

export interface FloorDto {
  id: string
  buildingId: string
  name: string
  remark: string
}

export function toFloorDto(f: Floor): FloorDto {
  return { id: f.id, buildingId: f.buildingId, name: f.name, remark: f.remark ?? '' }
}

export interface RoomDto {
  id: string
  floorId: string
  buildingId: string
  name: string
  size: string
  price: number
  active: boolean
  occupied: boolean
  tenantName: string | null
  canStartBill: boolean
  dayCounter: number
  daysInMonth: number
  dayCounterColor: string | null
  meterReadingMode: 'manual' | 'auto'
  assets: RoomAssetDto[]
  floorName?: string
  buildingName?: string
}

export interface RoomAssetDto {
  id: string
  name: string
  notes?: string | null
  photoUrl?: string | null
  addedAt: string
}

export function toRoomDto(
  r: Room,
  ctx?: {
    activeContract?: Contract | null
    floor?: Floor
    building?: Building
    canStartBill?: boolean
    dayCounter?: number
    daysInMonth?: number
    dayCounterColor?: string | null
  },
): RoomDto {
  const tenantName = ctx?.activeContract?.tenantName ?? null
  return {
    id: r.id,
    floorId: r.floorId,
    buildingId: r.buildingId,
    name: r.name,
    size: r.size ?? '',
    price: dec(r.pricePerMonth),
    active: r.active,
    occupied: !!ctx?.activeContract,
    tenantName,
    canStartBill: ctx?.canStartBill ?? false,
    dayCounter: ctx?.dayCounter ?? 1,
    daysInMonth: ctx?.daysInMonth ?? 30,
    dayCounterColor: ctx?.dayCounterColor ?? null,
    meterReadingMode: r.meterReadingMode === 'auto' ? 'auto' : 'manual',
    assets: Array.isArray(r.assets) ? (r.assets as unknown as RoomAssetDto[]) : [],
    floorName: ctx?.floor?.name,
    buildingName: ctx?.building?.name,
  }
}

export interface TenantDocumentDto {
  id: string
  name: string
  type?: string
  size?: number
  dataUrl: string
  uploadedAt: string
}

export interface TenantDto {
  id: string
  name: string
  phone: string
  photo: string | null
  status: string
  documents: TenantDocumentDto[]
}

export function toTenantDto(t: Tenant): TenantDto {
  const docs = Array.isArray(t.documents) ? (t.documents as unknown as TenantDocumentDto[]) : []
  return {
    id: t.id,
    name: t.fullName,
    phone: t.phone,
    photo: t.photoUrl ?? null,
    status: t.status,
    documents: docs,
  }
}

export interface ContractDto {
  id: string
  roomId: string
  tenantId: string
  tenantName: string
  tenantPhone: string
  startDate: string
  endDate: string | null
  baseRent: number
  securityDeposit: number
  status: string
  terminationReason: string | null
  terminatedAt: string | null
}

export function toContractDto(c: Contract): ContractDto {
  return {
    id: c.id,
    roomId: c.roomId,
    tenantId: c.tenantId,
    tenantName: c.tenantName,
    tenantPhone: c.tenantPhone,
    startDate: toIsoDate(c.startDate) ?? '',
    endDate: toIsoDate(c.endDate),
    baseRent: dec(c.baseRent),
    securityDeposit: dec(c.securityDeposit),
    status: c.status,
    terminationReason: c.terminationReason ?? null,
    terminatedAt: c.terminatedAt?.toISOString() ?? null,
  }
}

export interface ServiceFeeDto {
  id: string
  name: string
  icon: string
  type: 'utility' | 'fixed'
  serviceType: string
  defaultRate: number
  unit: string
  unitLabel: string
  canDelete: boolean
  active: boolean
  isDefault: boolean
}

export function toServiceFeeDto(s: ServiceFee): ServiceFeeDto {
  const isUtility = s.serviceType === 'WATER' || s.serviceType === 'ELECTRICITY'
  return {
    id: s.id,
    name: s.name,
    icon: s.icon,
    type: isUtility ? 'utility' : 'fixed',
    serviceType: s.serviceType,
    defaultRate: dec(s.defaultRate),
    unit: s.unit,
    unitLabel: `$/${s.unit}`,
    canDelete: s.deletable,
    active: s.active,
    isDefault: s.isDefault,
  }
}

export interface RoomServiceDto {
  id: string
  roomId: string
  serviceId: string
  serviceName: string
  serviceIcon: string
  serviceType: string
  unit: string
  defaultRate: number
  effectiveRate: number
  priceOverride: number | null
  enabled: boolean
  assignedAt: string
}

export function toRoomServiceDto(rs: RoomService & { serviceFee: ServiceFee }): RoomServiceDto {
  const override = decOrNull(rs.priceOverride)
  const def = dec(rs.serviceFee.defaultRate)
  return {
    id: rs.id,
    roomId: rs.roomId,
    serviceId: rs.serviceFeeId,
    serviceName: rs.serviceFee.name,
    serviceIcon: rs.serviceFee.icon,
    serviceType: rs.serviceFee.serviceType,
    unit: rs.serviceFee.unit,
    defaultRate: def,
    effectiveRate: override ?? def,
    priceOverride: override,
    enabled: rs.active,
    assignedAt: rs.assignedAt.toISOString(),
  }
}

export interface MeterReadingDto {
  id: string
  roomId: string
  serviceType: string
  recordDate: string
  recordedByName: string
  previousReading: number
  currentReading: number
}

export function toMeterReadingDto(m: MeterReading): MeterReadingDto {
  return {
    id: m.id,
    roomId: m.roomId,
    serviceType: m.serviceType,
    recordDate: toIsoDate(m.recordDate) ?? '',
    recordedByName: m.recordedByName,
    previousReading: dec(m.previousReading),
    currentReading: dec(m.currentReading),
  }
}

export interface InvoiceDto {
  id: string
  invoiceNumber: string
  roomId: string
  tenantId: string | null
  tenantName: string
  tenantPhone: string | null
  roomName: string
  buildingName: string
  floorName: string
  billPeriodStart: string
  billPeriodEnd: string
  dueDate: string
  billDays: number
  daysInMonth: number
  status: string
  baseRent: number
  securityDeposit: number
  subtotal: number
  totalAmount: number
  exchangeRate: number
  khrAmount: number | null
  paymentMethod: string | null
  paidAt: string | null
  cancelReason: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
  lineItems: Array<{
    id: string
    lineItemType: string
    description: string
    previousReading: number | null
    currentReading: number | null
    unitPrice: number | null
    amount: number
  }>
}

export function toInvoiceDto(inv: Invoice & { lineItems: InvoiceLineItem[] }): InvoiceDto {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    roomId: inv.roomId,
    tenantId: inv.tenantId,
    tenantName: inv.tenantName,
    tenantPhone: inv.tenantPhone,
    roomName: inv.roomName,
    buildingName: inv.buildingName,
    floorName: inv.floorName,
    billPeriodStart: toIsoDate(inv.billPeriodStart) ?? '',
    billPeriodEnd: toIsoDate(inv.billPeriodEnd) ?? '',
    dueDate: toIsoDate(inv.dueDate) ?? '',
    billDays: inv.billDays,
    daysInMonth: inv.daysInMonth,
    status: deriveDisplayStatus(inv),
    baseRent: dec(inv.baseRent),
    securityDeposit: dec(inv.securityDeposit),
    subtotal: dec(inv.subtotal),
    totalAmount: dec(inv.totalAmount),
    exchangeRate: dec(inv.exchangeRate),
    khrAmount: decOrNull(inv.khrAmount),
    paymentMethod: inv.paymentMethod === 'QRTransfer' ? 'QR Transfer' : inv.paymentMethod,
    paidAt: inv.paidAt?.toISOString() ?? null,
    cancelReason: inv.cancelReason ?? null,
    cancelledAt: inv.cancelledAt?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
    lineItems: inv.lineItems.map(li => ({
      id: li.id,
      lineItemType: li.lineItemType,
      description: li.description,
      previousReading: decOrNull(li.previousReading),
      currentReading: decOrNull(li.currentReading),
      unitPrice: decOrNull(li.unitPrice),
      amount: dec(li.amount),
    })),
  }
}

// progress + past dueDate ⇒ overdue (derived, never persisted)
function deriveDisplayStatus(inv: Invoice): string {
  if (inv.status === 'paid' || inv.status === 'cancelled') return inv.status
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const due = new Date(inv.dueDate)
  due.setUTCHours(0, 0, 0, 0)
  return today > due ? 'overdue' : 'progress'
}

export interface NotificationDto {
  id: string
  type: string
  title: string
  body: string
  ref: string | null
  read: boolean
  createdAt: string
}

export function toNotificationDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    type: n.type.toLowerCase(),
    title: n.title,
    body: n.body,
    ref: n.ref,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }
}

export interface UserDto {
  id: string
  name: string
  username: string
  phone: string | null
  profileImage: string | null
  role: string
  status: string
  via: string
  createdAt: string
}

export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    name: u.fullName,
    username: u.username,
    phone: u.phone ?? null,
    profileImage: u.profileImage ?? null,
    role: u.role,
    status: u.status,
    via: u.via,
    createdAt: u.createdAt.toISOString(),
  }
}

export interface BankPaymentDto {
  id: string
  bank: string
  amount: number
  currency: string
  senderName: string | null
  senderAccount: string | null
  transactionId: string
  apv: string | null
  paidAt: string
  receivedAt: string
  rawText: string
}

export function toBankPaymentDto(p: BankPayment): BankPaymentDto {
  return {
    id: p.id,
    bank: p.bank,
    amount: dec(p.amount),
    currency: p.currency,
    senderName: p.senderName,
    senderAccount: p.senderAccount,
    transactionId: p.transactionId,
    apv: p.apv,
    paidAt: p.paidAt.toISOString(),
    receivedAt: p.receivedAt.toISOString(),
    rawText: p.rawText,
  }
}
