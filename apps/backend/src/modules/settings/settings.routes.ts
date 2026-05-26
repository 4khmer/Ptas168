import { Router } from 'express'
import { settingsController } from './settings.controller'
import { authMiddleware } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../middleware/async-handler'

export const settingsRouter = Router()
settingsRouter.use(authMiddleware)
settingsRouter.get('/',   asyncHandler(settingsController.list))
settingsRouter.patch('/', asyncHandler(settingsController.update))
