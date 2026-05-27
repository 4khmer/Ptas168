import type { Notification } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

export const notificationsRepository = {
  list: (userId: string, opts: { take?: number; onlyUnread?: boolean }): Promise<Notification[]> =>
    prisma.notification.findMany({
      where: { userId, ...(opts.onlyUnread ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: opts.take ?? 50,
    }),

  markRead: (id: string, userId: string): Promise<unknown> =>
    prisma.notification.updateMany({ where: { id, userId }, data: { read: true } }),

  markAllRead: (userId: string): Promise<unknown> =>
    prisma.notification.updateMany({ where: { userId }, data: { read: true } }),

  clear: (userId: string): Promise<unknown> =>
    prisma.notification.deleteMany({ where: { userId } }),
}
