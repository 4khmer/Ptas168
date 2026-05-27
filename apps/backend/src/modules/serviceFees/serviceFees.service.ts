import { ForbiddenError, NotFoundError } from '../../utils/errors.js'
import { toServiceFeeDto, type ServiceFeeDto } from '../../utils/adapters.js'
import { serviceFeesRepository } from './serviceFees.repository.js'
import type { CreateServiceFeeInput, UpdateServiceFeeInput } from './serviceFees.schema.js'

export const serviceFeesService = {
  async list(): Promise<ServiceFeeDto[]> {
    const rows = await serviceFeesRepository.list()
    return rows.map(toServiceFeeDto)
  },

  async create(input: CreateServiceFeeInput): Promise<ServiceFeeDto> {
    const row = await serviceFeesRepository.create({
      name: input.name,
      icon: input.icon,
      serviceType: input.serviceType,
      defaultRate: input.defaultRate,
      unit: input.unit,
      deletable: input.serviceType === 'FIXED',
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    })
    return toServiceFeeDto(row)
  },

  async update(id: string, input: UpdateServiceFeeInput): Promise<ServiceFeeDto> {
    const existing = await serviceFeesRepository.findById(id)
    if (!existing) throw new NotFoundError('Service fee')
    const row = await serviceFeesRepository.update(id, input)
    return toServiceFeeDto(row)
  },

  async delete(id: string): Promise<void> {
    const existing = await serviceFeesRepository.findById(id)
    if (!existing) throw new NotFoundError('Service fee')
    if (!existing.deletable) {
      throw new ForbiddenError('System service fees cannot be deleted')
    }
    await serviceFeesRepository.delete(id)
  },
}
