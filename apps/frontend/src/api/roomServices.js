import { api } from './client.js'

// Backend's setRoomServicesSchema is .strict(); strip every field the modal
// adds for UI rendering (name, icon, defaultRate, unitLabel, …) before sending.
function toBackendShape(services) {
  return services.map(s => {
    const out = { serviceId: s.serviceId, enabled: !!s.enabled }
    const ov = s.priceOverride
    if (ov === '' || ov === undefined || ov === null) {
      out.priceOverride = null
    } else {
      const n = typeof ov === 'number' ? ov : parseFloat(ov)
      out.priceOverride = Number.isFinite(n) ? n : null
    }
    return out
  })
}

export const roomServicesApi = {
  list: (roomId) => api.get(`/rooms/${roomId}/services`),
  set: (roomId, services) =>
    api.put(`/rooms/${roomId}/services`, { services: toBackendShape(services) }),
}
