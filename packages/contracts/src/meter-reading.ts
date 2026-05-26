import { z } from 'zod'
import { ServiceTypeSchema } from './enums.js'

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// Write input ───────────────────────────────────────────────────────────────
// Only WATER and ELECTRICITY meters are recorded (FIXED services have no
// meter reading). The refine ensures readings move forward.

export const createMeterReadingSchema = z
  .object({
    serviceType: z.enum(['WATER', 'ELECTRICITY']),
    recordDate: dateString,
    recordedByName: z.string().min(1).max(120),
    previousReading: z.number().nonnegative(),
    currentReading: z.number().nonnegative(),
  })
  .strict()
  .refine(d => d.currentReading >= d.previousReading, {
    message: 'currentReading must be ≥ previousReading',
    path: ['currentReading'],
  })
export type CreateMeterReadingInput = z.infer<typeof createMeterReadingSchema>

// Read DTO ──────────────────────────────────────────────────────────────────
// One row per (roomId, serviceType, recordDate). The frontend groups them
// client-side into per-day rows — that grouped shape lives in packages/sdk.

export const MeterReadingDtoSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  serviceType: ServiceTypeSchema,
  recordDate: z.string(),                  // ISO date
  recordedByName: z.string(),
  previousReading: z.number(),
  currentReading: z.number(),
})
export type MeterReadingDto = z.infer<typeof MeterReadingDtoSchema>
