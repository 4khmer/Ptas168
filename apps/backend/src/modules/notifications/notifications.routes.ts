import { Router } from 'express'
import { notificationsController } from './notifications.controller'
import { authMiddleware } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../middleware/async-handler'

export const notificationsRouter = Router()
notificationsRouter.use(authMiddleware)

notificationsRouter.get('/',                 asyncHandler(notificationsController.list))
notificationsRouter.post('/read-all',        asyncHandler(notificationsController.markAllRead))
notificationsRouter.post('/:id/read',        asyncHandler(notificationsController.markRead))
notificationsRouter.delete('/',              asyncHandler(notificationsController.clear))
