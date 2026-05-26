import { Router } from 'express'
import { bankNotificationGroupsController } from './bankNotificationGroups.controller'
import { authMiddleware } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../middleware/async-handler'

export const bankNotificationGroupsRouter = Router()
bankNotificationGroupsRouter.use(authMiddleware)

bankNotificationGroupsRouter.get('/',        asyncHandler(bankNotificationGroupsController.list))
bankNotificationGroupsRouter.post('/code',   asyncHandler(bankNotificationGroupsController.mintCode))
bankNotificationGroupsRouter.delete('/:id',  asyncHandler(bankNotificationGroupsController.remove))
