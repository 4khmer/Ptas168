import { Router } from 'express'
import { roomServicesController } from './roomServices.controller.js'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../middleware/async-handler.js'

export const roomServicesRouter = Router({ mergeParams: true })
roomServicesRouter.use(authMiddleware)
roomServicesRouter.get('/', asyncHandler(roomServicesController.list))
roomServicesRouter.put('/', asyncHandler(roomServicesController.set))
