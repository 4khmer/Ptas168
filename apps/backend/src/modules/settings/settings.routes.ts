import { Router } from 'express'
import { settingsController } from './settings.controller.js'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../middleware/async-handler.js'

export const settingsRouter = Router()
settingsRouter.use(authMiddleware)
settingsRouter.get('/',   asyncHandler(settingsController.list))
settingsRouter.patch('/', asyncHandler(settingsController.update))
