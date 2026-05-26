import { buildApp } from './app'
import { env } from './config/env'
import { logger } from './config/logger'
import { disconnectPrisma } from './lib/prisma'

const app = buildApp()

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      pid: process.pid,
    },
    `🚀 ptas168-api listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
  )
})

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received')
  server.close(() => {
    logger.info('HTTP server closed')
  })
  await disconnectPrisma()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

process.on('uncaughtException', err => {
  logger.fatal({ err }, 'Uncaught exception')
  process.exit(1)
})
process.on('unhandledRejection', reason => {
  logger.fatal({ reason }, 'Unhandled promise rejection')
  process.exit(1)
})
