import type { Request, Response } from 'express'
import { telegramLinksService } from './telegramLinks.service.js'
import { NotFoundError, ValidationError } from '../../utils/errors.js'

export const telegramLinksController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await telegramLinksService.list())
  },

  async getForRoom(req: Request, res: Response): Promise<void> {
    const { roomId } = req.params as { roomId: string }
    const link = await telegramLinksService.findForRoom(roomId)
    if (!link) throw new NotFoundError('No Telegram link for this room')
    res.json(link)
  },

  async mintCode(req: Request, res: Response): Promise<void> {
    const roomId = typeof req.body?.roomId === 'string' ? req.body.roomId : null
    if (!roomId) throw new ValidationError('roomId is required')
    res.json(await telegramLinksService.mintCode(roomId))
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    await telegramLinksService.unlink(id)
    res.status(204).end()
  },
}
