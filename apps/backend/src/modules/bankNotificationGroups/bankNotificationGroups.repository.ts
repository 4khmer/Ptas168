import type { BankNotificationGroup } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

export const bankNotificationGroupsRepository = {
  list: (): Promise<BankNotificationGroup[]> =>
    prisma.bankNotificationGroup.findMany({ orderBy: { linkedAt: 'desc' } }),

  findByChatId: (chatId: string): Promise<BankNotificationGroup | null> =>
    prisma.bankNotificationGroup.findUnique({ where: { chatId } }),

  upsertByChatId: (chatId: string, chatTitle: string | null): Promise<BankNotificationGroup> =>
    prisma.bankNotificationGroup.upsert({
      where: { chatId },
      update: { chatTitle, linkedAt: new Date() },
      create: { chatId, chatTitle },
    }),

  deleteById: async (id: string): Promise<BankNotificationGroup | null> => {
    const row = await prisma.bankNotificationGroup.findUnique({ where: { id } })
    if (!row) return null
    return prisma.bankNotificationGroup.delete({ where: { id } })
  },
}
