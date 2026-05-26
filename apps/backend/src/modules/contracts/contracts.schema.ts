// Schemas + types live in @ptas/contracts; this file re-exports for module-local imports.
export {
  addTenantToRoomSchema,
  updateContractSchema,
  terminateContractSchema,
  listContractsQuery,
  type AddTenantToRoomInput,
  type UpdateContractInput,
} from '@ptas/contracts'
