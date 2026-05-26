// Schemas + types live in @ptas/contracts; this file re-exports for module-local imports.
export {
  createTenantSchema,
  updateTenantSchema,
  tenantDocumentSchema,
  lookupTenantQuery,
  type CreateTenantInput,
  type UpdateTenantInput,
} from '@ptas/contracts'
