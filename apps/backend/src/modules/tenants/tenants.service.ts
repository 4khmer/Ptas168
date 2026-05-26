import { NotFoundError } from '../../utils/errors'
import { toTenantDto, type TenantDto } from '../../utils/adapters'
import { prisma } from '../../lib/prisma'
import { tenantsRepository } from './tenants.repository'
import type { CreateTenantInput, UpdateTenantInput } from './tenants.schema'

export const tenantsService = {
  async list(): Promise<TenantDto[]> {
    const rows = await tenantsRepository.list()
    return rows.map(toTenantDto)
  },

  async getById(id: string): Promise<TenantDto> {
    const row = await tenantsRepository.findById(id)
    if (!row) throw new NotFoundError('Tenant')
    return toTenantDto(row)
  },

  async lookupByPhone(phone: string): Promise<TenantDto | null> {
    const row = await tenantsRepository.findByPhone(phone)
    return row ? toTenantDto(row) : null
  },

  async create(input: CreateTenantInput): Promise<TenantDto> {
    const row = await tenantsRepository.create({
      fullName: input.fullName,
      phone: input.phone,
      photoUrl: input.profilePhotoUrl ?? null,
    })
    return toTenantDto(row)
  },

  async update(id: string, input: UpdateTenantInput): Promise<TenantDto> {
    const existing = await tenantsRepository.findById(id)
    if (!existing) throw new NotFoundError('Tenant')
    const row = await tenantsRepository.update(id, {
      fullName: input.fullName,
      phone: input.phone,
      photoUrl: input.profilePhotoUrl,
      status: input.status,
      documents: input.documents,
    })
    // Propagate name/phone changes to the denormalized contract snapshot so
    // Rooms list + Room Detail show the new tenant name/phone immediately.
    // Invoices keep their own snapshot (point-in-time record), so they're untouched.
    if (input.fullName !== undefined || input.phone !== undefined) {
      await prisma.contract.updateMany({
        where: { tenantId: id },
        data: {
          tenantName: row.fullName,
          tenantPhone: row.phone,
        },
      })
    }
    return toTenantDto(row)
  },
}
