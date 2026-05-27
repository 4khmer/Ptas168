import { redis } from '../config/redis'
import { logger } from '../config/logger'

// Keys MUST match what the backend writes:
//   apps/backend/src/modules/telegramLinks/telegramLinks.service.ts
//   apps/backend/src/modules/bankNotificationGroups/bankNotificationGroups.service.ts
const LINK_KEY  = (code: string) => `tg:link-code:${code}`
const NOTIFY_KEY = (code: string) => `tg:notify-code:${code}`

// Atomically read-and-delete the key. GETDEL was introduced in Redis 6.2;
// our `redis:7` image supports it.
async function getdel(key: string): Promise<string | null> {
  try {
    // ioredis types may not expose getdel directly — fall back to a Lua
    // script if needed. The cast is intentional.
    return await (redis as unknown as { getdel: (k: string) => Promise<string | null> }).getdel(key)
  } catch (err) {
    logger.warn({ err, key }, 'GETDEL failed, falling back to GET+DEL')
    const value = await redis.get(key)
    if (value !== null) await redis.del(key)
    return value
  }
}

/**
 * Consume a `/link <code>` for a room-scoped link. Returns the roomId
 * the code was minted against, or null if the code is unknown/expired.
 */
export async function consumeLinkCode(code: string): Promise<string | null> {
  const value = await getdel(LINK_KEY(code))
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as { roomId?: string }
    return parsed.roomId ?? null
  } catch {
    return null
  }
}

/**
 * Consume a `/link <code>` for a property-wide notification group.
 * Returns true if the code was valid; the chat is now allowed to be
 * upserted as a notification group.
 */
export async function consumeNotificationCode(code: string): Promise<boolean> {
  const value = await getdel(NOTIFY_KEY(code))
  return value !== null
}
