import { Router } from 'express'
import { bankNotificationGroupsController } from './bankNotificationGroups.controller.js'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../middleware/async-handler.js'

export const bankNotificationGroupsRouter = Router()
bankNotificationGroupsRouter.use(authMiddleware)

bankNotificationGroupsRouter.get('/',        asyncHandler(bankNotificationGroupsController.list))
bankNotificationGroupsRouter.post('/code',   asyncHandler(bankNotificationGroupsController.mintCode))
bankNotificationGroupsRouter.delete('/:id',  asyncHandler(bankNotificationGroupsController.remove))
