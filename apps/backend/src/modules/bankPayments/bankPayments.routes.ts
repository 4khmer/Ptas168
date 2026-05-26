import { Router } from 'express'
import { bankPaymentsController } from './bankPayments.controller'
import { authMiddleware } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../middleware/async-handler'

export const bankPaymentsRouter = Router()

bankPaymentsRouter.get('/', authMiddleware, asyncHandler(bankPaymentsController.list))
