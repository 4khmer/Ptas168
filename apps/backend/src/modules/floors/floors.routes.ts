import { Router } from 'express'
import { floorsController } from './floors.controller.js'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../middleware/async-handler.js'

// /api/floors — listing + update + delete
export const floorsRouter = Router()
floorsRouter.use(authMiddleware)
floorsRouter.get('/',       asyncHandler(floorsController.list))
floorsRouter.patch('/:id',  asyncHandler(floorsController.update))
floorsRouter.delete('/:id', asyncHandler(floorsController.remove))

// /api/buildings/:buildingId/floors — nested create
export const buildingFloorsRouter = Router({ mergeParams: true })
buildingFloorsRouter.use(authMiddleware)
buildingFloorsRouter.post('/', asyncHandler(floorsController.createForBuilding))
