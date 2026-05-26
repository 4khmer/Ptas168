import { z } from 'zod'

// Write inputs ──────────────────────────────────────────────────────────────

export const createFloorSchema = z
  .object({
    name: z.string().min(1).max(120),
    remark: z.string().max(500).nullable().optional(),
  })
  .strict()
export type CreateFloorInput = z.infer<typeof createFloorSchema>

export const updateFloorSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    remark: z.string().max(500).nullable().optional(),
  })
  .strict()
export type UpdateFloorInput = z.infer<typeof updateFloorSchema>

export const listFloorsQuery = z
  .object({
    buildingId: z.string().uuid().optional(),
  })
  .strict()

// Read DTO ──────────────────────────────────────────────────────────────────

export const FloorDtoSchema = z.object({
  id: z.string(),
  buildingId: z.string(),
  name: z.string(),
  remark: z.string(),
})
export type FloorDto = z.infer<typeof FloorDtoSchema>
