import { parseBankPayment } from '@ptas/bank-parsers'
import type { BankPayment } from '@prisma/client'
import { prisma } from '../config/prisma.js'

// Local Prisma-backed version of backend's bankPaymentsService.ingestFromText.
// The bot owns this writes-side path entirely — the backend's HTTP service
// only reads (GET /api/bank-payments).
//
// Returns:
//   { ok: true, payment }          — newly stored
//   { ok: 'duplicate', existing }  — transactionId already on file
//   { ok: false }                  — no parser matched

export type IngestResult =
  | { ok: true; payment: BankPayment }
  | { ok: 'duplicate'; existing: BankPayment }
  | { ok: false }

export async function ingestBankPaymentFromText(args: {
  text: string
  roomId: string | null
  chatId: string | null
  messageId: number | null
}): Promise<IngestResult> {
  const parsed = parseBankPayment(args.text)
  if (!parsed) return { ok: false }

  const existing = await prisma.bankPayment.findUnique({
    where: { transactionId: parsed.transactionId },
  })
  if (existing) return { ok: 'duplicate', existing }

  const payment = await prisma.bankPayment.create({
    data: {
      roomId: args.roomId,
      bank: parsed.bank,
      amount: parsed.amount,
      currency: parsed.currency,
      senderName: parsed.senderName,
      senderAccount: parsed.senderAccount,
      transactionId: parsed.transactionId,
      apv: parsed.apv,
      paidAt: parsed.paidAt,
      rawText: args.text,
      chatId: args.chatId,
      messageId: args.messageId,
    },
  })

  return { ok: true, payment }
}
