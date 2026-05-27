import { Redis } from 'ioredis'
import { env } from './env'
import { logger } from './logger'

// Shared ioredis client for the non-BullMQ uses — currently just the
// link-code consumption (GETDEL on tg:link-code:<code> and
// tg:notify-code:<code>). BullMQ's Worker opens its own connections.
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  lazyConnect: false,
})

redis.on('error', err => logger.warn({ err }, 'Redis error'))

// BullMQ connection options shape (matches apps/worker).
export function bullmqConnection() {
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
