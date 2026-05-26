import { z } from 'zod'
import { InvoiceStatusResponseSchema, LineItemTypeSchema } from './enums.js'

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// Wire-format payment method ────────────────────────────────────────────────
// Prisma stores `Cash | QRTransfer` (no space). The wire emits `Cash` or
// `QR Transfer` (with space) — the adapter rewrites the spaced form back
// to the DB form on write. Contracts mirror what's on the wire.
export const InvoicePaymentMethodWireSchema = z.enum(['Cash', 'QR Transfer'])
export type InvoicePaymentMethodWire = z.infer<typeof InvoicePaymentMethodWireSchema>

// Write inputs ──────────────────────────────────────────────────────────────

export const createInvoiceSchema = z
  .object({
    roomId: z.string().uuid(),
    billPeriodStart: dateString,
    billPeriodEnd: dateString,
    dueDateOffsetDays: z.number().int().min(0).max(120).default(14),
  })
  .strict()
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>

export const payInvoiceSchema = z
  .object({
    method: InvoicePaymentMethodWireSchema,
  })
  .strict()
export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>

export const cancelInvoiceSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict()
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>

// Queries ───────────────────────────────────────────────────────────────────

export const listInvoicesQuery = z
  .object({
    roomId: z.string().uuid().optional(),
    tenantId: z.string().uuid().optional(),
    status: InvoiceStatusResponseSchema.optional(),
  })
  .strict()

export const listInvoicesPageQuery = z
  .object({
    q: z.string().trim().min(1).optional(),
    status: InvoiceStatusResponseSchema.optional(),
    from: dateString.optional(),
    to: dateString.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
export type ListInvoicesPageInput = z.infer<typeof listInvoicesPageQuery>

export const invoiceCountsQuery = z
  .object({
    q: z.string().trim().min(1).optional(),
    from: dateString.optional(),
    to: dateString.optional(),
  })
  .strict()
export type InvoiceCountsInput = z.infer<typeof invoiceCountsQuery>

// Counts response ───────────────────────────────────────────────────────────

export const InvoiceCountsDtoSchema = z.object({
  all: z.number().int().nonnegative(),
  progress: z.number().int().nonnegative(),
  paid: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
})
export type InvoiceCountsDto = z.infer<typeof InvoiceCountsDtoSchema>

// Line items ────────────────────────────────────────────────────────────────

export const InvoiceLineItemDtoSchema = z.object({
  id: z.string(),
  lineItemType: LineItemTypeSchema,
  description: z.string(),
  previousReading: z.number().nullable(),
  currentReading: z.number().nullable(),
  unitPrice: z.number().nullable(),
  amount: z.number(),
})
export type InvoiceLineItemDto = z.infer<typeof InvoiceLineItemDtoSchema>

// Read DTO — wire format (flat) ─────────────────────────────────────────────
// The frontend reshapes this into a nested UI form via adaptInvoice (which
// lives in apps/frontend/src/api/invoices.js and moves to packages/sdk in
// Phase 5). Contracts only knows about the flat wire shape.
//
// Snapshots: tenantName, tenantPhone, roomName, buildingName, floorName are
// frozen at invoice creation — they survive later renames or deletes.
//
// Status: `progress | paid | cancelled | overdue`. `overdue` is DERIVED at
// read time (status=progress + dueDate < now). The persisted column is the
// 3-value InvoiceStatus enum in enums.ts.

export const InvoiceDtoSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),                // INV-YYYYMM-NNNNNN
  roomId: z.string(),
  tenantId: z.string().nullable(),
  tenantName: z.string(),                   // snapshot
  tenantPhone: z.string().nullable(),       // snapshot
  roomName: z.string(),                     // snapshot
  buildingName: z.string(),                 // snapshot
  floorName: z.string(),                    // snapshot
  billPeriodStart: z.string(),              // ISO date
  billPeriodEnd: z.string(),                // ISO date
  dueDate: z.string(),                      // ISO date
  billDays: z.number().int(),
  daysInMonth: z.number().int(),
  status: InvoiceStatusResponseSchema,
  baseRent: z.number(),
  securityDeposit: z.number(),
  subtotal: z.number(),
  totalAmount: z.number(),
  exchangeRate: z.number(),
  khrAmount: z.number().nullable(),
  paymentMethod: InvoicePaymentMethodWireSchema.nullable(),
  paidAt: z.string().nullable(),            // ISO datetime
  cancelReason: z.string().nullable(),
  cancelledAt: z.string().nullable(),       // ISO datetime
  createdAt: z.string(),
  updatedAt: z.string(),
  lineItems: z.array(InvoiceLineItemDtoSchema),
})
export type InvoiceDto = z.infer<typeof InvoiceDtoSchema>

// Share-to-Telegram response
export const ShareInvoiceResponseSchema = z.object({
  success: z.boolean(),
  text: z.string(),
})
export type ShareInvoiceResponse = z.infer<typeof ShareInvoiceResponseSchema>
