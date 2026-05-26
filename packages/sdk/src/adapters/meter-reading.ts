import type { MeterReadingDto } from '@ptas/contracts'

// Frontend renders meter readings grouped by (date, recorder). Each group
// shows the water + electricity pair side-by-side. Backend stores one row
// per (room, serviceType, date) — this folds them.
export interface GroupedMeterReading {
  id: string
  roomId: string
  date: string                      // YYYY-MM-DD
  recorder: string
  waterPrev: number | null
  waterCurrent: number | null
  elecPrev: number | null
  elecCurrent: number | null
}

export function groupMeterReadings(rows: MeterReadingDto[], roomId?: string): GroupedMeterReading[] {
  const byKey = new Map<string, GroupedMeterReading>()
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
    const g = byKey.get(key)!
    if (r.serviceType === 'WATER') {
      g.waterPrev = r.previousReading
      g.waterCurrent = r.currentReading
    } else if (r.serviceType === 'ELECTRICITY') {
      g.elecPrev = r.previousReading
      g.elecCurrent = r.currentReading
    }
  }
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}
