import { PrismaClient } from '@prisma/client'
import { env } from './env'
import { logger } from './logger'

declare global {
  // eslint-disable-next-line no-var
  var __botPrisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  global.__botPrisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  global.__botPrisma = prisma
}

export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect()
    logger.info('Prisma client disconnected')
  } catch (err) {
    logger.error({ err }, 'Failed to disconnect Prisma')
  }
}
