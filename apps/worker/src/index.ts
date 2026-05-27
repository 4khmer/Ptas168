import { Queue, Worker, type Job } from 'bullmq'
import { env } from './config/env'
import { logger } from './config/logger'
import { redisConnection } from './config/redis'
import { disconnectPrisma } from './config/prisma'
import {
  OVERDUE_CHECK_QUEUE, INVOICE_PAID_QUEUE,
  type OverdueCheckPayload, type InvoicePaidPayload,
} from './queues'
import { processOverdueCheck } from './jobs/daily-overdue-check'
import { processInvoicePaid } from './jobs/invoice-paid'

const connection = redisConnection()

// ── Queues (producer-side handles for cron scheduling) ─────────────────────
const overdueQueue = new Queue<OverdueCheckPayload>(OVERDUE_CHECK_QUEUE, { connection })

// Schedule the repeatable cron job. BullMQ dedupes on the (queue, jobName,
// repeat options) tuple so calling this on every boot is safe.
async function scheduleCronJobs(): Promise<void> {
  await overdueQueue.add(
    'scan',
    {},
    {
      repeat: { pattern: env.OVERDUE_CRON },
      jobId: 'overdue-check-cron', // stable id makes the repeatable idempotent
      removeOnComplete: true,
      removeOnFail: 50,
    },
  )
  logger.info({ cron: env.OVERDUE_CRON }, `Scheduled cron: ${OVERDUE_CHECK_QUEUE}`)
}

// ── Workers (consumer-side processors) ─────────────────────────────────────
function makeWorker<T>(name: string, processor: (job: Job<T>) => Promise<unknown>) {
  const w = new Worker<T>(name, processor, { connection, concurrency: 1 })
  w.on('completed', job => logger.debug({ queue: name, jobId: job.id }, 'job completed'))
  w.on('failed', (job, err) => logger.error({ queue: name, jobId: job?.id, err }, 'job failed'))
  return w
}

const workers = [
  makeWorker(OVERDUE_CHECK_QUEUE, processOverdueCheck),
  makeWorker<InvoicePaidPayload>(INVOICE_PAID_QUEUE, processInvoicePaid),
]

// ── Lifecycle ──────────────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down worker…')
  await Promise.allSettled(workers.map(w => w.close()))
  await overdueQueue.close()
  await disconnectPrisma()
  process.exit(0)
}
process.on('SIGINT',  () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

async function main(): Promise<void> {
  await scheduleCronJobs()
  logger.info(
    { queues: [OVERDUE_CHECK_QUEUE, INVOICE_PAID_QUEUE], env: env.NODE_ENV },
    '🛠  ptas168-worker started',
  )
}

main().catch(err => {
  logger.fatal({ err }, 'Worker failed to start')
  process.exit(1)
})
