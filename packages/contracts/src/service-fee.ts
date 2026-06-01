import { z } from 'zod'
import { ServiceTypeSchema } from './enums.js'

// Write inputs ──────────────────────────────────────────────────────────────

export const createServiceFeeSchema = z
  .object({
    name: z.string().min(1).max(120),
    icon: z.string().max(40).default('Box'),
    serviceType: ServiceTypeSchema.default('FIXED'),
    defaultRate: z.number().nonnegative(),
    unit: z.string().max(20).default('mo'),
    isDefault: z.boolean().optional(),
  })
  .strict()
export type CreateServiceFeeInput = z.infer<typeof createServiceFeeSchema>

export const updateServiceFeeSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    icon: z.string().max(40).optional(),
    serviceType: ServiceTypeSchema.optional(),
    defaultRate: z.number().nonnegative().optional(),
    unit: z.string().max(20).optional(),
    isDefault: z.boolean().optional(),
  })
  .strict()
export type UpdateServiceFeeInput = z.infer<typeof updateServiceFeeSchema>

// Read DTO ───────────────────────────────────────────────────────────────
// `type` is DERIVED in the adapter from `serviceType` (WATER/ELECTRICITY ⇒
// 'utility', else 'fixed'). `unitLabel` is `$/${unit}`. `canDelete` mirrors
// the `deletable` DB column — system-seeded Water/Electricity return false.

export const ServiceFeeDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  type: z.enum(['utility', 'fixed']),
  serviceType: ServiceTypeSchema,
  defaultRate: z.number(),
  unit: z.string(),
  unitLabel: z.string(),
  canDelete: z.boolean(),
  active: z.boolean(),
  isDefault: z.boolean(),
})
export type ServiceFeeDto = z.infer<typeof ServiceFeeDtoSchema>
