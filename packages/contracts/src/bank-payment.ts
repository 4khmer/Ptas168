import { z } from 'zod'

// Read DTO ──────────────────────────────────────────────────────────────────
// Bank-payment rows are ingested by the Telegram bot — there are no
// frontend-facing write endpoints. List is read-only via /api/bank-payments.

export const BankPaymentDtoSchema = z.object({
  id: z.string(),
  bank: z.string(),                       // 'ABA', 'ACLEDA', …
  amount: z.number(),
  currency: z.string(),                   // 'USD' | 'KHR'
  senderName: z.string().nullable(),
  senderAccount: z.string().nullable(),   // last-4 digits / masked
  transactionId: z.string(),              // bank dedupe key
  apv: z.string().nullable(),             // ABA approval code
  paidAt: z.string(),                     // ISO datetime
  receivedAt: z.string(),                 // ISO datetime
  rawText: z.string(),                    // original Telegram message
})
export type BankPaymentDto = z.infer<typeof BankPaymentDtoSchema>
