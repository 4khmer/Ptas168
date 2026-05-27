import { PrismaClient } from '@prisma/client'
import { env } from './env.js'
import { logger } from './logger.js'

// The worker connects to the same Postgres the backend uses. The Prisma
// client is shared via the workspace's hoisted @prisma/client; both apps
// get the same generated types from apps/backend/prisma/schema.prisma.

declare global {
  // eslint-disable-next-line no-var
  var __workerPrisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  global.__workerPrisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  global.__workerPrisma = prisma
}

export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect()
    logger.info('Prisma client disconnected')
  } catch (err) {
    logger.error({ err }, 'Failed to disconnect Prisma')
  }
}
