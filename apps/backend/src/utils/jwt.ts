import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'
import { UnauthorizedError } from './errors'
import type { JwtPayload } from '@ptas/contracts'

// Re-export so existing consumers can keep `import { JwtPayload } from '../utils/jwt'`.
export type { JwtPayload }

export function signJwt(payload: JwtPayload): string {
  const opts: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] }
  return jwt.sign(payload, env.JWT_SECRET, opts)
}

export function verifyJwt(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET)
    if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
      throw new UnauthorizedError('Invalid token')
    }
    const obj = decoded as Record<string, unknown>
    if (typeof obj.userId !== 'string' || typeof obj.role !== 'string') {
      throw new UnauthorizedError('Invalid token payload')
    }
    return {
      userId: obj.userId,
      role: obj.role,
      telegramId: typeof obj.telegramId === 'string' ? obj.telegramId : undefined,
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err
    throw new UnauthorizedError('Invalid or expired token')
  }
}
