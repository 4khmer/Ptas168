import { api } from './client.js'

// Backend stores one row per (room, serviceType, date). Frontend renders them
// grouped by (date, recorder) → { waterPrev, waterCurrent, elecPrev, elecCurrent }.
export function groupMeterReadings(rows, roomId) {
  const byKey = new Map()
  for (const r of rows) {
    const key = `${r.recordDate}|${r.recordedByName || ''}`
    if (!byKey.has(key)) {
      byKey.set(key, {
        id: r.id,
        roomId: roomId ?? r.roomId,
        date: r.recordDate,
        recorder: r.recordedByName,
        waterPrev: null,
        waterCurrent: null,
        elecPrev: null,
        elecCurrent: null,
      })
    }
    const g = byKey.get(key)
    if (r.serviceType === 'WATER') {
      g.waterPrev = r.previousReading
      g.waterCurrent = r.currentReading
    } else if (r.serviceType === 'ELECTRICITY') {
      g.elecPrev = r.previousReading
      g.elecCurrent = r.currentReading
    }
  }
  return Array.from(byKey.values()).sort((a, b) => new Date(b.date) - new Date(a.date))
}

export const meterReadingsApi = {
  list: (roomId) => api.get(`/rooms/${roomId}/meter-readings`),
  latest: (roomId) => api.get(`/rooms/${roomId}/meter-readings/latest`),
  create: (roomId, { serviceType, recordDate, recordedByName, previousReading, currentReading }) =>
    api.post(`/rooms/${roomId}/meter-readings`, {
      serviceType,
      recordDate,
      recordedByName,
      previousReading: Number(previousReading) || 0,
      currentReading: Number(currentReading) || 0,
    }),
}
