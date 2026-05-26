import { Router } from 'express'
import { meterReadingsController } from './meterReadings.controller'
import { authMiddleware } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../middleware/async-handler'

export const meterReadingsRouter = Router({ mergeParams: true })
meterReadingsRouter.use(authMiddleware)
meterReadingsRouter.get('/latest', asyncHandler(meterReadingsController.latest))
meterReadingsRouter.get('/',       asyncHandler(meterReadingsController.list))
meterReadingsRouter.post('/',      asyncHandler(meterReadingsController.create))
