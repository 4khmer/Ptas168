// Single SDK instance, wired to the browser's localStorage for the JWT.
// All callers (Zustand store, pages) import their api/* objects + adapters
// from this file. The HTTP client, per-domain wrappers, and adapters all
// live in @ptas/sdk; this file is the consumer-side init + named exports.
import { createSdk } from '@ptas/sdk'

const TOKEN_KEY = 'pbms_token'

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else       localStorage.removeItem(TOKEN_KEY)
  } catch { /* noop */ }
}

const sdk = createSdk({
  baseUrl: import.meta.env.VITE_API_URL ?? '/api',
  getToken,
  setToken,
})

// Named exports that match the legacy api/<x>.js exports — the Zustand
// store and pages keep their existing import shapes.
export const authApi                   = sdk.auth
export const buildingsApi              = sdk.buildings
export const floorsApi                 = sdk.floors
export const roomsApi                  = sdk.rooms
export const tenantsApi                = sdk.tenants
export const contractsApi              = sdk.contracts
export const roomServicesApi           = sdk.roomServices
export const meterReadingsApi          = sdk.meterReadings
export const invoicesApi               = sdk.invoices
export const serviceFeesApi            = sdk.serviceFees
export const settingsApi               = sdk.settings
export const usersApi                  = sdk.users
export const notificationsApi          = sdk.notifications
export const bankPaymentsApi           = sdk.bankPayments
export const telegramLinksApi          = sdk.telegramLinks
export const bankNotificationGroupsApi = sdk.bankNotificationGroups
export const uploadsApi                = sdk.uploads

// Adapters (moved out of api/* into @ptas/sdk)
export { adaptInvoice, groupMeterReadings, parseInvoiceSettings } from '@ptas/sdk'

// Token helpers — a couple of legacy sites import these directly.
export { getToken, setToken }

export { sdk }
