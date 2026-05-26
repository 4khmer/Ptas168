import { z } from 'zod'
import { ServiceTypeSchema } from './enums.js'

// Write input ───────────────────────────────────────────────────────────────
// One bulk-set call replaces all room services in a single PUT.

export const setRoomServicesSchema = z
  .object({
    services: z.array(
      z
        .object({
          // Service IDs are not necessarily UUIDs — system-seeded ones use
          // stable slugs like "svc-water". Accept any non-empty string.
          serviceId: z.string().min(1),
          enabled: z.boolean(),
          priceOverride: z.union([z.number(), z.string(), z.null()]).optional(),
        })
        .strict(),
    ),
  })
  .strict()
export type SetRoomServicesInput = z.infer<typeof setRoomServicesSchema>

// Read DTO ──────────────────────────────────────────────────────────────────
// `effectiveRate` = priceOverride ?? serviceFee.defaultRate (derived in
// adapter). `serviceName`, `serviceIcon`, `serviceType`, `unit` are pulled
// in from the joined ServiceFee row.

export const RoomServiceDtoSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  serviceId: z.string(),                  // = ServiceFee.id
  serviceName: z.string(),
  serviceIcon: z.string(),
  serviceType: ServiceTypeSchema,
  unit: z.string(),
  defaultRate: z.number(),
  effectiveRate: z.number(),
  priceOverride: z.number().nullable(),
  enabled: z.boolean(),                   // maps from DB `active`
  assignedAt: z.string(),                 // ISO datetime
})
export type RoomServiceDto = z.infer<typeof RoomServiceDtoSchema>
