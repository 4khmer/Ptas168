import { Prisma, type Tenant } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

export const tenantsRepository = {
  list: (): Promise<Tenant[]> =>
    prisma.tenant.findMany({ orderBy: { createdAt: 'asc' } }),

  findById: (id: string): Promise<Tenant | null> =>
    prisma.tenant.findUnique({ where: { id } }),

  findByPhone: (phone: string): Promise<Tenant | null> =>
    prisma.tenant.findUnique({ where: { phone } }),

  create: (data: { fullName: string; phone: string; photoUrl?: string | null }): Promise<Tenant> =>
    prisma.tenant.create({
      data: { fullName: data.fullName, phone: data.phone, photoUrl: data.photoUrl ?? null },
    }),

  update: (
    id: string,
    data: {
      fullName?: string
      phone?: string
      photoUrl?: string | null
      status?: 'active' | 'inactive'
      documents?: Prisma.InputJsonValue
    },
  ): Promise<Tenant> => prisma.tenant.update({ where: { id }, data }),
}
