import type { HttpClient } from '../http/client.js'
import type { RoomDto, RoomAssetDto, MeterReadingMode } from '@ptas/contracts'

export interface CreateRoomArgs {
  name: string
  size?: string
  price: number | string                   // accepts user-typed string from forms
}

export interface UpdateRoomArgs {
  name?: string
  size?: string | null
  price?: number | string
  meterReadingMode?: MeterReadingMode
  assets?: RoomAssetDto[]
}

export interface RoomsApi {
  list(): Promise<RoomDto[]>
  get(id: string): Promise<RoomDto>
  create(floorId: string, input: CreateRoomArgs): Promise<RoomDto>
  update(id: string, input: UpdateRoomArgs): Promise<RoomDto>
  delete(id: string): Promise<null>
}

export function createRoomsApi(http: HttpClient): RoomsApi {
  return {
    list: () => http.get('/rooms'),
    get:  (id) => http.get(`/rooms/${id}`),
    create: (floorId, { name, size, price }) =>
      http.post(`/floors/${floorId}/rooms`, {
        name,
        size: size || undefined,
        pricePerMonth: Number(price) || 0,
      }),
    update: (id, data) => {
      const body: Record<string, unknown> = {}
      if (data.name             !== undefined) body.name = data.name
      if (data.size             !== undefined) body.size = data.size
      if (data.price            !== undefined) body.pricePerMonth = Number(data.price) || 0
      if (data.meterReadingMode !== undefined) body.meterReadingMode = data.meterReadingMode
      if (data.assets           !== undefined) body.assets = data.assets
      return http.patch(`/rooms/${id}`, body)
    },
    delete: (id) => http.delete(`/rooms/${id}`),
  }
}
