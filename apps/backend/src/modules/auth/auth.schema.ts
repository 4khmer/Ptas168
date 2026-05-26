// Schemas + types live in @ptas/contracts; this file re-exports for module-local imports.
export {
  loginCredentialsSchema,
  registerSchema,
  loginTelegramSchema,
  updateProfileSchema,
  changePasswordSchema,
  type LoginCredentialsInput,
  type LoginTelegramInput,
  type RegisterInput,
  type UpdateProfileInput,
  type ChangePasswordInput,
} from '@ptas/contracts'
