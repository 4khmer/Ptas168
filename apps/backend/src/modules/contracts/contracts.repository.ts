import type { Contract, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'

export const contractsRepository = {
  list: (where: Prisma.ContractWhereInput): Promise<Contract[]> =>
    prisma.contract.findMany({ where, orderBy: { createdAt: 'desc' } }),

  findById: (id: string): Promise<Contract | null> =>
    prisma.contract.findUnique({ where: { id } }),

  findActiveForRoom: (roomId: string): Promise<Contract | null> =>
    prisma.contract.findFirst({ where: { roomId, status: 'active' } }),

  create: (data: Prisma.ContractUncheckedCreateInput): Promise<Contract> =>
    prisma.contract.create({ data }),

  update: (id: string, data: Prisma.ContractUncheckedUpdateInput): Promise<Contract> =>
    prisma.contract.update({ where: { id }, data }),
}
