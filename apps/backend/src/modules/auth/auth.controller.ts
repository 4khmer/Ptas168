import type { Request, Response } from 'express'
import { authService } from './auth.service'
import {
  changePasswordSchema,
  loginCredentialsSchema,
  loginTelegramSchema,
  registerSchema,
  updateProfileSchema,
} from './auth.schema'
import { UnauthorizedError } from '../../utils/errors'

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const input = registerSchema.parse(req.body)
    const result = await authService.register(input)
    res.status(201).json(result)
  },

  async loginCredentials(req: Request, res: Response): Promise<void> {
    const input = loginCredentialsSchema.parse(req.body)
    const result = await authService.loginWithCredentials(input.username, input.password)
    res.json(result)
  },

  async loginTelegram(req: Request, res: Response): Promise<void> {
    const input = loginTelegramSchema.parse(req.body)
    const result = await authService.loginWithTelegram(input.initData)
    res.json(result)
  },

  async logout(_req: Request, res: Response): Promise<void> {
    // Stateless JWT — frontend discards token. Endpoint preserved for symmetry.
    res.json({ success: true })
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError()
    const user = await authService.getProfile(req.user.userId)
    res.json(user)
  },

  async updateMe(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError()
    const input = updateProfileSchema.parse(req.body)
    const user = await authService.updateProfile(req.user.userId, input)
    res.json(user)
  },

  async changePassword(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError()
    const input = changePasswordSchema.parse(req.body)
    await authService.changePassword(req.user.userId, input.currentPassword, input.newPassword)
    res.json({ success: true })
  },
}
