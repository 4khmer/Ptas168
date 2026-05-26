import type { Request, Response } from 'express'
import { tenantsService } from './tenants.service'
import { createTenantSchema, lookupTenantQuery, updateTenantSchema } from './tenants.schema'

export const tenantsController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await tenantsService.list())
  },

  async lookup(req: Request, res: Response): Promise<void> {
    const q = lookupTenantQuery.parse(req.query)
    const row = await tenantsService.lookupByPhone(q.phone)
    res.json(row)
  },

  async get(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    res.json(await tenantsService.getById(id))
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = createTenantSchema.parse(req.body)
    const row = await tenantsService.create(input)
    res.status(201).json(row)
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const input = updateTenantSchema.parse(req.body)
    res.json(await tenantsService.update(id, input))
  },
}
