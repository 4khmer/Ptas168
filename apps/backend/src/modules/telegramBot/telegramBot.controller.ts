import type { Request, Response } from 'express'
import { env } from '../../config/env'
import { logger } from '../../config/logger'
import { ForbiddenError } from '../../utils/errors'
import { bankPaymentsService } from '../bankPayments/bankPayments.service'
import { telegramLinksService } from '../telegramLinks/telegramLinks.service'
import { bankNotificationGroupsService } from '../bankNotificationGroups/bankNotificationGroups.service'
import { sendBotMessage } from './telegramBot.client'

const LINK_COMMAND = /^\/link(?:@[\w_]+)?\s+(\d{4,10})\b/i
const PAYMENT_COMMAND = /^\/(?:pay|payment)(?:@[\w_]+)?(?:\s+([\s\S]+))?$/i

export const telegramBotController = {
  /**
   * Telegram WebApp Bot webhook. Telegram POSTs every Update here.
   *
   * Three message kinds are handled, in this order of precedence:
   *   1. `/link <code>` — bind the chat to either a Room (code minted
   *      from RoomDetail) or as a property-wide payment-notification
   *      group (code minted from More → Payment Notification). The
   *      webhook tries both code pools.
   *   2. `/pay <bank text>` or a `/pay` reply to a bank message —
   *      manually ingest pasted/forwarded bank text. This is useful in
   *      groups where Telegram bot privacy only delivers commands.
   *   3. Bank payment text from a room-linked chat — parsed and stored
   *      with that room's roomId.
   *   4. Bank payment text from a notification-group chat — parsed and
   *      stored with no roomId (property-wide).
   *
   * Anything else is ignored (200 OK so Telegram doesn't retry).
   *
   * Verification: Telegram sends `X-Telegram-Bot-Api-Secret-Token` if
   * `secret_token` was passed when calling `setWebhook`. We compare
   * against env.TELEGRAM_BANK_WEBHOOK_SECRET in constant time.
   */
  async webhook(req: Request, res: Response): Promise<void> {
    const provided = req.header('x-telegram-bot-api-secret-token') || ''
    const expected = env.TELEGRAM_BANK_WEBHOOK_SECRET || ''
    if (!expected || !secureEquals(provided, expected)) {
      throw new ForbiddenError('Invalid webhook secret')
    }

    const update = req.body as TelegramUpdate
    const msg =
      update?.message ??
      update?.channel_post ??
      update?.edited_message ??
      update?.edited_channel_post
    const text = getMessageText(msg)
    const chatId = msg?.chat?.id != null ? String(msg.chat.id) : null
    const chatTitle = msg?.chat?.title ?? null

    if (!msg || !text) {
      res.status(200).json({ ok: true })
      return
    }

    // 1. /link <code> — bind the chat. Try room codes first, fall back
    //    to notification-group codes.
    const linkMatch = text.trim().match(LINK_COMMAND)
    if (linkMatch && chatId) {
      const code = linkMatch[1]
      const roomId = telegramLinksService.consumeCode(code)
      if (roomId) {
        await telegramLinksService.upsertLink(roomId, chatId, chatTitle)
        logger.info({ chatId, roomId }, 'Telegram chat linked to room')
        await sendBotMessage(chatId, '✓ Linked. Bank payment messages in this chat will now be attributed to this room.')
        res.status(200).json({ ok: true })
        return
      }
      const notification = bankNotificationGroupsService.consumeCode(code)
      if (notification) {
        await bankNotificationGroupsService.upsertGroup(chatId, chatTitle)
        logger.info({ chatId }, 'Telegram chat linked as payment-notification group')
        await sendBotMessage(chatId, '✓ Linked. Bank confirmations posted in this chat will appear in the Payments tab.')
        res.status(200).json({ ok: true })
        return
      }
      await sendBotMessage(chatId, 'Link code is invalid or expired. Please generate a new one in the app.')
      res.status(200).json({ ok: true })
      return
    }

    if (!chatId) {
      res.status(200).json({ ok: true })
      return
    }

    const paymentCommand = text.trim().match(PAYMENT_COMMAND)

    // 2. Room-linked chat → ingest with roomId.
    const roomId = await telegramLinksService.findRoomIdByChatId(chatId)
    if (roomId) {
      if (paymentCommand) {
        await ingestPaymentCommand(getPaymentCommandText(paymentCommand, msg), {
          chatId, messageId: msg.message_id ?? null, roomId,
        })
        res.status(200).json({ ok: true })
        return
      }

      const result = await bankPaymentsService.ingestFromText({
        text, chatId, messageId: msg.message_id ?? null, roomId,
      })
      logIngestResult(result, text, { roomId })
      res.status(200).json({ ok: true })
      return
    }

    // 3. Notification group → ingest with no roomId (property-wide).
    const isNotificationChat = await bankNotificationGroupsService.isNotificationChat(chatId)
    if (isNotificationChat) {
      if (paymentCommand) {
        await ingestPaymentCommand(getPaymentCommandText(paymentCommand, msg), {
          chatId, messageId: msg.message_id ?? null, roomId: null,
        })
        res.status(200).json({ ok: true })
        return
      }

      const result = await bankPaymentsService.ingestFromText({
        text, chatId, messageId: msg.message_id ?? null, roomId: null,
      })
      logIngestResult(result, text, { chatId })
      res.status(200).json({ ok: true })
      return
    }

    logger.debug({ chatId }, 'Telegram message from unlinked chat — ignored')
    res.status(200).json({ ok: true })
  },
}

