import type { Request, Response } from 'express'
import { meterReadingsService } from './meterReadings.service.js'
import { createMeterReadingSchema } from './meterReadings.schema.js'

export const meterReadingsController = {
  async list(req: Request, res: Response): Promise<void> {
    const { roomId } = req.params as { roomId: string }
    res.json(await meterReadingsService.listForRoom(roomId))
  },

  async latest(req: Request, res: Response): Promise<void> {
    const { roomId } = req.params as { roomId: string }
    res.json(await meterReadingsService.latestForRoom(roomId))
  },

  async create(req: Request, res: Response): Promise<void> {
    const { roomId } = req.params as { roomId: string }
    const input = createMeterReadingSchema.parse(req.body)
    const row = await meterReadingsService.create(roomId, input)
    res.status(201).json(row)
  },
}
