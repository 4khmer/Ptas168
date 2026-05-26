import type { Request, Response } from 'express'
import { settingsService } from './settings.service'
import { updateSettingsSchema } from './settings.schema'

export const settingsController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await settingsService.getAll())
  },
  async update(req: Request, res: Response): Promise<void> {
    const input = updateSettingsSchema.parse(req.body)
    res.json(await settingsService.setMany(input))
  },
}
