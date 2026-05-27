// Shared ioredis client for non-BullMQ uses (currently: TTL'd link-code
// store shared with the apps/telegram-bot process). BullMQ creates its
// own connections internally — see lib/queue.ts.

import { Redis } from 'ioredis'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'

let client: Redis | null = null

export function redis(): Redis | null {
  if (!env.REDIS_URL) return null
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      // Producers can retry; consumers (BullMQ workers) need `null`.
      maxRetriesPerRequest: 2,
      lazyConnect: false,
    })
    client.on('error', err => logger.warn({ err }, 'Redis error'))
  }
  return client
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined)
    client = null
  }
}
