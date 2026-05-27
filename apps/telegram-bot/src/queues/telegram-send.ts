import { Worker, type Job } from 'bullmq'
import type { Bot } from 'grammy'
import { z } from 'zod'
import { bullmqConnection } from '../config/redis.js'
import { logger } from '../config/logger.js'

// Keep in sync with apps/backend/src/lib/queue.ts.
export const TELEGRAM_SEND_QUEUE = 'telegram-send' as const

export const telegramSendPayloadSchema = z.object({
  chatId: z.string().min(1),
  text: z.string().min(1),
}).strict()

export type TelegramSendPayload = z.infer<typeof telegramSendPayloadSchema>

/**
 * Build the BullMQ Worker that consumes `telegram-send` jobs and calls
 * the grammy bot's sendMessage. When the bot is null (no TELEGRAM_BOT_TOKEN
 * configured), jobs complete with a logged no-op so the queue doesn't back
 * up in dev environments without a real bot.
 */
export function makeTelegramSendWorker(bot: Bot | null): Worker<TelegramSendPayload> {
  return new Worker<TelegramSendPayload>(
    TELEGRAM_SEND_QUEUE,
    async (job: Job<TelegramSendPayload>) => {
      const payload = telegramSendPayloadSchema.parse(job.data)
      if (!bot) {
        logger.warn({ chatId: payload.chatId }, 'Bot unavailable — would have sent message')
        return { sent: false, reason: 'no-bot' }
      }
      await bot.api.sendMessage(payload.chatId, payload.text)
      logger.info({ chatId: payload.chatId, len: payload.text.length }, 'Telegram message sent')
      return { sent: true }
    },
    { connection: bullmqConnection(), concurrency: 4 },
  )
}
