// HTTP client + error type
export {
  createHttpClient,
  type HttpClient,
  type HttpClientConfig,
  type TokenStore,
} from './http/client.js'
export { HttpError, parseHttpError } from './http/error.js'

// Wire→UI adapters (frontend's old api/* helpers, hoisted here)
export { adaptInvoice, type InvoiceUiDto } from './adapters/invoice.js'
export { groupMeterReadings, type GroupedMeterReading } from './adapters/meter-reading.js'
export { parseInvoiceSettings, type InvoiceSettings } from './adapters/settings.js'

// Per-domain API factories
export { createAuthApi, type AuthApi, type UpdateProfileArgs } from './api/auth.js'
export { createBuildingsApi, type BuildingsApi, type BuildingInput } from './api/buildings.js'
export { createFloorsApi, type FloorsApi, type FloorInput } from './api/floors.js'
export { createRoomsApi, type RoomsApi, type CreateRoomArgs, type UpdateRoomArgs } from './api/rooms.js'
export { createTenantsApi, type TenantsApi, type CreateTenantArgs, type UpdateTenantArgs } from './api/tenants.js'
export {
  createContractsApi, type ContractsApi,
  type ListContractsArgs, type AddTenantToRoomArgs, type UpdateContractArgs,
} from './api/contracts.js'
export { createRoomServicesApi, type RoomServicesApi, type RoomServiceInput } from './api/room-services.js'
export {
  createMeterReadingsApi, type MeterReadingsApi,
  type CreateMeterReadingArgs, type MeterReadingLatest,
} from './api/meter-readings.js'
export {
  createInvoicesApi, type InvoicesApi,
  type ListInvoicesArgs, type ListInvoicesPageArgs, type ListInvoicesCountsArgs,
  type CreateInvoiceArgs, type InvoicesPage,
} from './api/invoices.js'
export {
  createServiceFeesApi, type ServiceFeesApi,
  type CreateServiceFeeArgs, type UpdateServiceFeeArgs,
} from './api/service-fees.js'
export { createSettingsApi, type SettingsApi } from './api/settings.js'
export { createUsersApi, type UsersApi, type CreateSubUserArgs, type UpdateSubUserArgs } from './api/users.js'
export { createNotificationsApi, type NotificationsApi, type ListNotificationsArgs } from './api/notifications.js'
export { createBankPaymentsApi, type BankPaymentsApi } from './api/bank-payments.js'
export { createTelegramLinksApi, type TelegramLinksApi } from './api/telegram-links.js'
export { createBankNotificationGroupsApi, type BankNotificationGroupsApi } from './api/bank-notification-groups.js'
export { createUploadsApi, type UploadsApi, type UploadResponse } from './api/uploads.js'

// One-stop factory
export { createSdk, type Sdk } from './create-sdk.js'

// Re-export everything from contracts so consumers can do a single
// `import { CreateBuildingInput, BuildingDto, … } from '@ptas/sdk'`.
export * from '@ptas/contracts'
