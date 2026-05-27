import express, { type Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'

import { env } from './config/env'
import { requestLogger } from './middleware/request-logger'
import { errorHandler, notFoundHandler } from './middleware/error-handler'

import { authRouter } from './modules/auth/auth.routes'
import { healthRouter } from './modules/health/health.routes'
import { buildingsRouter } from './modules/buildings/buildings.routes'
import { buildingFloorsRouter, floorsRouter } from './modules/floors/floors.routes'
import { floorRoomsRouter, roomsRouter } from './modules/rooms/rooms.routes'
import { tenantsRouter } from './modules/tenants/tenants.routes'
import { contractsRouter, roomContractsRouter } from './modules/contracts/contracts.routes'
import { roomServicesRouter } from './modules/roomServices/roomServices.routes'
import { meterReadingsRouter } from './modules/meterReadings/meterReadings.routes'
import { invoicesRouter } from './modules/invoices/invoices.routes'
import { serviceFeesRouter } from './modules/serviceFees/serviceFees.routes'
import { settingsRouter } from './modules/settings/settings.routes'
import { usersRouter } from './modules/users/users.routes'
import { notificationsRouter } from './modules/notifications/notifications.routes'
import { bankPaymentsRouter } from './modules/bankPayments/bankPayments.routes'
import { telegramLinksRouter } from './modules/telegramLinks/telegramLinks.routes'
import { bankNotificationGroupsRouter } from './modules/bankNotificationGroups/bankNotificationGroups.routes'
import { uploadsRouter, UPLOAD_DIR_RESOLVED } from './modules/uploads/uploads.routes'

// Mount path for every router. Override via API_BASE_PATH when the
// backend is fronted by a reverse proxy that forwards a sub-path
// (e.g. nginx routing /ptas168/api/* → :3001 without stripping the prefix).
const API_BASE = env.API_BASE_PATH

export function buildApp(): Express {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(helmet())
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean),
      credentials: true,
    }),
  )
  app.use(compression())
  // 10MB so a typical phone photo (base64-encoded) fits with headroom.
  // The frontend downscales avatars / header logos before upload, so real
  // payloads are well under 1MB; the cap is just a safety ceiling.
  app.use(express.json({ limit: '10mb' }))
  app.use(requestLogger)

  // Health (also unauth-accessible at the root path for tunnel checks)
  app.use(`${API_BASE}/health`, healthRouter)

  // Auth
  app.use(`${API_BASE}/auth`, authRouter)

  // Property
  app.use(`${API_BASE}/buildings`, buildingsRouter)
  app.use(`${API_BASE}/buildings/:buildingId/floors`, buildingFloorsRouter)
  app.use(`${API_BASE}/floors`, floorsRouter)
  app.use(`${API_BASE}/floors/:floorId/rooms`, floorRoomsRouter)
  app.use(`${API_BASE}/rooms`, roomsRouter)
  app.use(`${API_BASE}/rooms/:roomId/services`, roomServicesRouter)
  app.use(`${API_BASE}/rooms/:roomId/meter-readings`, meterReadingsRouter)
  app.use(`${API_BASE}/rooms/:roomId/contracts`, roomContractsRouter)

  // Tenancy
  app.use(`${API_BASE}/tenants`, tenantsRouter)
  app.use(`${API_BASE}/contracts`, contractsRouter)

  // Billing
  app.use(`${API_BASE}/invoices`, invoicesRouter)
  app.use(`${API_BASE}/service-fees`, serviceFeesRouter)

  // Admin
  app.use(`${API_BASE}/settings`, settingsRouter)
  app.use(`${API_BASE}/users`, usersRouter)
  app.use(`${API_BASE}/notifications`, notificationsRouter)

  // Bank payments + Telegram bot infrastructure. The bot process itself
  // lives in apps/telegram-bot — Telegram webhooks no longer terminate
  // here; the backend only mints link codes for the Mini App.
  app.use(`${API_BASE}/bank-payments`, bankPaymentsRouter)
  app.use(`${API_BASE}/telegram-links`, telegramLinksRouter)
  app.use(`${API_BASE}/bank-notification-groups`, bankNotificationGroupsRouter)

  // File uploads — POST /api/uploads writes to disk and returns a URL.
  // In production Tomcat serves the files at FILE_URL_BASE; in dev we serve
  // them ourselves so the same URL works without a separate file server.
  app.use(`${API_BASE}/uploads`, uploadsRouter)
  if (env.NODE_ENV !== 'production') {
    app.use('/uploads', express.static(UPLOAD_DIR_RESOLVED))
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
