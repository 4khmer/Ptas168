import { NotFoundError } from '../../utils/errors.js'
import { toMeterReadingDto, type MeterReadingDto } from '../../utils/adapters.js'
import { roomsRepository } from '../rooms/rooms.repository.js'
import { meterReadingsRepository } from './meterReadings.repository.js'
import type { CreateMeterReadingInput } from './meterReadings.schema.js'

export interface LatestMeterReadingDto {
  serviceType: 'WATER' | 'ELECTRICITY'
  previousReading: number
  currentReading: number | null
  autoFilled: boolean
  lastRecordDate: string | null
}

export const meterReadingsService = {
  async listForRoom(roomId: string): Promise<MeterReadingDto[]> {
    const room = await roomsRepository.findById(roomId)
    if (!room) throw new NotFoundError('Room')
    const rows = await meterReadingsRepository.listForRoom(roomId)
    return rows.map(toMeterReadingDto)
  },

  async latestForRoom(roomId: string): Promise<LatestMeterReadingDto[]> {
    const room = await roomsRepository.findById(roomId)
    if (!room) throw new NotFoundError('Room')
    const isAuto = room.meterReadingMode === 'auto'
    const types: Array<'WATER' | 'ELECTRICITY'> = ['WATER', 'ELECTRICITY']
    const result: LatestMeterReadingDto[] = []
    for (const t of types) {
      const last = await meterReadingsRepository.latestForRoom(roomId, t)
      // In "auto" mode, both prev + current are taken straight from the last
      // record so the new bill uses the same usage as the last one with no
      // user input. In "manual" mode, prev rolls forward (last.current → new prev)
      // and the user enters a fresh current reading.
      const previousReading = last
        ? (isAuto ? last.previousReading.toNumber() : last.currentReading.toNumber())
        : 0
      const currentReading = isAuto && last ? last.currentReading.toNumber() : null
      result.push({
        serviceType: t,
        previousReading,
        currentReading,
        autoFilled: isAuto && !!last,
        lastRecordDate: last ? last.recordDate.toISOString().slice(0, 10) : null,
      })
    }
    return result
  },

  async create(roomId: string, input: CreateMeterReadingInput): Promise<MeterReadingDto> {
    const room = await roomsRepository.findById(roomId)
    if (!room) throw new NotFoundError('Room')
    const row = await meterReadingsRepository.create({
      roomId,
      serviceType: input.serviceType,
      recordDate: new Date(input.recordDate),
      recordedByName: input.recordedByName,
      previousReading: input.previousReading,
      currentReading: input.currentReading,
    })
    return toMeterReadingDto(row)
  },
}
