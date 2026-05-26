import { z } from 'zod'

export const createTenantSchema = z
  .object({
    fullName: z.string().min(1).max(120),
    phone: z.string().min(3).max(40),
    profilePhotoUrl: z.string().nullable().optional(),
  })
  .strict()

export const tenantDocumentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  type: z.string().max(120).optional(),
  size: z.number().int().nonnegative().optional(),
  dataUrl: z.string().min(1),
  uploadedAt: z.string().min(1),
}).strict()

export const updateTenantSchema = z
  .object({
    fullName: z.string().min(1).max(120).optional(),
    phone: z.string().min(3).max(40).optional(),
    profilePhotoUrl: z.string().nullable().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    documents: z.array(tenantDocumentSchema).optional(),
  })
  .strict()

export const lookupTenantQuery = z
  .object({
    phone: z.string().min(1),
  })
  .strict()

export type CreateTenantInput = z.infer<typeof createTenantSchema>
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>
