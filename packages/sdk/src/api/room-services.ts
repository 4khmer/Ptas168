import type { HttpClient } from '../http/client.js'
import type { RoomServiceDto } from '@ptas/contracts'

export interface RoomServiceInput {
  serviceId: string
  enabled: boolean
  priceOverride?: number | string | null
  // Any other UI-only fields (name, icon, defaultRate, unitLabel, …) are
  // stripped before send so the strict backend schema doesn't reject the call.
  [key: string]: unknown
}

export interface RoomServicesApi {
  list(roomId: string): Promise<RoomServiceDto[]>
  set(roomId: string, services: RoomServiceInput[]): Promise<RoomServiceDto[]>
}

// Backend's setRoomServicesSchema is .strict(). Strip every field the modal
// adds for UI rendering before sending.
function toBackendShape(services: RoomServiceInput[]): Array<{
  serviceId: string
  enabled: boolean
  priceOverride: number | null
}> {
  return services.map(s => {
    const ov = s.priceOverride
    let priceOverride: number | null = null
    if (ov !== '' && ov !== undefined && ov !== null) {
      const n = typeof ov === 'number' ? ov : parseFloat(ov as string)
      priceOverride = Number.isFinite(n) ? n : null
    }
    return { serviceId: s.serviceId, enabled: !!s.enabled, priceOverride }
  })
}

export function createRoomServicesApi(http: HttpClient): RoomServicesApi {
  return {
    list: (roomId) => http.get(`/rooms/${roomId}/services`),
    set:  (roomId, services) =>
      http.put(`/rooms/${roomId}/services`, { services: toBackendShape(services) }),
  }
}
