import { z } from 'zod'
import { TenantStatusSchema } from './enums.js'

// Tenant documents (attached IDs, contract scans, etc) ─────────────────────

export const tenantDocumentSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(255),
    type: z.string().max(120).optional(),
    size: z.number().int().nonnegative().optional(),
    dataUrl: z.string().min(1),
    uploadedAt: z.string().min(1),
  })
  .strict()
export type TenantDocumentDto = z.infer<typeof tenantDocumentSchema>

// Write inputs ──────────────────────────────────────────────────────────────
// ASYMMETRIC: backend accepts `fullName` + `profilePhotoUrl` on write, but
// returns `name` + `photo` on read. See MIGRATION_ANALYSIS.md §5.

export const createTenantSchema = z
  .object({
    fullName: z.string().min(1).max(120),
    phone: z.string().min(3).max(40),
    profilePhotoUrl: z.string().nullable().optional(),
  })
  .strict()
export type CreateTenantInput = z.infer<typeof createTenantSchema>

export const updateTenantSchema = z
  .object({
    fullName: z.string().min(1).max(120).optional(),
    phone: z.string().min(3).max(40).optional(),
    profilePhotoUrl: z.string().nullable().optional(),
    status: TenantStatusSchema.optional(),
    documents: z.array(tenantDocumentSchema).optional(),
  })
  .strict()
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>

export const lookupTenantQuery = z
  .object({
    phone: z.string().min(1),
  })
  .strict()

// Read DTO ──────────────────────────────────────────────────────────────────

export const TenantDtoSchema = z.object({
  id: z.string(),
  name: z.string(),                 // maps from DB `fullName`
  phone: z.string(),
  photo: z.string().nullable(),     // maps from DB `photoUrl`
  status: TenantStatusSchema,
  documents: z.array(tenantDocumentSchema),
})
export type TenantDto = z.infer<typeof TenantDtoSchema>
