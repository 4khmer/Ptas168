import type { Request, Response } from 'express'
import { buildingsService } from './buildings.service.js'
import { createBuildingSchema, updateBuildingSchema } from './buildings.schema.js'

export const buildingsController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await buildingsService.list())
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = createBuildingSchema.parse(req.body)
    const row = await buildingsService.create(input)
    res.status(201).json(row)
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const input = updateBuildingSchema.parse(req.body)
    res.json(await buildingsService.update(id, input))
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    await buildingsService.delete(id)
    res.status(204).send()
  },
}
