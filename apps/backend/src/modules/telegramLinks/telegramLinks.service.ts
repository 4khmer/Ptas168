import crypto from 'node:crypto'
import { telegramLinksRepository, type TelegramLinkWithRoom } from './telegramLinks.repository'
import { roomsRepository } from '../rooms/rooms.repository'
import { NotFoundError } from '../../utils/errors'
import { redis } from '../../lib/redis'
import { logger } from '../../config/logger'

const CODE_TTL_SECONDS = 10 * 60
const CODE_LENGTH = 6
const CODE_KEY_PREFIX = 'tg:link-code:'

// Codes live in Redis so the backend (mint) and apps/telegram-bot
// (consume) share the same pool. Backend never consumes — the bot does
// that atomically via GETDEL when it sees `/link <code>`.

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

export interface TelegramLinkDto {
  id: string
  chatId: string
  chatTitle: string | null
  linkedAt: string
  roomId: string
  roomName: string
  buildingName: string | null
  floorName: string | null
}

function toDto(link: TelegramLinkWithRoom): TelegramLinkDto {
  return {
    id: link.id,
    chatId: link.chatId,
    chatTitle: link.chatTitle,
    linkedAt: link.linkedAt.toISOString(),
    roomId: link.roomId,
    roomName: link.room.name,
    buildingName: link.room.building?.name ?? null,
    floorName: link.room.floor?.name ?? null,
  }
}

export const telegramLinksService = {
  /**
   * Mint a single-use 6-digit code tied to the given room. The customer
   * must send `/link <code>` inside the room's Telegram group (with the
   * bot present) within the TTL window for the bind to take effect.
   *
   * Stored in Redis as `tg:link-code:<code>` → JSON `{roomId}` with TTL.
   * The bot reads + deletes atomically.
   */
  async mintCode(roomId: string): Promise<{ code: string; expiresAt: string; ttlSeconds: number }> {
    const room = await roomsRepository.findById(roomId)
    if (!room) throw new NotFoundError('Room')
    const r = redis()
    if (!r) {
      // No Redis configured: fall back to a degraded mode. The code is
      // returned but the bot won't see it. Surface this so it's noticed.
      logger.warn('REDIS_URL not set — Telegram link codes cannot be consumed by the bot')
      const code = generateNumericCode(CODE_LENGTH)
      return {
        code,
        expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
        ttlSeconds: CODE_TTL_SECONDS,
      }
    }

    // Loop until we find a code that doesn't collide. Collisions are
    // astronomically unlikely with a 6-digit pool over a 10-minute TTL.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateNumericCode(CODE_LENGTH)
      const ok = await r.set(
        `${CODE_KEY_PREFIX}${code}`,
        JSON.stringify({ roomId }),
        'EX',
        CODE_TTL_SECONDS,
        'NX',
      )
      if (ok === 'OK') {
        return {
          code,
          expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
          ttlSeconds: CODE_TTL_SECONDS,
        }
      }
    }
    throw new Error('Failed to mint a unique link code after 5 attempts')
  },

  async list(): Promise<TelegramLinkDto[]> {
    const rows = await telegramLinksRepository.listAll()
    return rows.map(toDto)
  },

  async findForRoom(roomId: string): Promise<TelegramLinkDto | null> {
    const link = await telegramLinksRepository.findByRoomId(roomId)
    return link ? toDto(link) : null
  },

  async findRoomIdByChatId(chatId: string): Promise<string | null> {
    const link = await telegramLinksRepository.findByChatId(chatId)
    return link?.roomId ?? null
  },

  async unlink(id: string): Promise<void> {
    const deleted = await telegramLinksRepository.deleteById(id)
    if (!deleted) throw new NotFoundError('Telegram link not found')
  },
}
