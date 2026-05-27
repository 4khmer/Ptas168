import { env } from './env'
import { logger } from './logger'

// BullMQ takes a connection-options object (host/port/...) rather than an
// IORedis instance. This parses our REDIS_URL into that shape so Queue,
// Worker, and QueueScheduler can each open their own connection (BullMQ
// requires separate connections for blocking vs non-blocking ops).
//
// `maxRetriesPerRequest: null` is required by BullMQ workers to allow
// blocking commands to wait indefinitely for jobs.
export function redisConnection() {
  const url = new URL(env.REDIS_URL)
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: true,
  }
}

logger.debug({ url: env.REDIS_URL }, 'Redis connection configured')
