import { Router } from 'express'
import { roomsController } from './rooms.controller'
import { authMiddleware } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../middleware/async-handler'

export const roomsRouter = Router()
roomsRouter.use(authMiddleware)
roomsRouter.get('/',        asyncHandler(roomsController.list))
roomsRouter.get('/:id',     asyncHandler(roomsController.get))
roomsRouter.patch('/:id',   asyncHandler(roomsController.update))
roomsRouter.delete('/:id',  asyncHandler(roomsController.remove))

export const floorRoomsRouter = Router({ mergeParams: true })
floorRoomsRouter.use(authMiddleware)
floorRoomsRouter.post('/', asyncHandler(roomsController.createForFloor))
