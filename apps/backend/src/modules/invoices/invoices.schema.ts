import { z } from 'zod'

export const createInvoiceSchema = z
  .object({
    roomId: z.string().uuid(),
    billPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    billPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dueDateOffsetDays: z.number().int().min(0).max(120).default(14),
  })
  .strict()

export const listInvoicesQuery = z
  .object({
    roomId: z.string().uuid().optional(),
    tenantId: z.string().uuid().optional(),
    status: z.enum(['progress', 'paid', 'cancelled', 'overdue']).optional(),
  })
  .strict()

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const listInvoicesPageQuery = z
  .object({
    q: z.string().trim().min(1).optional(),
    status: z.enum(['progress', 'paid', 'cancelled', 'overdue']).optional(),
    from: dateString.optional(),
    to: dateString.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

export const invoiceCountsQuery = z
  .object({
    q: z.string().trim().min(1).optional(),
    from: dateString.optional(),
    to: dateString.optional(),
  })
  .strict()

export type ListInvoicesPageInput = z.infer<typeof listInvoicesPageQuery>
export type InvoiceCountsInput = z.infer<typeof invoiceCountsQuery>

export const payInvoiceSchema = z
  .object({
    method: z.enum(['Cash', 'QR Transfer']),
  })
  .strict()

export const cancelInvoiceSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict()

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
