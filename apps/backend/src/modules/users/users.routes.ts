import { Router } from 'express'
import { usersController } from './users.controller.js'
import { authMiddleware, requireRole } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../middleware/async-handler.js'

export const usersRouter = Router()
usersRouter.use(authMiddleware)
usersRouter.use(requireRole('owner', 'manager'))

usersRouter.get('/',       asyncHandler(usersController.list))
usersRouter.post('/',      asyncHandler(usersController.create))
usersRouter.patch('/:id',  asyncHandler(usersController.update))
usersRouter.delete('/:id', asyncHandler(usersController.remove))
