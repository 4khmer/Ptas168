import type { Request, Response } from 'express'
import { bankPaymentsService } from './bankPayments.service'

export const bankPaymentsController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await bankPaymentsService.list())
  },
}
