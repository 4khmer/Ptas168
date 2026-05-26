import { Router } from 'express'
import { roomServicesController } from './roomServices.controller'
import { authMiddleware } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../middleware/async-handler'

export const roomServicesRouter = Router({ mergeParams: true })
roomServicesRouter.use(authMiddleware)
roomServicesRouter.get('/', asyncHandler(roomServicesController.list))
roomServicesRouter.put('/', asyncHandler(roomServicesController.set))
