import type { Request, Response } from 'express'
import { floorsService } from './floors.service.js'
import { createFloorSchema, listFloorsQuery, updateFloorSchema } from './floors.schema.js'

export const floorsController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = listFloorsQuery.parse(req.query)
    res.json(await floorsService.list(query.buildingId))
  },

  async createForBuilding(req: Request, res: Response): Promise<void> {
    const { buildingId } = req.params as { buildingId: string }
    const input = createFloorSchema.parse(req.body)
    const row = await floorsService.create(buildingId, input)
    res.status(201).json(row)
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const input = updateFloorSchema.parse(req.body)
    res.json(await floorsService.update(id, input))
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    await floorsService.delete(id)
    res.status(204).send()
  },
}
