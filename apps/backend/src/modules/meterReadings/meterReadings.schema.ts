import { z } from 'zod'

export const createMeterReadingSchema = z
  .object({
    serviceType: z.enum(['WATER', 'ELECTRICITY']),
    recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
