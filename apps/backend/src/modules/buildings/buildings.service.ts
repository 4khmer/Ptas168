import { NotFoundError } from '../../utils/errors'
import { toBuildingDto, type BuildingDto } from '../../utils/adapters'
import { buildingsRepository } from './buildings.repository'
import type { CreateBuildingInput, UpdateBuildingInput } from './buildings.schema'

export const buildingsService = {
  async list(): Promise<BuildingDto[]> {
    const rows = await buildingsRepository.list()
    return rows.map(toBuildingDto)
  },

  async getById(id: string): Promise<BuildingDto> {
    const row = await buildingsRepository.findById(id)
    if (!row) throw new NotFoundError('Building')
    return toBuildingDto(row)
  },

  async create(input: CreateBuildingInput): Promise<BuildingDto> {
    const row = await buildingsRepository.create(input)
    return toBuildingDto(row)
  },

  async update(id: string, input: UpdateBuildingInput): Promise<BuildingDto> {
    const existing = await buildingsRepository.findById(id)
    if (!existing) throw new NotFoundError('Building')
    const row = await buildingsRepository.update(id, input)
    return toBuildingDto(row)
  },

  async delete(id: string): Promise<void> {
    const existing = await buildingsRepository.findById(id)
    if (!existing) throw new NotFoundError('Building')
    await buildingsRepository.delete(id)
  },
}
