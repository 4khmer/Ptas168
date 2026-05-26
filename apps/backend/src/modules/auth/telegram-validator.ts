import crypto from 'node:crypto'
import { UnauthorizedError } from '../../utils/errors'

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export interface TelegramInitDataPayload {
  user: TelegramUser
  authDate: number
  hash: string
}

const MAX_AGE_SECONDS = 24 * 60 * 60

export function validateTelegramInitData(initData: string, botToken: string): TelegramInitDataPayload {
  if (!initData || typeof initData !== 'string') {
    throw new UnauthorizedError('Missing initData')
  }
  if (!botToken) {
    throw new UnauthorizedError('Telegram bot token not configured')
  }

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) throw new UnauthorizedError('Missing hash in initData')
  params.delete('hash')

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  // Constant-time comparison
  const a = Buffer.from(computedHash, 'hex')
  const b = Buffer.from(hash, 'hex')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new UnauthorizedError('initData hash mismatch')
  }

  const authDateRaw = params.get('auth_date')
  if (!authDateRaw) throw new UnauthorizedError('Missing auth_date')
  const authDate = Number(authDateRaw)
  if (!Number.isFinite(authDate)) throw new UnauthorizedError('Invalid auth_date')

  const nowSec = Math.floor(Date.now() / 1000)
  if (nowSec - authDate > MAX_AGE_SECONDS) {
    throw new UnauthorizedError('initData expired')
  }

  const userRaw = params.get('user')
  if (!userRaw) throw new UnauthorizedError('Missing user payload')

  let user: TelegramUser
  try {
    user = JSON.parse(userRaw) as TelegramUser
  } catch {
    throw new UnauthorizedError('Malformed user payload')
  }

  if (typeof user.id !== 'number' || !user.first_name) {
    throw new UnauthorizedError('Invalid Telegram user shape')
  }

  return { user, authDate, hash }
}
