import type { TelegramLink, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

const linkWithRoomInclude = {
  room: {
    include: { building: true, floor: true },
  },
} satisfies Prisma.TelegramLinkInclude

export type TelegramLinkWithRoom = Prisma.TelegramLinkGetPayload<{ include: typeof linkWithRoomInclude }>

export const telegramLinksRepository = {
  listAll: (): Promise<TelegramLinkWithRoom[]> =>
    prisma.telegramLink.findMany({
      include: linkWithRoomInclude,
      orderBy: { linkedAt: 'desc' },
    }),

  findByChatId: (chatId: string): Promise<TelegramLink | null> =>
    prisma.telegramLink.findUnique({ where: { chatId } }),

  findByRoomId: (roomId: string): Promise<TelegramLinkWithRoom | null> =>
    prisma.telegramLink.findUnique({
      where: { roomId },
      include: linkWithRoomInclude,
    }),

  upsertByRoomId: (
    roomId: string,
    chatId: string,
    chatTitle: string | null,
  ): Promise<TelegramLink> =>
    prisma.telegramLink.upsert({
      where: { roomId },
      update: { chatId, chatTitle, linkedAt: new Date() },
      create: { roomId, chatId, chatTitle },
    }),

  deleteById: async (id: string): Promise<TelegramLink | null> => {
    const link = await prisma.telegramLink.findUnique({ where: { id } })
    if (!link) return null
    return prisma.telegramLink.delete({ where: { id } })
  },
}
