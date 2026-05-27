import { Router } from 'express'
import { bankPaymentsController } from './bankPayments.controller.js'
import { authMiddleware } from '../../middleware/auth.middleware.js'
import { asyncHandler } from '../../middleware/async-handler.js'

export const bankPaymentsRouter = Router()

bankPaymentsRouter.get('/', authMiddleware, asyncHandler(bankPaymentsController.list))
