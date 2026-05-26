import { z } from 'zod'

export const addTenantToRoomSchema = z
  .object({
    phone: z.string().min(3),
    fullName: z.string().min(1).optional(),
    moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    baseRent: z.number().nonnegative().default(0),
    securityDeposit: z.number().nonnegative().default(0),
  })
  .strict()

export const updateContractSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    baseRent: z.number().nonnegative().optional(),
    securityDeposit: z.number().nonnegative().optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .strict()

export const terminateContractSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict()

export const listContractsQuery = z
  .object({
    roomId: z.string().uuid().optional(),
    tenantId: z.string().uuid().optional(),
    status: z.enum(['active', 'terminated']).optional(),
  })
  .strict()

export type AddTenantToRoomInput = z.infer<typeof addTenantToRoomSchema>
export type UpdateContractInput = z.infer<typeof updateContractSchema>
