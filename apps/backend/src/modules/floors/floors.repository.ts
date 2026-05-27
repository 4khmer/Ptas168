import type { Floor } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

export const floorsRepository = {
  list: (buildingId?: string): Promise<Floor[]> =>
    prisma.floor.findMany({
      where: buildingId ? { buildingId } : undefined,
      orderBy: { createdAt: 'asc' },
    }),

  findById: (id: string): Promise<Floor | null> =>
    prisma.floor.findUnique({ where: { id } }),

  create: (data: { buildingId: string; name: string; remark?: string | null }): Promise<Floor> =>
    prisma.floor.create({ data: { ...data, remark: data.remark ?? null } }),

  update: (
    id: string,
    data: { name?: string; remark?: string | null },
  ): Promise<Floor> => prisma.floor.update({ where: { id }, data }),

  delete: (id: string): Promise<Floor> => prisma.floor.delete({ where: { id } }),
}
