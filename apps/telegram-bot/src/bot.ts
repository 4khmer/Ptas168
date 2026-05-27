import { Bot, type Context } from 'grammy'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { prisma } from './config/prisma.js'
import { consumeLinkCode, consumeNotificationCode } from './lib/link-codes.js'
import { ingestBankPaymentFromText } from './lib/ingest-bank-payment.js'

// Regex matches mirror the legacy backend webhook:
//   /link <6-10 digits>
//   /pay [bank text...]
const LINK_COMMAND    = /^\/link(?:@[\w_]+)?\s+(\d{4,10})\b/i
const PAYMENT_COMMAND = /^\/(?:pay|payment)(?:@[\w_]+)?(?:\s+([\s\S]+))?$/i

/** Pulls `text` or `caption` from a message — bank confirmations sometimes arrive as captions. */
function messageText(ctx: Context): string | undefined {
  const m = ctx.message ?? ctx.channelPost ?? ctx.editedMessage ?? ctx.editedChannelPost
  return m?.text ?? m?.caption
}

function chatId(ctx: Context): string | null {
  const id = ctx.chat?.id
  return id != null ? String(id) : null
}

export function buildBot(): Bot | null {
  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.warn('TELEGRAM_BOT_TOKEN unset — Telegram polling disabled (bot still consumes BullMQ queue)')
    return null
  }
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN)

  // Handles `/link <code>`. Tries the room-link pool first, falls back to
  // the notification-group pool.
  bot.command(['link', 'start'], async (ctx) => {
    const text = messageText(ctx) ?? ''
    const match = text.match(LINK_COMMAND)
    const cid = chatId(ctx)
    if (!match || !cid) return

    const code = match[1]
    const title = ctx.chat?.type !== 'private' && 'title' in (ctx.chat ?? {})
      ? (ctx.chat as { title?: string }).title ?? null
      : null

    const roomId = await consumeLinkCode(code)
    if (roomId) {
      await prisma.telegramLink.upsert({
        where: { roomId },
        update: { chatId: cid, chatTitle: title },
        create: { roomId, chatId: cid, chatTitle: title },
      })
      logger.info({ chatId: cid, roomId }, 'Telegram chat linked to room')
      await ctx.reply('✓ Linked. Bank payment messages in this chat will now be attributed to this room.')
      return
    }

    const isNotificationCode = await consumeNotificationCode(code)
    if (isNotificationCode) {
      await prisma.bankNotificationGroup.upsert({
        where: { chatId: cid },
        update: { chatTitle: title },
        create: { chatId: cid, chatTitle: title },
      })
      logger.info({ chatId: cid }, 'Telegram chat linked as payment-notification group')
      await ctx.reply('✓ Linked. Bank confirmations posted in this chat will appear in the Payments tab.')
      return
    }

    await ctx.reply('Link code is invalid or expired. Please generate a new one in the app.')
  })

  // Handles `/pay [text]` — manually ingest pasted/forwarded bank text.
  // Useful in groups where Telegram bot privacy delivers only commands.
  bot.command(['pay', 'payment'], async (ctx) => {
    const text = messageText(ctx) ?? ''
    const match = text.match(PAYMENT_COMMAND)
    const cid = chatId(ctx)
    if (!cid) return

    const inline = match?.[1]?.trim()
    const replyText = (ctx.message?.reply_to_message as { text?: string; caption?: string } | undefined)
    const paymentText = inline || replyText?.text || replyText?.caption
    if (!paymentText) {
      await ctx.reply('Paste the bank confirmation after /pay, or reply /pay to the bank message.')
      return
    }

    const linkedRoomId = await findRoomIdByChatId(cid)
    const notificationGroup = await isNotificationChat(cid)
    if (!linkedRoomId && !notificationGroup) {
      await ctx.reply('This chat is not linked. Send /link <code> first.')
      return
    }

    const result = await ingestBankPaymentFromText({
      text: paymentText,
      chatId: cid,
      messageId: ctx.message?.message_id ?? null,
      roomId: linkedRoomId,
    })
    if (result.ok === true) {
      await ctx.reply(`✓ Payment saved: ${result.payment.amount.toString()} ${result.payment.currency}`)
    } else if (result.ok === 'duplicate') {
      await ctx.reply('This payment is already in the Payments tab.')
    } else {
      await ctx.reply('I could not read that payment text. Please include the amount, USD or KHR, and the transaction ID.')
    }
  })

  // Raw text from a linked chat → try parsing as a bank payment.
  bot.on(['message:text', 'message:caption', 'channel_post:text', 'channel_post:caption'], async (ctx) => {
    const text = messageText(ctx)
    const cid = chatId(ctx)
    if (!text || !cid) return
    // Skip commands; they're already handled above.
    if (text.trim().startsWith('/')) return

    const linkedRoomId = await findRoomIdByChatId(cid)
    if (linkedRoomId) {
      const result = await ingestBankPaymentFromText({
        text, chatId: cid, messageId: ctx.message?.message_id ?? ctx.channelPost?.message_id ?? null, roomId: linkedRoomId,
      })
      logIngest(result, text, { chatId: cid, roomId: linkedRoomId })
      return
    }

    if (await isNotificationChat(cid)) {
      const result = await ingestBankPaymentFromText({
        text, chatId: cid, messageId: ctx.message?.message_id ?? ctx.channelPost?.message_id ?? null, roomId: null,
      })
      logIngest(result, text, { chatId: cid })
      return
    }

    // Unlinked chat — silent skip.
  })

  bot.catch((err) => logger.error({ err }, 'Bot handler threw'))

  return bot
}

async function findRoomIdByChatId(chatId: string): Promise<string | null> {
  const row = await prisma.telegramLink.findUnique({ where: { chatId }, select: { roomId: true } })
  return row?.roomId ?? null
}

async function isNotificationChat(chatId: string): Promise<boolean> {
  const row = await prisma.bankNotificationGroup.findUnique({ where: { chatId } })
  return !!row
}

function logIngest(
  result: Awaited<ReturnType<typeof ingestBankPaymentFromText>>,
  text: string,
  ctx: Record<string, unknown>,
): void {
  if (result.ok === true) {
    logger.info({ ...ctx, txn: result.payment.transactionId, bank: result.payment.bank }, 'Bank payment recorded')
  } else if (result.ok === 'duplicate') {
    logger.info({ ...ctx, txn: result.existing.transactionId }, 'Duplicate bank payment ignored')
  } else {
    logger.debug({ ...ctx, snippet: text.slice(0, 80) }, 'Text did not match any bank parser')
  }
}
