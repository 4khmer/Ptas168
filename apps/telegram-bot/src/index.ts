import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { disconnectPrisma } from './config/prisma.js'
import { buildBot } from './bot.js'
import { makeTelegramSendWorker } from './queues/telegram-send.js'

const bot = buildBot()
const sendWorker = makeTelegramSendWorker(bot)

sendWorker.on('completed', job => logger.debug({ jobId: job.id }, 'telegram-send completed'))
sendWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'telegram-send failed'))

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down telegram-bot…')
  try {
    if (bot) await bot.stop()
    await sendWorker.close()
    await disconnectPrisma()
  } finally {
    process.exit(0)
  }
}
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

async function main(): Promise<void> {
  if (bot) {
    // grammy long-polling. No public URL needed — getUpdates is pulled
    // from Telegram. void on purpose; bot.start() resolves only on stop.
    void bot.start({
      onStart: info => logger.info({ username: info.username }, '🤖 Telegram bot polling started'),
    })
  }
  logger.info({ env: env.NODE_ENV, polling: !!bot }, '🤖 ptas168-telegram-bot started')
}

main().catch(err => {
  logger.fatal({ err }, 'Telegram bot failed to start')
  process.exit(1)
})
