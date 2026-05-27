import { Router } from 'express'
import { buildingsController } from './buildings.controller.js'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../middleware/async-handler.js'

export const buildingsRouter = Router()

buildingsRouter.use(authMiddleware)

buildingsRouter.get('/',       asyncHandler(buildingsController.list))
buildingsRouter.post('/',      asyncHandler(buildingsController.create))
buildingsRouter.patch('/:id',  asyncHandler(buildingsController.update))
buildingsRouter.delete('/:id', asyncHandler(buildingsController.remove))
