import { NotFoundError } from '../../utils/errors.js'
import { toFloorDto, type FloorDto } from '../../utils/adapters.js'
import { buildingsRepository } from '../buildings/buildings.repository.js'
import { floorsRepository } from './floors.repository.js'
import type { CreateFloorInput, UpdateFloorInput } from './floors.schema.js'

export const floorsService = {
  async list(buildingId?: string): Promise<FloorDto[]> {
    const rows = await floorsRepository.list(buildingId)
    return rows.map(toFloorDto)
  },

  async getById(id: string): Promise<FloorDto> {
    const row = await floorsRepository.findById(id)
    if (!row) throw new NotFoundError('Floor')
    return toFloorDto(row)
  },

  async create(buildingId: string, input: CreateFloorInput): Promise<FloorDto> {
    const building = await buildingsRepository.findById(buildingId)
    if (!building) throw new NotFoundError('Building')
    const row = await floorsRepository.create({ buildingId, ...input })
    return toFloorDto(row)
  },

  async update(id: string, input: UpdateFloorInput): Promise<FloorDto> {
    const existing = await floorsRepository.findById(id)
    if (!existing) throw new NotFoundError('Floor')
    const row = await floorsRepository.update(id, input)
    return toFloorDto(row)
  },

  async delete(id: string): Promise<void> {
    const existing = await floorsRepository.findById(id)
    if (!existing) throw new NotFoundError('Floor')
    await floorsRepository.delete(id)
  },
}
