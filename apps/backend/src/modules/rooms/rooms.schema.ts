import { z } from 'zod'

export const createRoomSchema = z
  .object({
    name: z.string().min(1).max(120),
    size: z.string().max(50).optional(),
    pricePerMonth: z.number().nonnegative().default(0),
  })
  .strict()

export const roomAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  notes: z.string().max(500).nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  addedAt: z.string().min(1),
}).strict()

export const updateRoomSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    size: z.string().max(50).nullable().optional(),
    pricePerMonth: z.number().nonnegative().optional(),
    meterReadingMode: z.enum(['manual', 'auto']).optional(),
    assets: z.array(roomAssetSchema).optional(),
  })
  .strict()

export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>
