import { Router } from 'express'
import { serviceFeesController } from './serviceFees.controller.js'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../middleware/async-handler.js'

export const serviceFeesRouter = Router()
serviceFeesRouter.use(authMiddleware)
serviceFeesRouter.get('/',       asyncHandler(serviceFeesController.list))
serviceFeesRouter.post('/',      asyncHandler(serviceFeesController.create))
serviceFeesRouter.patch('/:id',  asyncHandler(serviceFeesController.update))
serviceFeesRouter.delete('/:id', asyncHandler(serviceFeesController.remove))
