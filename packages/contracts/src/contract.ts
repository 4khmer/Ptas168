import { z } from 'zod'
import { ContractStatusSchema } from './enums.js'

// YYYY-MM-DD date string
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// Write inputs ──────────────────────────────────────────────────────────────
// ASYMMETRIC: backend accepts `moveInDate` on create, but returns
// `startDate` on read. See MIGRATION_ANALYSIS.md §5.

export const addTenantToRoomSchema = z
  .object({
    phone: z.string().min(3),
    fullName: z.string().min(1).optional(),
    moveInDate: dateString,
    endDate: dateString.nullable().optional(),
    baseRent: z.number().nonnegative().default(0),
    securityDeposit: z.number().nonnegative().default(0),
  })
  .strict()
export type AddTenantToRoomInput = z.infer<typeof addTenantToRoomSchema>

export const updateContractSchema = z
  .object({
    startDate: dateString.optional(),
    baseRent: z.number().nonnegative().optional(),
    securityDeposit: z.number().nonnegative().optional(),
    endDate: dateString.nullable().optional(),
  })
  .strict()
export type UpdateContractInput = z.infer<typeof updateContractSchema>

export const terminateContractSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict()
export type TerminateContractInput = z.infer<typeof terminateContractSchema>

export const listContractsQuery = z
  .object({
    roomId: z.string().uuid().optional(),
    tenantId: z.string().uuid().optional(),
    status: ContractStatusSchema.optional(),
  })
  .strict()

// Read DTO ──────────────────────────────────────────────────────────────────
// tenantName / tenantPhone are SNAPSHOTS — preserved on the row so the
// contract row survives later renames/deletes of the tenant.

export const ContractDtoSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  tenantId: z.string(),
  tenantName: z.string(),
  tenantPhone: z.string(),
  startDate: z.string(),                       // ISO date
  endDate: z.string().nullable(),
  baseRent: z.number(),
  securityDeposit: z.number(),
  status: ContractStatusSchema,
  terminationReason: z.string().nullable(),
  terminatedAt: z.string().nullable(),         // ISO datetime
})
export type ContractDto = z.infer<typeof ContractDtoSchema>
