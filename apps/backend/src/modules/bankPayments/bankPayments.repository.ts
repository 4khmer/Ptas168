import type { BankPayment, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

export const bankPaymentsRepository = {
  list: (limit = 200): Promise<BankPayment[]> =>
    prisma.bankPayment.findMany({
      orderBy: { paidAt: 'desc' },
      take: limit,
    }),

  findByTransactionId: (transactionId: string): Promise<BankPayment | null> =>
    prisma.bankPayment.findUnique({ where: { transactionId } }),

  create: (data: Prisma.BankPaymentUncheckedCreateInput): Promise<BankPayment> =>
    prisma.bankPayment.create({ data }),
}
