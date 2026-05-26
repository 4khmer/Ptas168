import { ConflictError, NotFoundError } from '../../utils/errors'
import { toContractDto, type ContractDto } from '../../utils/adapters'
import { prisma } from '../../lib/prisma'
import { roomsRepository } from '../rooms/rooms.repository'
import { tenantsRepository } from '../tenants/tenants.repository'
import { contractsRepository } from './contracts.repository'
import type { AddTenantToRoomInput, UpdateContractInput } from './contracts.schema'

export const contractsService = {
  async list(filters: { roomId?: string; tenantId?: string; status?: 'active' | 'terminated' }): Promise<ContractDto[]> {
    const rows = await contractsRepository.list(filters)
    return rows.map(toContractDto)
  },

  async getById(id: string): Promise<ContractDto> {
    const row = await contractsRepository.findById(id)
    if (!row) throw new NotFoundError('Contract')
    return toContractDto(row)
  },

  async addTenantToRoom(roomId: string, input: AddTenantToRoomInput): Promise<ContractDto> {
    const room = await roomsRepository.findById(roomId)
    if (!room) throw new NotFoundError('Room')

    const existingActive = await contractsRepository.findActiveForRoom(roomId)
    if (existingActive) throw new ConflictError('Room already has an active tenant')

    // Find or create tenant by phone
    let tenant = await tenantsRepository.findByPhone(input.phone)
    if (!tenant) {
      tenant = await tenantsRepository.create({
        fullName: input.fullName ?? 'Tenant',
        phone: input.phone,
      })
    } else if (input.fullName && tenant.fullName !== input.fullName) {
      tenant = await tenantsRepository.update(tenant.id, { fullName: input.fullName })
    }

    // Create contract + auto-assign Water + Electricity room services in a transaction
    const contract = await prisma.$transaction(async (tx) => {
      const c = await tx.contract.create({
        data: {
          roomId,
          tenantId: tenant.id,
          tenantName: tenant.fullName,
          tenantPhone: tenant.phone,
          startDate: new Date(input.moveInDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          baseRent: input.baseRent,
          securityDeposit: input.securityDeposit,
          status: 'active',
        },
      })
      // Auto-assign every service flagged as default at the master rate.
      // Reset priceOverride so a new tenant doesn't inherit the previous
      // tenant's custom rate — the user can re-customize per tenant via
      // the Room Services modal.
      const defaults = await tx.serviceFee.findMany({
        where: { isDefault: true, active: true },
      })
      for (const sf of defaults) {
        await tx.roomService.upsert({
          where: { roomId_serviceFeeId: { roomId, serviceFeeId: sf.id } },
          update: { active: true, priceOverride: null },
          create: { roomId, serviceFeeId: sf.id, active: true, priceOverride: null },
        })
      }
      return c
    })

    return toContractDto(contract)
  },

  async update(id: string, input: UpdateContractInput): Promise<ContractDto> {
    const existing = await contractsRepository.findById(id)
    if (!existing) throw new NotFoundError('Contract')
    const row = await contractsRepository.update(id, {
      baseRent: input.baseRent,
      securityDeposit: input.securityDeposit,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : input.endDate,
    })
    return toContractDto(row)
  },

  async terminate(id: string, reason?: string): Promise<ContractDto> {
    const existing = await contractsRepository.findById(id)
    if (!existing) throw new NotFoundError('Contract')
    if (existing.status === 'terminated') return toContractDto(existing)
    const row = await contractsRepository.update(id, {
      status: 'terminated',
      terminationReason: reason ?? null,
      terminatedAt: new Date(),
    })
    return toContractDto(row)
  },
}
