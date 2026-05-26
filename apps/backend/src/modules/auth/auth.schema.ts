import { z } from 'zod'

export const loginCredentialsSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict()

export const registerSchema = z
  .object({
    username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_-]+$/, 'Use letters, numbers, _ or -'),
    fullName: z.string().min(1).max(120),
    phone: z.string().min(3).max(40).optional(),
    password: z.string().min(6),
  })
  .strict()

export const loginTelegramSchema = z
  .object({
    initData: z.string().min(1, 'initData is required'),
  })
  .strict()

export const updateProfileSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_-]+$/, 'Use letters, numbers, _ or -').optional(),
    phone: z.string().optional().nullable(),
    profileImage: z.string().optional().nullable(),
  })
  .strict()

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  })
  .strict()

export type LoginCredentialsInput = z.infer<typeof loginCredentialsSchema>
export type LoginTelegramInput = z.infer<typeof loginTelegramSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
