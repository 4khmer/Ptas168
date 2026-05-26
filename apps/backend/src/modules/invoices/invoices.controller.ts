import type { Request, Response } from 'express'
import { invoicesService } from './invoices.service'
import {
  cancelInvoiceSchema,
  createInvoiceSchema,
  invoiceCountsQuery,
  listInvoicesPageQuery,
  listInvoicesQuery,
  payInvoiceSchema,
} from './invoices.schema'

export const invoicesController = {
  async list(req: Request, res: Response): Promise<void> {
    const q = listInvoicesQuery.parse(req.query)
    res.json(await invoicesService.list(q))
  },
  async listPage(req: Request, res: Response): Promise<void> {
    const q = listInvoicesPageQuery.parse(req.query)
    res.json(await invoicesService.listPage(q))
  },
  async counts(req: Request, res: Response): Promise<void> {
    const q = invoiceCountsQuery.parse(req.query)
    res.json(await invoicesService.countsByStatus(q))
  },
  async get(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    res.json(await invoicesService.getById(id))
  },
  async create(req: Request, res: Response): Promise<void> {
    const input = createInvoiceSchema.parse(req.body)
    const row = await invoicesService.create(input)
    res.status(201).json(row)
  },
  async pay(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const input = payInvoiceSchema.parse(req.body)
    res.json(await invoicesService.pay(id, input.method))
  },
  async cancel(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const input = cancelInvoiceSchema.parse(req.body ?? {})
    res.json(await invoicesService.cancel(id, input.reason))
  },
  async shareTelegram(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    res.json(await invoicesService.shareToTelegram(id))
  },
}
