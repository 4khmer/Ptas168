import type { Prisma, User } from '@prisma/client'
import { prisma } from '../../lib/prisma'

export const usersRepository = {
  // Sub-users only — owner is filtered out
  listSubUsers: (): Promise<User[]> =>
    prisma.user.findMany({
      where: { role: { not: 'owner' }, via: 'credentials' },
      orderBy: { createdAt: 'asc' },
    }),

  findById: (id: string): Promise<User | null> =>
    prisma.user.findUnique({ where: { id } }),

  create: (data: Prisma.UserUncheckedCreateInput): Promise<User> =>
    prisma.user.create({ data }),

  update: (id: string, data: Prisma.UserUncheckedUpdateInput): Promise<User> =>
    prisma.user.update({ where: { id }, data }),

  delete: (id: string): Promise<User> => prisma.user.delete({ where: { id } }),
}
