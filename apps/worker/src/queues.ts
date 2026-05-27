// One file per queue would scale better; for the initial 2-job set we
// co-locate the names + payload shapes so callers (backend producer and
// worker processors) share the same const string and Zod schema.
//
// Adding a queue:
//   1. Add a `<NAME>_QUEUE` const + payload schema below.
//   2. Create a processor in `src/jobs/<name>.ts`.
//   3. Register the Worker in `src/index.ts`.
//   4. From the backend, `import { <NAME>_QUEUE } from '@ptas/worker'` is
//      NOT how it works (we don't depend on the worker from the backend);
//      instead the backend redeclares the const in `lib/queue.ts`. Keep the
//      two in sync.

import { z } from 'zod'

// ── Daily overdue check (cron) ─────────────────────────────────────────────
// Fires on OVERDUE_CRON. No payload — the job scans the DB itself.
export const OVERDUE_CHECK_QUEUE = 'overdue-check' as const
export const overdueCheckPayloadSchema = z.object({}).strict()
export type OverdueCheckPayload = z.infer<typeof overdueCheckPayloadSchema>

// ── Invoice paid (event-driven) ────────────────────────────────────────────
// Fires from the backend after an invoice is marked paid. Creates a
// PAYMENT_RECEIVED notification for owners.
export const INVOICE_PAID_QUEUE = 'invoice-paid' as const
export const invoicePaidPayloadSchema = z.object({
  invoiceId: z.string(),
  invoiceNumber: z.string(),
  tenantName: z.string(),
  totalAmount: z.number(),
  paymentMethod: z.string().nullable(),
}).strict()
export type InvoicePaidPayload = z.infer<typeof invoicePaidPayloadSchema>
