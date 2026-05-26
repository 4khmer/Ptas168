import { z } from 'zod'

const Role = z.enum(['manager', 'staff', 'viewer'])

export const createUserSchema = z
  .object({
    username: z.string().min(1).max(60),
    fullName: z.string().min(1).max(120),
    password: z.string().min(6).max(120),
    phone: z.string().min(3).max(40).optional().nullable(),
    role: Role.default('staff'),
    active: z.boolean().default(true),
  })
  .strict()

export const updateUserSchema = z
  .object({
    fullName: z.string().min(1).max(120).optional(),
    phone: z.string().min(3).max(40).optional().nullable(),
    role: Role.optional(),
    active: z.boolean().optional(),
    password: z.string().min(6).max(120).optional(),
  })
  .strict()

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
