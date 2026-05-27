import type { Building } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

export const buildingsRepository = {
  list: (): Promise<Building[]> =>
    prisma.building.findMany({ orderBy: { createdAt: 'asc' } }),

  findById: (id: string): Promise<Building | null> =>
    prisma.building.findUnique({ where: { id } }),

  create: (data: { name: string; remark?: string | null }): Promise<Building> =>
    prisma.building.create({ data: { name: data.name, remark: data.remark ?? null } }),

  update: (
    id: string,
    data: { name?: string; remark?: string | null },
  ): Promise<Building> => prisma.building.update({ where: { id }, data }),

  delete: (id: string): Promise<Building> => prisma.building.delete({ where: { id } }),
}
