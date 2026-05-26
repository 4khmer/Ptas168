import type { HttpClient } from '../http/client.js'
import type { BuildingDto } from '@ptas/contracts'

export interface BuildingInput {
  name: string
  remark?: string | null
}

export interface BuildingsApi {
  list(): Promise<BuildingDto[]>
  create(input: BuildingInput): Promise<BuildingDto>
  update(id: string, input: BuildingInput): Promise<BuildingDto>
  delete(id: string): Promise<null>
}

export function createBuildingsApi(http: HttpClient): BuildingsApi {
  return {
    list:   ()                            => http.get('/buildings'),
    create: ({ name, remark })            => http.post('/buildings', { name, remark: remark || null }),
    update: (id, { name, remark })        => http.patch(`/buildings/${id}`, { name, remark: remark || null }),
    delete: (id)                          => http.delete(`/buildings/${id}`),
  }
}
