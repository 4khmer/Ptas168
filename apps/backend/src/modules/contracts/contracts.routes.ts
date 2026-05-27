import { Router } from 'express'
import { contractsController } from './contracts.controller.js'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../middleware/async-handler.js'

export const contractsRouter = Router()
contractsRouter.use(authMiddleware)
contractsRouter.get('/',                  asyncHandler(contractsController.list))
contractsRouter.patch('/:id',             asyncHandler(contractsController.update))
contractsRouter.post('/:id/terminate',    asyncHandler(contractsController.terminate))

export const roomContractsRouter = Router({ mergeParams: true })
roomContractsRouter.use(authMiddleware)
roomContractsRouter.post('/', asyncHandler(contractsController.addToRoom))
