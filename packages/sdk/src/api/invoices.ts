import type { HttpClient } from '../http/client.js'
import type {
  InvoiceDto, InvoiceStatusResponse, InvoiceCountsDto, InvoicePaymentMethodWire,
} from '@ptas/contracts'

export interface ListInvoicesArgs {
  roomId?: string
  tenantId?: string
  status?: InvoiceStatusResponse
}

export interface ListInvoicesPageArgs {
  q?: string
  status?: InvoiceStatusResponse
  from?: string                            // YYYY-MM-DD
  to?: string                              // YYYY-MM-DD
  page?: number
  pageSize?: number
}

export interface ListInvoicesCountsArgs {
  q?: string
  from?: string
  to?: string
}

export interface CreateInvoiceArgs {
  roomId: string
  // Stores call sites use one or the other — coalesce.
  billPeriodStart?: string
  billPeriodEnd?: string
  periodStart?: string
  periodEnd?: string
  // Either explicit offset or a `dueOption` (legacy) — coalesce.
  dueDateOffsetDays?: number
  dueOption?: number
}

export interface InvoicesPage {
  items: InvoiceDto[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface InvoicesApi {
  list(args?: ListInvoicesArgs): Promise<InvoiceDto[]>
  listPage(args?: ListInvoicesPageArgs): Promise<InvoicesPage>
  listCounts(args?: ListInvoicesCountsArgs): Promise<InvoiceCountsDto>
  get(id: string): Promise<InvoiceDto>
  create(args: CreateInvoiceArgs): Promise<InvoiceDto>
  pay(id: string, method: InvoicePaymentMethodWire): Promise<InvoiceDto>
  cancel(id: string, reason?: string): Promise<InvoiceDto>
  shareToTelegram(id: string): Promise<{ success: boolean; text: string }>
}

export function createInvoicesApi(http: HttpClient): InvoicesApi {
  return {
    list: ({ roomId, tenantId, status } = {}) => {
      const qs = new URLSearchParams()
      if (roomId)   qs.set('roomId',   roomId)
      if (tenantId) qs.set('tenantId', tenantId)
      if (status)   qs.set('status',   status)
      const q = qs.toString()
      return http.get(`/invoices${q ? `?${q}` : ''}`)
    },

    listPage: ({ q, status, from, to, page = 1, pageSize = 20 } = {}) => {
      const qs = new URLSearchParams()
      if (q)      qs.set('q', q)
      if (status) qs.set('status', status)
      if (from)   qs.set('from', from)
      if (to)     qs.set('to', to)
      qs.set('page', String(page))
      qs.set('pageSize', String(pageSize))
      return http.get(`/invoices/page?${qs.toString()}`)
    },

    listCounts: ({ q, from, to } = {}) => {
      const qs = new URLSearchParams()
      if (q)    qs.set('q', q)
      if (from) qs.set('from', from)
      if (to)   qs.set('to', to)
      const s = qs.toString()
      return http.get(`/invoices/counts${s ? `?${s}` : ''}`)
    },

    get: (id) => http.get(`/invoices/${id}`),

    create: ({ roomId, billPeriodStart, billPeriodEnd, periodStart, periodEnd, dueDateOffsetDays, dueOption }) =>
      http.post('/invoices', {
        roomId,
        billPeriodStart: billPeriodStart || periodStart,
        billPeriodEnd:   billPeriodEnd   || periodEnd,
        dueDateOffsetDays: dueDateOffsetDays ?? dueOption ?? 14,
      }),

    pay:    (id, method) => http.post(`/invoices/${id}/pay`,    { method }),
    cancel: (id, reason) => http.post(`/invoices/${id}/cancel`, { reason: reason || undefined }),

    shareToTelegram: (id) => http.post(`/invoices/${id}/share-telegram`, {}),
  }
}
