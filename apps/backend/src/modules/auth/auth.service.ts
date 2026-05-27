import bcrypt from 'bcryptjs'
import { env } from '../../config/env.js'
import { ConflictError, UnauthorizedError, ValidationError } from '../../utils/errors.js'
import { signJwt } from '../../utils/jwt.js'
import { toUserDto, type UserDto } from '../../utils/adapters.js'
import { authRepository } from './auth.repository.js'
import type { RegisterInput } from './auth.schema.js'
import { validateTelegramInitData } from './telegram-validator.js'

export interface AuthResponse {
  token: string
  user: UserDto
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const usernameTaken = await authRepository.findByUsername(input.username)
    if (usernameTaken) throw new ConflictError('Username already taken')

    const passwordHash = await bcrypt.hash(input.password, 10)
    const user = await authRepository.createOwner({
      username: input.username,
      fullName: input.fullName,
      phone: input.phone ?? null,
      passwordHash,
    })
    const token = signJwt({ userId: user.id, role: user.role })
    return { token, user: toUserDto(user) }
  },

  async loginWithCredentials(username: string, password: string): Promise<AuthResponse> {
    const user = await authRepository.findByUsername(username)
    if (!user) throw new UnauthorizedError('Invalid phone or password')
    if (user.status !== 'active') throw new UnauthorizedError('Account inactive')
    if (!user.passwordHash) throw new UnauthorizedError('Password login not enabled for this user')
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new UnauthorizedError('Invalid phone or password')
    await authRepository.updateLastLogin(user.id)
    const token = signJwt({ userId: user.id, role: user.role })
    return { token, user: toUserDto(user) }
  },

  async loginWithTelegram(initData: string): Promise<AuthResponse> {
    const payload = validateTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN)
    const tg = payload.user
    const user = await authRepository.upsertTelegram({
      telegramId: BigInt(tg.id),
      username: tg.username ?? `tg_${tg.id}`,
      firstName: tg.first_name,
      lastName: tg.last_name ?? null,
      languageCode: tg.language_code ?? null,
      photoUrl: tg.photo_url ?? null,
      isPremium: !!tg.is_premium,
    })
    const token = signJwt({
      userId: user.id,
      role: user.role,
      telegramId: String(user.telegramId),
    })
    return { token, user: toUserDto(user) }
  },

  async getProfile(userId: string): Promise<UserDto> {
    const user = await authRepository.findById(userId)
    if (!user) throw new UnauthorizedError()
    return toUserDto(user)
  },

  async updateProfile(
    userId: string,
    input: { fullName?: string; username?: string; phone?: string | null; profileImage?: string | null },
  ): Promise<UserDto> {
    if (input.username) {
      const existing = await authRepository.findByUsername(input.username)
      if (existing && existing.id !== userId) {
        throw new ConflictError('Username already taken')
      }
    }
    const user = await authRepository.updateProfile(userId, input)
    return toUserDto(user)
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await authRepository.findById(userId)
    if (!user) throw new UnauthorizedError()
    if (!user.passwordHash) {
      throw new ValidationError('No password set for this account')
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!ok) throw new UnauthorizedError('Current password is incorrect')
    const hash = await bcrypt.hash(newPassword, 10)
    await authRepository.updatePassword(user.id, hash)
  },
}
