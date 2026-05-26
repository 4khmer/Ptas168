import { Router } from 'express'
import { buildingsController } from './buildings.controller'
import { authMiddleware } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../middleware/async-handler'

export const buildingsRouter = Router()

buildingsRouter.use(authMiddleware)

buildingsRouter.get('/',       asyncHandler(buildingsController.list))
buildingsRouter.post('/',      asyncHandler(buildingsController.create))
buildingsRouter.patch('/:id',  asyncHandler(buildingsController.update))
buildingsRouter.delete('/:id', asyncHandler(buildingsController.remove))
