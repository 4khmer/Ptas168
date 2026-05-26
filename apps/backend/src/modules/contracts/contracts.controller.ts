import type { Request, Response } from 'express'
import { contractsService } from './contracts.service'
import {
  addTenantToRoomSchema,
  listContractsQuery,
  terminateContractSchema,
  updateContractSchema,
} from './contracts.schema'

export const contractsController = {
  async list(req: Request, res: Response): Promise<void> {
    const q = listContractsQuery.parse(req.query)
    res.json(await contractsService.list(q))
  },

  async addToRoom(req: Request, res: Response): Promise<void> {
    const { roomId } = req.params as { roomId: string }
    const input = addTenantToRoomSchema.parse(req.body)
    const row = await contractsService.addTenantToRoom(roomId, input)
    res.status(201).json(row)
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const input = updateContractSchema.parse(req.body)
    res.json(await contractsService.update(id, input))
  },

  async terminate(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const input = terminateContractSchema.parse(req.body ?? {})
    res.json(await contractsService.terminate(id, input.reason))
  },
}
