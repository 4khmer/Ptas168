import type { HttpClient } from '../http/client.js'
import type { MeterReadingDto, ServiceType } from '@ptas/contracts'

export interface CreateMeterReadingArgs {
  serviceType: 'WATER' | 'ELECTRICITY'
  recordDate: string                       // YYYY-MM-DD
  recordedByName: string
  previousReading: number | string
  currentReading: number | string
}

export interface MeterReadingLatest {
  serviceType: ServiceType
  previousReading: number
  currentReading: number
  autoFilled: boolean
  lastRecordDate: string | null
}

export interface MeterReadingsApi {
  list(roomId: string): Promise<MeterReadingDto[]>
  latest(roomId: string): Promise<MeterReadingLatest[]>
  create(roomId: string, args: CreateMeterReadingArgs): Promise<MeterReadingDto>
}

export function createMeterReadingsApi(http: HttpClient): MeterReadingsApi {
  return {
    list:   (roomId) => http.get(`/rooms/${roomId}/meter-readings`),
    latest: (roomId) => http.get(`/rooms/${roomId}/meter-readings/latest`),
    create: (roomId, { serviceType, recordDate, recordedByName, previousReading, currentReading }) =>
      http.post(`/rooms/${roomId}/meter-readings`, {
        serviceType,
        recordDate,
        recordedByName,
        previousReading: Number(previousReading) || 0,
        currentReading: Number(currentReading) || 0,
      }),
  }
}
