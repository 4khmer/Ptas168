import type { BankPayment } from '@prisma/client'
import { toBankPaymentDto, type BankPaymentDto } from '../../utils/adapters.js'
import { bankPaymentsRepository } from './bankPayments.repository.js'
import { parseBankPayment } from '@ptas/bank-parsers'

export const bankPaymentsService = {
  async list(): Promise<BankPaymentDto[]> {
    const rows = await bankPaymentsRepository.list()
    return rows.map(toBankPaymentDto)
  },

  /**
   * Parse a Telegram message text and persist it as a bank payment.
   * `roomId` is set when the message arrived in a chat that was linked
   * to a specific room. For property-wide bank-notification groups,
   * pass null — the row will appear in the Payments tab unattributed.
   * Returns:
   *   - { ok: true, payment }       — newly stored
   *   - { ok: 'duplicate', existing} — same transactionId already on file
   *   - { ok: false }               — text didn't match any bank parser
   */
  async ingestFromText(args: {
    text: string
    roomId: string | null
    chatId?: string | null
    messageId?: number | null
  }): Promise<
    | { ok: true; payment: BankPayment }
    | { ok: 'duplicate'; existing: BankPayment }
    | { ok: false }
  > {
    const parsed = parseBankPayment(args.text)
    if (!parsed) return { ok: false }

    const existing = await bankPaymentsRepository.findByTransactionId(parsed.transactionId)
    if (existing) return { ok: 'duplicate', existing }

    const payment = await bankPaymentsRepository.create({
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
      chatId: args.chatId ?? null,
      messageId: args.messageId ?? null,
    })

    return { ok: true, payment }
  },
}
