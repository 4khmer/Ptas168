// Backend → BullMQ producer. Enqueues jobs that the @ptas/worker app
// processes. Falls back to a no-op if REDIS_URL is missing (so the API
// still works in environments without a Redis stack, e.g. unit tests).
//
// Queue names must stay in sync with apps/worker/src/queues.ts.

import { Queue } from 'bullmq'
import { env } from '../config/env'
import { logger } from '../config/logger'

const INVOICE_PAID_QUEUE = 'invoice-paid'

export interface InvoicePaidPayload {
  invoiceId: string
  invoiceNumber: string
  tenantName: string
  totalAmount: number
  paymentMethod: string | null
}

function redisConnection() {
  if (!env.REDIS_URL) return null
  const url = new URL(env.REDIS_URL)
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    username: url.username || undefined,
    // Workers need `null` for blocking commands; producers don't, but the
    // option doesn't hurt.
    maxRetriesPerRequest: null as null,
  }
}

const connection = redisConnection()

// One Queue handle per producer-side queue. Lazy-init to avoid opening a
// Redis connection before it's needed (and to allow REDIS_URL-less runs).
let invoicePaidQueue: Queue<InvoicePaidPayload> | null = null
function getInvoicePaidQueue(): Queue<InvoicePaidPayload> | null {
  if (!connection) return null
  if (!invoicePaidQueue) {
    invoicePaidQueue = new Queue<InvoicePaidPayload>(INVOICE_PAID_QUEUE, { connection })
  }
  return invoicePaidQueue
}

export async function enqueueInvoicePaid(payload: InvoicePaidPayload): Promise<void> {
  const q = getInvoicePaidQueue()
  if (!q) {
    logger.debug({ queue: INVOICE_PAID_QUEUE }, 'REDIS_URL not set — skipping enqueue')
    return
  }
  try {
    await q.add('paid', payload, {
      removeOnComplete: 100,
      removeOnFail: 50,
    })
    logger.debug({ queue: INVOICE_PAID_QUEUE, invoiceId: payload.invoiceId }, 'job enqueued')
  } catch (err) {
    // Enqueue failures must not break the API request — log and move on.
    logger.error({ err, queue: INVOICE_PAID_QUEUE }, 'enqueue failed')
  }
}

export async function closeQueues(): Promise<void> {
  if (invoicePaidQueue) await invoicePaidQueue.close()
}
