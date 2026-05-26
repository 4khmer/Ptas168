import { z } from 'zod'
import { ServiceTypeSchema } from '@ptas/contracts'

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

export type CreateServiceFeeInput = z.infer<typeof createServiceFeeSchema>
export type UpdateServiceFeeInput = z.infer<typeof updateServiceFeeSchema>
