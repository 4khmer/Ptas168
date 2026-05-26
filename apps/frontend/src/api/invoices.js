import { api } from './client.js'

// Backend invoice DTO has flat fields (tenantName, roomName, totalAmount, etc).
// Frontend pages and InvoiceDetail expect nested snapshots (tenantSnapshot, roomSnapshot, total).
// Adapt on read so the rest of the app sees the legacy shape.
export function adaptInvoice(inv) {
  if (!inv) return inv
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

export const invoicesApi = {
  list: ({ roomId, tenantId, status } = {}) => {
    const qs = new URLSearchParams()
    if (roomId)   qs.set('roomId',   roomId)
    if (tenantId) qs.set('tenantId', tenantId)
    if (status)   qs.set('status',   status)
    const q = qs.toString()
    return api.get(`/invoices${q ? `?${q}` : ''}`)
  },

  // Paginated list for the Billing tab. Returns { items, total, page, pageSize, hasMore }.
  listPage: ({ q, status, from, to, page = 1, pageSize = 20 } = {}) => {
    const qs = new URLSearchParams()
    if (q)      qs.set('q', q)
    if (status) qs.set('status', status)
    if (from)   qs.set('from', from)
    if (to)     qs.set('to', to)
    qs.set('page', String(page))
    qs.set('pageSize', String(pageSize))
    return api.get(`/invoices/page?${qs.toString()}`)
  },

  // Status-tab counts under the same q/from/to. Returns { all, progress, paid, overdue, cancelled }.
  listCounts: ({ q, from, to } = {}) => {
    const qs = new URLSearchParams()
    if (q)    qs.set('q', q)
    if (from) qs.set('from', from)
    if (to)   qs.set('to', to)
    const s = qs.toString()
    return api.get(`/invoices/counts${s ? `?${s}` : ''}`)
  },

  get: (id) => api.get(`/invoices/${id}`),

  create: ({ roomId, billPeriodStart, billPeriodEnd, periodStart, periodEnd, dueDateOffsetDays, dueOption }) =>
    api.post('/invoices', {
      roomId,
      billPeriodStart: billPeriodStart || periodStart,
      billPeriodEnd:   billPeriodEnd   || periodEnd,
      dueDateOffsetDays: dueDateOffsetDays ?? dueOption ?? 14,
    }),

  pay: (id, method) => api.post(`/invoices/${id}/pay`, { method }),

  cancel: (id, reason) => api.post(`/invoices/${id}/cancel`, { reason: reason || undefined }),

  shareToTelegram: (id) => api.post(`/invoices/${id}/share-telegram`, {}),
}
