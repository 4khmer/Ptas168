// Convert Prisma rows to the frontend-expected response shape.
// Field names mirror the frontend store exactly.
//
// All DTO TYPES live in @ptas/contracts (the wire-format source of truth).
// This file imports them, re-exports for convenience, and holds the runtime
// row→DTO functions.

import type {
  Building, Floor, Room, Tenant, Contract, ServiceFee, RoomService,
  MeterReading, Invoice, InvoiceLineItem, Notification, User, BankPayment,
} from '@prisma/client'

import type {
  BuildingDto, FloorDto, RoomDto, RoomAssetDto,
  TenantDto, TenantDocumentDto, ContractDto,
  ServiceFeeDto, RoomServiceDto, MeterReadingDto,
  InvoiceDto, NotificationDto, UserDto, BankPaymentDto,
} from '@ptas/contracts'

// Re-export so legacy `import { XxxDto } from '../utils/adapters.js'` keeps working.
export type {
  BuildingDto, FloorDto, RoomDto, RoomAssetDto,
  TenantDto, TenantDocumentDto, ContractDto,
  ServiceFeeDto, RoomServiceDto, MeterReadingDto,
  InvoiceDto, NotificationDto, UserDto, BankPaymentDto,
}

const dec = (v: { toNumber(): number } | null | undefined): number =>
  v == null ? 0 : v.toNumber()
const decOrNull = (v: { toNumber(): number } | null | undefined): number | null =>
  v == null ? null : v.toNumber()

const toIsoDate = (d: Date | null | undefined): string | null =>
  d ? d.toISOString().slice(0, 10) : null

export function toBuildingDto(b: Building): BuildingDto {
  return { id: b.id, name: b.name, remark: b.remark ?? '' }
}

export function toFloorDto(f: Floor): FloorDto {
  return { id: f.id, buildingId: f.buildingId, name: f.name, remark: f.remark ?? '' }
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

// progress + past dueDate ⇒ overdue (derived, never persisted).
// Returns the union member from InvoiceStatusResponse.
function deriveDisplayStatus(inv: Invoice): InvoiceDto['status'] {
  if (inv.status === 'paid') return 'paid'
  if (inv.status === 'cancelled') return 'cancelled'
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const due = new Date(inv.dueDate)
  due.setUTCHours(0, 0, 0, 0)
  return today > due ? 'overdue' : 'progress'
}

export function toNotificationDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    type: n.type.toLowerCase() as NotificationDto['type'],
    title: n.title,
    body: n.body,
    ref: n.ref,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }
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