function getMessageText(msg: TelegramMessage | undefined): string | undefined {
  return msg?.text || msg?.caption
}

function getPaymentCommandText(match: RegExpMatchArray, msg: TelegramMessage): string | undefined {
  const inlineText = match[1]?.trim()
  return inlineText || getMessageText(msg.reply_to_message)
}

async function ingestPaymentCommand(
  paymentText: string | undefined,
  ctx: { chatId: string; messageId: number | null; roomId: string | null },
): Promise<void> {
  const text = paymentText?.trim() ?? ''
  if (!text) {
    await sendBotMessage(ctx.chatId, 'Paste the bank confirmation after /pay, or reply /pay to the bank message.')
    return
  }

  const result = await bankPaymentsService.ingestFromText({
    text,
    chatId: ctx.chatId,
    messageId: ctx.messageId,
    roomId: ctx.roomId,
  })
  logIngestResult(result, text, { chatId: ctx.chatId, roomId: ctx.roomId })

  if (result.ok === true) {
    await sendBotMessage(ctx.chatId, `✓ Payment saved: ${result.payment.amount.toString()} ${result.payment.currency}`)
  } else if (result.ok === 'duplicate') {
    await sendBotMessage(ctx.chatId, 'This payment is already in the Payments tab.')
  } else {
    await sendBotMessage(ctx.chatId, 'I could not read that payment text. Please include the amount, USD or KHR, and the transaction ID.')
  }
}

function logIngestResult(
  result: Awaited<ReturnType<typeof bankPaymentsService.ingestFromText>>,
  text: string,
  ctx: Record<string, unknown>,
): void {
  if (result.ok === true) {
    logger.info({ ...ctx, txn: result.payment.transactionId, bank: result.payment.bank }, 'Bank payment recorded from Telegram')
  } else if (result.ok === 'duplicate') {
    logger.info({ ...ctx, txn: result.existing.transactionId }, 'Duplicate bank payment ignored')
  } else {
    logger.debug({ ...ctx, snippet: text.slice(0, 80) }, 'Telegram message did not match any bank parser')
  }
}

function secureEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  channel_post?: TelegramMessage
  edited_message?: TelegramMessage
  edited_channel_post?: TelegramMessage
}

interface TelegramMessage {
  message_id: number
  chat?: { id: number; type?: string; title?: string }
  text?: string
  caption?: string
  reply_to_message?: TelegramMessage
}
