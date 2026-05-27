import crypto from 'node:crypto'
import { bankNotificationGroupsRepository } from './bankNotificationGroups.repository'
import { NotFoundError } from '../../utils/errors'
import { redis } from '../../lib/redis'
import { logger } from '../../config/logger'

const CODE_TTL_SECONDS = 10 * 60
const CODE_LENGTH = 6
const CODE_KEY_PREFIX = 'tg:notify-code:'

// Like the room-link codes, lives in Redis so the bot can consume.
// Kept in a SEPARATE key namespace so a code minted for one pool can't
// be accidentally accepted by the other (room vs property-wide).

function generateNumericCode(length: number): string {
  let code = ''
  while (code.length < length) {
    const buf = crypto.randomBytes(length)
    for (const b of buf) {
      code += (b % 10).toString()
      if (code.length === length) break
    }
  }
  return code
}

export interface BankNotificationGroupDto {
  id: string
  chatId: string
  chatTitle: string | null
  linkedAt: string
}

export const bankNotificationGroupsService = {
  /**
   * Mint a single-use 6-digit code. The customer must send `/link <code>`
   * inside the Telegram group (already populated with the bank's bot and
   * our bot) within the TTL window to bind the chat as a property-wide
   * payment-notification source.
   */
  async mintCode(): Promise<{ code: string; expiresAt: string; ttlSeconds: number }> {
    const r = redis()
    if (!r) {
      logger.warn('REDIS_URL not set — Telegram notification-group codes cannot be consumed by the bot')
      const code = generateNumericCode(CODE_LENGTH)
      return {
        code,
        expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
        ttlSeconds: CODE_TTL_SECONDS,
      }
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateNumericCode(CODE_LENGTH)
      const ok = await r.set(`${CODE_KEY_PREFIX}${code}`, '1', 'EX', CODE_TTL_SECONDS, 'NX')
      if (ok === 'OK') {
        return {
          code,
          expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
          ttlSeconds: CODE_TTL_SECONDS,
        }
      }
    }
    throw new Error('Failed to mint a unique notification-group code after 5 attempts')
  },

  async list(): Promise<BankNotificationGroupDto[]> {
    const rows = await bankNotificationGroupsRepository.list()
    return rows.map(r => ({
      id: r.id,
      chatId: r.chatId,
      chatTitle: r.chatTitle,
      linkedAt: r.linkedAt.toISOString(),
    }))
  },

  async isNotificationChat(chatId: string): Promise<boolean> {
    const row = await bankNotificationGroupsRepository.findByChatId(chatId)
    return !!row
  },

  async unlink(id: string): Promise<void> {
    const deleted = await bankNotificationGroupsRepository.deleteById(id)
    if (!deleted) throw new NotFoundError('Notification group not found')
  },
}
