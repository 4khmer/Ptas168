import crypto from 'node:crypto'
import { bankNotificationGroupsRepository } from './bankNotificationGroups.repository'
import { NotFoundError } from '../../utils/errors'

const CODE_TTL_MS = 10 * 60 * 1000
const CODE_LENGTH = 6

// Code pool is separate from the room-link pool so a customer can't
// accidentally bind a notification chat where they meant a room chat
// (or vice versa). The webhook tries both pools on /link <code>.
const pendingCodes = new Map<string, number>()    // code -> expiresAt

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
  for (const [code, exp] of pendingCodes) {
    if (exp <= now) pendingCodes.delete(code)
  }
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
  mintCode(): { code: string; expiresAt: string; ttlSeconds: number } {
    const now = Date.now()
    purgeExpired(now)
    let code = generateNumericCode(CODE_LENGTH)
    while (pendingCodes.has(code)) code = generateNumericCode(CODE_LENGTH)
    const expiresAt = now + CODE_TTL_MS
    pendingCodes.set(code, expiresAt)
    return {
      code,
      expiresAt: new Date(expiresAt).toISOString(),
      ttlSeconds: Math.floor(CODE_TTL_MS / 1000),
    }
  },

  /**
   * Resolve a code received from Telegram. Returns true if the code
   * was a valid (un-expired, un-consumed) notification-group code.
   * Single-use: a successful resolution removes the code.
   */
  consumeCode(code: string): boolean {
    const now = Date.now()
    purgeExpired(now)
    const exp = pendingCodes.get(code)
    if (!exp) return false
    pendingCodes.delete(code)
    return true
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

  async upsertGroup(chatId: string, chatTitle: string | null): Promise<void> {
    await bankNotificationGroupsRepository.upsertByChatId(chatId, chatTitle)
  },

  async unlink(id: string): Promise<void> {
    const deleted = await bankNotificationGroupsRepository.deleteById(id)
    if (!deleted) throw new NotFoundError('Notification group not found')
  },
}
