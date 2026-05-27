import type { Request, Response } from 'express'
import { usersService } from './users.service.js'
import { createUserSchema, updateUserSchema } from './users.schema.js'

export const usersController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await usersService.listSubUsers())
  },
  async create(req: Request, res: Response): Promise<void> {
    const input = createUserSchema.parse(req.body)
    const row = await usersService.create(input)
    res.status(201).json(row)
  },
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const input = updateUserSchema.parse(req.body)
    res.json(await usersService.update(id, input))
  },
  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    await usersService.delete(id)
    res.status(204).send()
  },
}
