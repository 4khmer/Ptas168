import { z } from 'zod'

// Room assets (furniture, appliances, fixtures) ─────────────────────────────

export const roomAssetSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(120),
    notes: z.string().max(500).nullable().optional(),
    photoUrl: z.string().nullable().optional(),
    addedAt: z.string().min(1),
  })
  .strict()
export type RoomAssetDto = z.infer<typeof roomAssetSchema>

export const meterReadingModeSchema = z.enum(['manual', 'auto'])
export type MeterReadingMode = z.infer<typeof meterReadingModeSchema>

// Write inputs ──────────────────────────────────────────────────────────────
// ASYMMETRIC: backend accepts `pricePerMonth` on write, but returns `price`
// on read. See MIGRATION_ANALYSIS.md §5.

export const createRoomSchema = z
  .object({
    name: z.string().min(1).max(120),
    size: z.string().max(50).optional(),
    pricePerMonth: z.number().nonnegative().default(0),
  })
  .strict()
export type CreateRoomInput = z.infer<typeof createRoomSchema>

export const updateRoomSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    size: z.string().max(50).nullable().optional(),
    pricePerMonth: z.number().nonnegative().optional(),
    meterReadingMode: meterReadingModeSchema.optional(),
    assets: z.array(roomAssetSchema).optional(),
  })
  .strict()
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>

// Read DTO ──────────────────────────────────────────────────────────────────
// `occupied`, `tenantName`, `canStartBill`, `dayCounter`, `daysInMonth`,
// `dayCounterColor` are DERIVED in the backend adapter (see toRoomDto in
// apps/backend/src/utils/adapters.ts) — they're not columns. Treat them as
// read-only and never include them on a write schema.

export const RoomDtoSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  buildingId: z.string(),
  name: z.string(),
  size: z.string(),
  price: z.number(),                          // maps from DB `pricePerMonth`
  active: z.boolean(),
  occupied: z.boolean(),                      // derived
  tenantName: z.string().nullable(),          // derived
  canStartBill: z.boolean(),                  // derived
  dayCounter: z.number().int(),               // derived
  daysInMonth: z.number().int(),              // derived
  dayCounterColor: z.string().nullable(),     // derived
  meterReadingMode: meterReadingModeSchema,
  assets: z.array(roomAssetSchema),
  floorName: z.string().optional(),
  buildingName: z.string().optional(),
})
export type RoomDto = z.infer<typeof RoomDtoSchema>
