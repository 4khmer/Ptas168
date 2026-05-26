import type { User } from '@prisma/client'
import { prisma } from '../../lib/prisma'

export const authRepository = {
  count: (): Promise<number> => prisma.user.count(),

  createOwner: (data: {
    username: string
    fullName: string
    phone: string | null
    passwordHash: string
  }): Promise<User> =>
    prisma.user.create({
      data: {
        username: data.username,
        fullName: data.fullName,
        phone: data.phone,
        passwordHash: data.passwordHash,
        role: 'owner',
        status: 'active',
        via: 'credentials',
        lastLoginAt: new Date(),
      },
    }),

  findByUsername: (username: string): Promise<User | null> =>
    prisma.user.findUnique({ where: { username } }),

  findByTelegramId: (telegramId: bigint): Promise<User | null> =>
    prisma.user.findUnique({ where: { telegramId } }),

  findById: (id: string): Promise<User | null> =>
    prisma.user.findUnique({ where: { id } }),

  upsertTelegram: (data: {
    telegramId: bigint
    username: string
    firstName: string
    lastName: string | null
    languageCode: string | null
    photoUrl: string | null
    isPremium: boolean
  }): Promise<User> =>
    prisma.user.upsert({
      where: { telegramId: data.telegramId },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        languageCode: data.languageCode,
        profileImage: data.photoUrl,
        isPremium: data.isPremium,
        lastLoginAt: new Date(),
      },
      create: {
        username: data.username,
        fullName: [data.firstName, data.lastName].filter(Boolean).join(' '),
        telegramId: data.telegramId,
        telegramUsername: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        languageCode: data.languageCode,
        profileImage: data.photoUrl,
        isPremium: data.isPremium,
        via: 'telegram',
        role: 'manager',
        lastLoginAt: new Date(),
      },
    }),

  updateLastLogin: (id: string): Promise<User> =>
    prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } }),

  updateProfile: (
    id: string,
    data: { fullName?: string; username?: string; phone?: string | null; profileImage?: string | null },
  ): Promise<User> => prisma.user.update({ where: { id }, data }),

  updatePassword: (id: string, passwordHash: string): Promise<User> =>
    prisma.user.update({ where: { id }, data: { passwordHash } }),
}
