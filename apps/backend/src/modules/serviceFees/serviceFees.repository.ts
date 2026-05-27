import type { Prisma, ServiceFee } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

export const serviceFeesRepository = {
  list: (): Promise<ServiceFee[]> =>
    prisma.serviceFee.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } }),

  findById: (id: string): Promise<ServiceFee | null> =>
    prisma.serviceFee.findUnique({ where: { id } }),

  create: (data: Prisma.ServiceFeeUncheckedCreateInput): Promise<ServiceFee> =>
    prisma.serviceFee.create({ data }),

  update: (id: string, data: Prisma.ServiceFeeUncheckedUpdateInput): Promise<ServiceFee> =>
    prisma.serviceFee.update({ where: { id }, data }),

  delete: (id: string): Promise<ServiceFee> => prisma.serviceFee.delete({ where: { id } }),
}
