import type { Invoice, InvoiceLineItem, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

export type InvoiceWithItems = Invoice & { lineItems: InvoiceLineItem[] }

export const invoicesRepository = {
  list: (where: Prisma.InvoiceWhereInput): Promise<InvoiceWithItems[]> =>
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { lineItems: true },
    }) as Promise<InvoiceWithItems[]>,

  // Paginated variant. Returns just the rows; total is fetched separately so
  // the caller can run both queries in parallel.
  listPaginated: (
    where: Prisma.InvoiceWhereInput,
    skip: number,
    take: number,
  ): Promise<InvoiceWithItems[]> =>
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { lineItems: true },
      skip,
      take,
    }) as Promise<InvoiceWithItems[]>,

  count: (where: Prisma.InvoiceWhereInput): Promise<number> =>
    prisma.invoice.count({ where }),

  findById: (id: string): Promise<InvoiceWithItems | null> =>
    prisma.invoice.findUnique({ where: { id }, include: { lineItems: true } }) as Promise<InvoiceWithItems | null>,

  countOpenForRoom: (roomId: string): Promise<number> =>
    prisma.invoice.count({ where: { roomId, status: 'progress' } }),

  countCreated: (): Promise<number> =>
    prisma.invoice.count(),

  create: (data: Prisma.InvoiceUncheckedCreateInput): Promise<Invoice> =>
    prisma.invoice.create({ data }),

  update: (id: string, data: Prisma.InvoiceUncheckedUpdateInput): Promise<InvoiceWithItems> =>
    prisma.invoice.update({
      where: { id },
      data,
      include: { lineItems: true },
    }) as unknown as Promise<InvoiceWithItems>,
}
