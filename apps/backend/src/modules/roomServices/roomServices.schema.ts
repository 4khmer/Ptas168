import { z } from 'zod'

export const setRoomServicesSchema = z
  .object({
    services: z.array(
      z
        .object({
          // Master service IDs aren't required to be UUIDs (system-seeded ones
          // use stable slugs like "svc-water"); accept any non-empty string.
          serviceId: z.string().min(1),
          enabled: z.boolean(),
          priceOverride: z.union([z.number(), z.string(), z.null()]).optional(),
        })
        .strict(),
    ),
  })
  .strict()

export type SetRoomServicesInput = z.infer<typeof setRoomServicesSchema>
