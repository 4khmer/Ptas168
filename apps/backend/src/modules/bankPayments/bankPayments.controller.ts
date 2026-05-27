import type { Request, Response } from 'express'
import { bankPaymentsService } from './bankPayments.service.js'

export const bankPaymentsController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await bankPaymentsService.list())
  },
}
