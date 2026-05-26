import type { HttpClient } from '../http/client.js'
import type { FloorDto } from '@ptas/contracts'

export interface FloorInput {
  name: string
  remark?: string | null
}

export interface FloorsApi {
  list(buildingId?: string): Promise<FloorDto[]>
  create(buildingId: string, input: FloorInput): Promise<FloorDto>
  update(id: string, input: FloorInput): Promise<FloorDto>
  delete(id: string): Promise<null>
}

export function createFloorsApi(http: HttpClient): FloorsApi {
  return {
    list: (buildingId) =>
      http.get(`/floors${buildingId ? `?buildingId=${encodeURIComponent(buildingId)}` : ''}`),
    create: (buildingId, { name, remark }) =>
      http.post(`/buildings/${buildingId}/floors`, { name, remark: remark || null }),
    update: (id, { name, remark }) =>
      http.patch(`/floors/${id}`, { name, remark: remark || null }),
    delete: (id) => http.delete(`/floors/${id}`),
  }
}
