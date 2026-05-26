import { env } from '../../config/env'
import { logger } from '../../config/logger'

/**
 * Send a Telegram message. Failures are logged, not thrown — webhook
 * replies and "share to Telegram" actions are best-effort. Returns true
 * when Telegram accepted the message, false otherwise.
 */
export async function sendBotMessage(chatId: string | number, text: string): Promise<boolean> {
  const token = env.TELEGRAM_BANK_BOT_TOKEN
  if (!token) {
    logger.debug('TELEGRAM_BANK_BOT_TOKEN unset — skipping bot send')
    return false
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn({ status: res.status, body }, 'Telegram sendMessage failed')
      return false
    }
    return true
  } catch (err) {
    logger.warn({ err }, 'Telegram sendMessage threw')
    return false
  }
}
