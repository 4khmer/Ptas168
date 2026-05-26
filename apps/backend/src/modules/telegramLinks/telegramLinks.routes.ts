import { Router } from 'express'
import { telegramLinksController } from './telegramLinks.controller'
import { authMiddleware } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../middleware/async-handler'

export const telegramLinksRouter = Router()
telegramLinksRouter.use(authMiddleware)

telegramLinksRouter.get('/',              asyncHandler(telegramLinksController.list))
telegramLinksRouter.get('/room/:roomId',  asyncHandler(telegramLinksController.getForRoom))
telegramLinksRouter.post('/code',         asyncHandler(telegramLinksController.mintCode))
telegramLinksRouter.delete('/:id',        asyncHandler(telegramLinksController.remove))
