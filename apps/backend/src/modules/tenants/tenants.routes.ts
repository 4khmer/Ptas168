import { Router } from 'express'
import { tenantsController } from './tenants.controller'
import { authMiddleware } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../middleware/async-handler'

export const tenantsRouter = Router()
tenantsRouter.use(authMiddleware)

tenantsRouter.get('/lookup',  asyncHandler(tenantsController.lookup))
tenantsRouter.get('/',        asyncHandler(tenantsController.list))
tenantsRouter.get('/:id',     asyncHandler(tenantsController.get))
tenantsRouter.post('/',       asyncHandler(tenantsController.create))
tenantsRouter.patch('/:id',   asyncHandler(tenantsController.update))
