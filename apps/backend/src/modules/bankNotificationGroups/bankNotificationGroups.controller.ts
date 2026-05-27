import type { Request, Response } from 'express'
import { bankNotificationGroupsService } from './bankNotificationGroups.service.js'

export const bankNotificationGroupsController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await bankNotificationGroupsService.list())
  },

  async mintCode(_req: Request, res: Response): Promise<void> {
    res.json(await bankNotificationGroupsService.mintCode())
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    await bankNotificationGroupsService.unlink(id)
    res.status(204).end()
  },
}
