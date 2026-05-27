import { Router } from 'express'
import { telegramLinksController } from './telegramLinks.controller.js'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../middleware/async-handler.js'

export const telegramLinksRouter = Router()
telegramLinksRouter.use(authMiddleware)

telegramLinksRouter.get('/',              asyncHandler(telegramLinksController.list))
telegramLinksRouter.get('/room/:roomId',  asyncHandler(telegramLinksController.getForRoom))
telegramLinksRouter.post('/code',         asyncHandler(telegramLinksController.mintCode))
telegramLinksRouter.delete('/:id',        asyncHandler(telegramLinksController.remove))
