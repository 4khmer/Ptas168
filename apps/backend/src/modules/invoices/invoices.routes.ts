import { Router } from 'express'
import { invoicesController } from './invoices.controller.js'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../middleware/async-handler.js'

export const invoicesRouter = Router()
invoicesRouter.use(authMiddleware)
// Static paths must come before /:id so they aren't shadowed.
invoicesRouter.get('/page',       asyncHandler(invoicesController.listPage))
invoicesRouter.get('/counts',     asyncHandler(invoicesController.counts))
invoicesRouter.get('/',           asyncHandler(invoicesController.list))
invoicesRouter.post('/',          asyncHandler(invoicesController.create))
invoicesRouter.get('/:id',        asyncHandler(invoicesController.get))
invoicesRouter.post('/:id/pay',   asyncHandler(invoicesController.pay))
invoicesRouter.post('/:id/cancel', asyncHandler(invoicesController.cancel))
invoicesRouter.post('/:id/share-telegram', asyncHandler(invoicesController.shareTelegram))
