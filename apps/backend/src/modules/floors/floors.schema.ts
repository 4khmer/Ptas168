import { z } from 'zod'

export const createFloorSchema = z
  .object({
    name: z.string().min(1).max(120),
    remark: z.string().max(500).nullable().optional(),
  })
  .strict()

export const updateFloorSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    remark: z.string().max(500).nullable().optional(),
  })
  .strict()

export const listFloorsQuery = z
  .object({
    buildingId: z.string().uuid().optional(),
  })
  .strict()

export type CreateFloorInput = z.infer<typeof createFloorSchema>
export type UpdateFloorInput = z.infer<typeof updateFloorSchema>
