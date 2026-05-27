import type { Request, Response } from 'express'
import { roomsService } from './rooms.service.js'
import { createRoomSchema, updateRoomSchema } from './rooms.schema.js'

export const roomsController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await roomsService.list())
  },

  async get(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    res.json(await roomsService.getById(id))
  },

  async createForFloor(req: Request, res: Response): Promise<void> {
    const { floorId } = req.params as { floorId: string }
    const input = createRoomSchema.parse(req.body)
    const row = await roomsService.create(floorId, input)
    res.status(201).json(row)
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const input = updateRoomSchema.parse(req.body)
    res.json(await roomsService.update(id, input))
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    await roomsService.delete(id)
    res.status(204).send()
  },
}
