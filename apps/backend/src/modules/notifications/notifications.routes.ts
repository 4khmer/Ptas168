import { Router } from 'express'
import { notificationsController } from './notifications.controller.js'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../middleware/async-handler.js'

export const notificationsRouter = Router()
notificationsRouter.use(authMiddleware)

notificationsRouter.get('/',                 asyncHandler(notificationsController.list))
notificationsRouter.post('/read-all',        asyncHandler(notificationsController.markAllRead))
notificationsRouter.post('/:id/read',        asyncHandler(notificationsController.markRead))
notificationsRouter.delete('/',              asyncHandler(notificationsController.clear))
