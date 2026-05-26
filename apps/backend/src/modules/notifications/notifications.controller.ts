import type { Request, Response } from 'express'
import { UnauthorizedError } from '../../utils/errors'
import { notificationsService } from './notifications.service'
import { listNotificationsQuery } from './notifications.schema'

function requireUser(req: Request): string {
  if (!req.user) throw new UnauthorizedError()
  return req.user.userId
}

export const notificationsController = {
  async list(req: Request, res: Response): Promise<void> {
    const userId = requireUser(req)
    const q = listNotificationsQuery.parse(req.query)
    res.json(await notificationsService.list(userId, { take: q.size, onlyUnread: q.onlyUnread }))
  },
  async markRead(req: Request, res: Response): Promise<void> {
    const userId = requireUser(req)
    const { id } = req.params as { id: string }
    await notificationsService.markRead(id, userId)
    res.json({ success: true })
  },
  async markAllRead(req: Request, res: Response): Promise<void> {
    const userId = requireUser(req)
    await notificationsService.markAllRead(userId)
    res.json({ success: true })
  },
  async clear(req: Request, res: Response): Promise<void> {
    const userId = requireUser(req)
    await notificationsService.clear(userId)
    res.status(204).send()
  },
}
