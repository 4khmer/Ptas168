import { createHttpClient, type HttpClient, type HttpClientConfig } from './http/client.js'
import { createAuthApi, type AuthApi } from './api/auth.js'
import { createBuildingsApi, type BuildingsApi } from './api/buildings.js'
import { createFloorsApi, type FloorsApi } from './api/floors.js'
import { createRoomsApi, type RoomsApi } from './api/rooms.js'
import { createTenantsApi, type TenantsApi } from './api/tenants.js'
import { createContractsApi, type ContractsApi } from './api/contracts.js'
import { createRoomServicesApi, type RoomServicesApi } from './api/room-services.js'
import { createMeterReadingsApi, type MeterReadingsApi } from './api/meter-readings.js'
import { createInvoicesApi, type InvoicesApi } from './api/invoices.js'
import { createServiceFeesApi, type ServiceFeesApi } from './api/service-fees.js'
import { createSettingsApi, type SettingsApi } from './api/settings.js'
import { createUsersApi, type UsersApi } from './api/users.js'
import { createNotificationsApi, type NotificationsApi } from './api/notifications.js'
import { createBankPaymentsApi, type BankPaymentsApi } from './api/bank-payments.js'
import { createTelegramLinksApi, type TelegramLinksApi } from './api/telegram-links.js'
import { createBankNotificationGroupsApi, type BankNotificationGroupsApi } from './api/bank-notification-groups.js'
import { createUploadsApi, type UploadsApi } from './api/uploads.js'

export interface Sdk {
  http: HttpClient
  auth: AuthApi
  buildings: BuildingsApi
  floors: FloorsApi
  rooms: RoomsApi
  tenants: TenantsApi
  contracts: ContractsApi
  roomServices: RoomServicesApi
  meterReadings: MeterReadingsApi
  invoices: InvoicesApi
  serviceFees: ServiceFeesApi
  settings: SettingsApi
  users: UsersApi
  notifications: NotificationsApi
  bankPayments: BankPaymentsApi
  telegramLinks: TelegramLinksApi
  bankNotificationGroups: BankNotificationGroupsApi
  uploads: UploadsApi
}

// Build a fully-wired SDK from a single config object. The consumer owns
// token storage (DI) — the SDK never touches localStorage directly.
export function createSdk(config: HttpClientConfig): Sdk {
  const http = createHttpClient(config)
  return {
    http,
    auth: createAuthApi(http),
    buildings: createBuildingsApi(http),
    floors: createFloorsApi(http),
    rooms: createRoomsApi(http),
    tenants: createTenantsApi(http),
    contracts: createContractsApi(http),
    roomServices: createRoomServicesApi(http),
    meterReadings: createMeterReadingsApi(http),
    invoices: createInvoicesApi(http),
    serviceFees: createServiceFeesApi(http),
    settings: createSettingsApi(http),
    users: createUsersApi(http),
    notifications: createNotificationsApi(http),
    bankPayments: createBankPaymentsApi(http),
    telegramLinks: createTelegramLinksApi(http),
    bankNotificationGroups: createBankNotificationGroupsApi(http),
    uploads: createUploadsApi(http),
  }
}
