import { Router } from 'express'
import { usersController } from './users.controller'
import { authMiddleware, requireRole } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../middleware/async-handler'

export const usersRouter = Router()
usersRouter.use(authMiddleware)
usersRouter.use(requireRole('owner', 'manager'))

usersRouter.get('/',       asyncHandler(usersController.list))
usersRouter.post('/',      asyncHandler(usersController.create))
usersRouter.patch('/:id',  asyncHandler(usersController.update))
usersRouter.delete('/:id', asyncHandler(usersController.remove))
