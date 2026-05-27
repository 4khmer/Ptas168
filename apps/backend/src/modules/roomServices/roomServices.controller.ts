import type { Request, Response } from 'express'
import { roomServicesService } from './roomServices.service.js'
import { setRoomServicesSchema } from './roomServices.schema.js'

export const roomServicesController = {
  async list(req: Request, res: Response): Promise<void> {
    const { roomId } = req.params as { roomId: string }
    res.json(await roomServicesService.listForRoom(roomId))
  },

  async set(req: Request, res: Response): Promise<void> {
    const { roomId } = req.params as { roomId: string }
    const input = setRoomServicesSchema.parse(req.body)
    res.json(await roomServicesService.setForRoom(roomId, input))
  },
}
