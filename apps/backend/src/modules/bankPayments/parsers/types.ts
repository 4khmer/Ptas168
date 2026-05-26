export interface ParsedBankPayment {
  bank: string
  amount: string                  // keep as string — Decimal accepts string and avoids float drift
  currency: string                // ISO-ish: 'USD' | 'KHR' | etc
  senderName: string | null
  senderAccount: string | null    // bank-side reference / masked account
  transactionId: string
  apv: string | null
  paidAt: Date
}

export type BankParser = (text: string) => ParsedBankPayment | null
