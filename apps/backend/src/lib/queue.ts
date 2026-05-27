// Backend → BullMQ producers. Enqueues jobs that the @ptas/worker and
// @ptas/telegram-bot processes consume. Falls back to no-op when
// REDIS_URL is missing (so the API still works in tests).

import { Queue } from 'bullmq'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'

// Keep these queue names in sync with the consumers:
//   apps/worker/src/queues.ts
//   apps/telegram-bot/src/queues.ts
const INVOICE_PAID_QUEUE = 'invoice-paid'
const TELEGRAM_SEND_QUEUE = 'telegram-send'

export interface InvoicePaidPayload {
  invoiceId: string
  invoiceNumber: string
  tenantName: string
  totalAmount: number
  paymentMethod: string | null
}

export interface TelegramSendPayload {
  chatId: string
  text: string
}

function redisConnection() {
  if (!env.REDIS_URL) return null
  const url = new URL(env.REDIS_URL)
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null as null,
  }
}

const connection = redisConnection()

let invoicePaidQueue: Queue<InvoicePaidPayload> | null = null
let telegramSendQueue: Queue<TelegramSendPayload> | null = null

function getInvoicePaidQueue(): Queue<InvoicePaidPayload> | null {
  if (!connection) return null
  if (!invoicePaidQueue) {
    invoicePaidQueue = new Queue<InvoicePaidPayload>(INVOICE_PAID_QUEUE, { connection })
  }
  return invoicePaidQueue
}

function getTelegramSendQueue(): Queue<TelegramSendPayload> | null {
  if (!connection) return null
  if (!telegramSendQueue) {
    telegramSendQueue = new Queue<TelegramSendPayload>(TELEGRAM_SEND_QUEUE, { connection })
  }
  return telegramSendQueue
}

export async function enqueueInvoicePaid(payload: InvoicePaidPayload): Promise<void> {
  const q = getInvoicePaidQueue()
  if (!q) {
    logger.debug({ queue: INVOICE_PAID_QUEUE }, 'REDIS_URL not set — skipping enqueue')
    return
  }
  try {
    await q.add('paid', payload, { removeOnComplete: 100, removeOnFail: 50 })
    logger.debug({ queue: INVOICE_PAID_QUEUE, invoiceId: payload.invoiceId }, 'job enqueued')
  } catch (err) {
    logger.error({ err, queue: INVOICE_PAID_QUEUE }, 'enqueue failed')
  }
}

/**
 * Send a Telegram message via the @ptas/telegram-bot process. Fire-and-forget;
 * the bot owns the grammy bot instance + the bank-bot token, so the backend
 * doesn't need either.
 */
export async function enqueueTelegramSend(payload: TelegramSendPayload): Promise<void> {
  const q = getTelegramSendQueue()
  if (!q) {
    logger.debug({ queue: TELEGRAM_SEND_QUEUE }, 'REDIS_URL not set — skipping enqueue')
    return
  }
  try {
    await q.add('send', payload, { removeOnComplete: 100, removeOnFail: 50, attempts: 3 })
    logger.debug({ queue: TELEGRAM_SEND_QUEUE, chatId: payload.chatId }, 'job enqueued')
  } catch (err) {
    logger.error({ err, queue: TELEGRAM_SEND_QUEUE }, 'enqueue failed')
  }
}

export async function closeQueues(): Promise<void> {
  if (invoicePaidQueue) await invoicePaidQueue.close()
  if (telegramSendQueue) await telegramSendQueue.close()
}
