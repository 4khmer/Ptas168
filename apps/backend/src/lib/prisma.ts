import { PrismaClient } from '@prisma/client'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development'
      ? [{ level: 'query', emit: 'event' }, 'info', 'warn', 'error']
      : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  global.__prisma = prisma
}

export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect()
    logger.info('Prisma client disconnected')
  } catch (err) {
    logger.error({ err }, 'Failed to disconnect Prisma')
  }
}
