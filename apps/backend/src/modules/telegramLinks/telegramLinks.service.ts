import crypto from 'node:crypto'
import { telegramLinksRepository, type TelegramLinkWithRoom } from './telegramLinks.repository'
import { roomsRepository } from '../rooms/rooms.repository'
import { NotFoundError } from '../../utils/errors'

const CODE_TTL_MS = 10 * 60 * 1000
const CODE_LENGTH = 6

interface PendingCode {
  roomId: string
  expiresAt: number
}

const pendingCodes = new Map<string, PendingCode>()

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

function purgeExpired(now: number): void {
  for (const [code, info] of pendingCodes) {
    if (info.expiresAt <= now) pendingCodes.delete(code)
  }
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
   */
  async mintCode(roomId: string): Promise<{ code: string; expiresAt: string; ttlSeconds: number }> {
    const room = await roomsRepository.findById(roomId)
    if (!room) throw new NotFoundError('Room')
    const now = Date.now()
    purgeExpired(now)
    let code = generateNumericCode(CODE_LENGTH)
    while (pendingCodes.has(code)) code = generateNumericCode(CODE_LENGTH)
    const expiresAt = now + CODE_TTL_MS
    pendingCodes.set(code, { roomId, expiresAt })
    return {
      code,
      expiresAt: new Date(expiresAt).toISOString(),
      ttlSeconds: Math.floor(CODE_TTL_MS / 1000),
    }
  },

  /**
   * Resolve a code sent from Telegram into the target roomId. Codes are
   * single-use — successful resolution removes them from the pool.
   */
  consumeCode(code: string): string | null {
    const now = Date.now()
    purgeExpired(now)
    const info = pendingCodes.get(code)
    if (!info) return null
    pendingCodes.delete(code)
    return info.roomId
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

  /**
   * Save (or replace) the link for a given room. Used by the webhook
   * after a successful `/link <code>` command.
   */
  async upsertLink(roomId: string, chatId: string, chatTitle: string | null): Promise<void> {
    await telegramLinksRepository.upsertByRoomId(roomId, chatId, chatTitle)
  },

  async unlink(id: string): Promise<void> {
    const deleted = await telegramLinksRepository.deleteById(id)
    if (!deleted) throw new NotFoundError('Telegram link not found')
  },
}
