import { z } from 'zod'

// Write inputs ──────────────────────────────────────────────────────────────

export const createBuildingSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(120),
    remark: z.string().max(500).nullable().optional(),
  })
  .strict()
export type CreateBuildingInput = z.infer<typeof createBuildingSchema>

export const updateBuildingSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    remark: z.string().max(500).nullable().optional(),
  })
  .strict()
export type UpdateBuildingInput = z.infer<typeof updateBuildingSchema>

// Read DTO ──────────────────────────────────────────────────────────────────

export const BuildingDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  remark: z.string(),
})
export type BuildingDto = z.infer<typeof BuildingDtoSchema>
