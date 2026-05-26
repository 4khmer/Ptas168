import type { Request, Response } from 'express'
import { serviceFeesService } from './serviceFees.service'
import { createServiceFeeSchema, updateServiceFeeSchema } from './serviceFees.schema'

export const serviceFeesController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await serviceFeesService.list())
  },
  async create(req: Request, res: Response): Promise<void> {
    const input = createServiceFeeSchema.parse(req.body)
    const row = await serviceFeesService.create(input)
    res.status(201).json(row)
  },
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const input = updateServiceFeeSchema.parse(req.body)
    res.json(await serviceFeesService.update(id, input))
  },
  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    await serviceFeesService.delete(id)
    res.status(204).send()
  },
}
