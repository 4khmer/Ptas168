import { z } from 'zod'

// TelegramLink — one room ↔ one chat (chatId @unique, roomId @unique).
// Created via /api/telegram-links/code (mints code) + bot's `/link <code>`.

export const TelegramLinkDtoSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  chatId: z.string(),
  chatTitle: z.string().nullable(),
  linkedAt: z.string(),                  // ISO datetime
})
export type TelegramLinkDto = z.infer<typeof TelegramLinkDtoSchema>

// Property-wide chats where bank bots post payment confirmations. Not tied
// to any specific room — the ingested payment is global.

export const BankNotificationGroupDtoSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  chatTitle: z.string().nullable(),
  linkedAt: z.string(),
})
export type BankNotificationGroupDto = z.infer<typeof BankNotificationGroupDtoSchema>

// Code-mint response (used by both link types)
export const MintCodeResponseSchema = z.object({
  code: z.string(),
  expiresAt: z.string(),                 // ISO datetime
})
export type MintCodeResponse = z.infer<typeof MintCodeResponseSchema>
