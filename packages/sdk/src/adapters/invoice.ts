import type { InvoiceDto } from '@ptas/contracts'

// UI shape — the nested form the frontend uses. Distinct from the wire
// InvoiceDto. The Zustand store and InvoiceDetail.jsx read this shape.
export interface InvoiceUiDto {
  id: string
  invoiceNumber: string
  roomId: string
  tenantId: string | null
  tenantSnapshot: { name: string; phone: string }
  roomSnapshot: { name: string; building: string; floor: string }
  periodStart: string
  periodEnd: string
  dueDate: string
  billDays: number
  daysInMonth: number
  status: InvoiceDto['status']
  baseRent: number
  waterPrev: number | null
  waterCurrent: number | null
  waterRate: number | null
  elecPrev: number | null
  elecCurrent: number | null
  elecRate: number | null
  fixedServices: Array<{ name: string; amount: number }>
  lineItems: InvoiceDto['lineItems']
  securityDeposit: number
  subtotal: number
  total: number
  exchangeRate: number
  khrAmount: number | null
  paymentMethod: InvoiceDto['paymentMethod']
  paidAt: string | null
  cancelReason: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
}

// Reshape the wire DTO (flat) into the nested UI form.
// Splits the line-items by type into named slots the UI expects.
export function adaptInvoice(inv: InvoiceDto): InvoiceUiDto {
  const lineItems = inv.lineItems || []
  const water = lineItems.find(li => li.lineItemType === 'WATER')
  const elec  = lineItems.find(li => li.lineItemType === 'ELECTRICITY')
  const fixed = lineItems.filter(li => li.lineItemType === 'FIXED_SERVICE')

  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    roomId: inv.roomId,
    tenantId: inv.tenantId,
    tenantSnapshot: { name: inv.tenantName || '', phone: inv.tenantPhone || '' },
    roomSnapshot: {
      name: inv.roomName || '',
      building: inv.buildingName || '',
      floor: inv.floorName || '',
    },
    periodStart: inv.billPeriodStart,
    periodEnd: inv.billPeriodEnd,
    dueDate: inv.dueDate,
    billDays: inv.billDays,
    daysInMonth: inv.daysInMonth,
    status: inv.status,
    baseRent: inv.baseRent ?? 0,
    waterPrev:    water?.previousReading ?? null,
    waterCurrent: water?.currentReading  ?? null,
    waterRate:    water?.unitPrice       ?? null,
    elecPrev:     elec?.previousReading  ?? null,
    elecCurrent:  elec?.currentReading   ?? null,
    elecRate:     elec?.unitPrice        ?? null,
    fixedServices: fixed.map(f => ({ name: f.description, amount: f.amount })),
    lineItems,
    securityDeposit: inv.securityDeposit ?? 0,
    subtotal: inv.subtotal ?? inv.totalAmount ?? 0,
    total: inv.totalAmount ?? inv.subtotal ?? 0,
    exchangeRate: inv.exchangeRate ?? 4000,
    khrAmount: inv.khrAmount ?? null,
    paymentMethod: inv.paymentMethod ?? null,
    paidAt: inv.paidAt ?? null,
    cancelReason: inv.cancelReason ?? null,
    cancelledAt: inv.cancelledAt ?? null,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  }
}
