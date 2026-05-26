import { Router } from 'express'
import { authController } from './auth.controller'
import { authMiddleware } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../middleware/async-handler'

export const authRouter = Router()

authRouter.post('/register', asyncHandler(authController.register))
authRouter.post('/login',    asyncHandler(authController.loginCredentials))
authRouter.post('/telegram', asyncHandler(authController.loginTelegram))
authRouter.post('/logout',   asyncHandler(authController.logout))
authRouter.get('/me',        authMiddleware, asyncHandler(authController.me))
authRouter.patch('/me',      authMiddleware, asyncHandler(authController.updateMe))
authRouter.post('/password', authMiddleware, asyncHandler(authController.changePassword))
