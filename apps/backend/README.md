# Ptas168 Backend

API server for the **Ptas168 Property Management System** — a Telegram Mini App that manages buildings, rooms, tenants, leases, utilities, and invoices. Built with TypeScript, Express, Prisma, and PostgreSQL.

## Project structure

```
Ptas168_Backend/
├── prisma/
│   └── schema.prisma          Prisma data model (13 entities)
├── src/
│   ├── config/                env (Zod-validated) + pino logger
│   ├── lib/                   Prisma client (singleton + graceful shutdown)
│   ├── utils/                 errors, jwt, response adapters
│   ├── middleware/            auth, error handler, request logger, async handler, validate
│   ├── modules/<domain>/      controller / service / repository / routes / schema
│   ├── app.ts                 Express app builder (all routes mounted under /api)
│   └── server.ts              listen() + SIGTERM/SIGINT graceful shutdown
├── tests/
│   ├── setup.ts               test env defaults
│   └── modules/               Vitest + supertest specs
├── ecosystem.config.js        PM2 production config
├── tsconfig.json              ES2022, strict, NodeNext modules, @/* path alias
├── vitest.config.ts
├── package.json
└── .env.{example,development,production}
```

## Prerequisites

- **Node.js 20+** (matches the dev/prod runtime)
- **PostgreSQL 16+**
- **PM2** (production only): `npm i -g pm2`

## Database setup

### Development

```bash
createdb ptas168_dev
```

### Production

```bash
psql postgres -c "ALTER USER postgres WITH PASSWORD 'StrongP@ssw0rd!';"
psql postgres -c "CREATE DATABASE ptas168_prod OWNER postgres;"
```

The `@` in `StrongP@ssw0rd!` must be URL-encoded as `%40` inside the `DATABASE_URL` string.

## Local development

```bash
git clone …  Ptas168_Backend
cd Ptas168_Backend
npm install
cp .env.example .env.development
# Edit .env.development: set TELEGRAM_BOT_TOKEN (BotFather) and a unique JWT_SECRET
npm run prisma:migrate -- --name init
npm run dev
```

Dev server starts on `http://localhost:3000`. Verify with:

```
curl http://localhost:3000/api/health
```

## Production deployment (Mac Mini + PM2)

```bash
cd Ptas168_Backend
npm ci
npm run build
npm run prisma:deploy
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup            # one-time, run the suggested command as root
```

Logs land in `./logs/{out,err}.log`. Tail with `pm2 logs ptas168-api`.

## Telegram initData validation

Telegram Mini Apps deliver an `initData` query string the first time the WebApp boots. The backend verifies it before issuing a JWT:

1. Parse `initData` as `URLSearchParams`; pull out the `hash` field and remove it.
2. Build the **data-check string**: every remaining `key=value` pair, sorted alphabetically by key, joined by `\n`.
3. Compute `secret_key = HMAC-SHA256("WebAppData", bot_token)` (note: the *bot token* is the message, `"WebAppData"` is the key).
4. Compute `expected_hash = HMAC-SHA256(secret_key, data_check_string).hex()`.
5. Compare `expected_hash` to the received `hash` with `crypto.timingSafeEqual` (constant-time, prevents timing oracles).
6. Reject if `auth_date` is older than 24 hours.
7. Parse the `user` JSON, upsert by `telegramId`, and issue a JWT.

Implementation: [`src/modules/auth/telegram-validator.ts`](src/modules/auth/telegram-validator.ts).

## Frontend Contract

This backend was reverse-engineered from the local-only Zustand store at `Ptas168_Frontend/src/store/index.js` (the `src/api/` and `docs/API_CONTRACT.md` were not available — see "Decisions" below). Endpoint paths and payloads were inferred from action signatures and modal payload shapes. **Field names match the frontend store's expected shapes** so the frontend can talk to this backend without per-field renaming once the Vite proxy is restored.

### Auth

| Method · Path | Body | Response |
|---|---|---|
| `POST /api/auth/login` | `{ username, password }` | `{ token, user }` |
| `POST /api/auth/telegram` | `{ initData }` | `{ token, user }` |
| `POST /api/auth/logout` | — | `{ success: true }` |
| `GET /api/auth/me` | (auth) | `User` |
| `PATCH /api/auth/me` | `{ fullName?, phone?, profileImage? }` | `User` |
| `POST /api/auth/password` | `{ currentPassword, newPassword }` | `{ success: true }` |

`User` shape: `{ id, name, username, phone, profileImage, role, status, via, createdAt }`.

### Buildings

| Method · Path | Body | Response |
|---|---|---|
| `GET /api/buildings` | — | `Building[]` |
| `POST /api/buildings` | `{ name, remark? }` | `Building` |
| `PATCH /api/buildings/:id` | `{ name?, remark? }` | `Building` |
| `DELETE /api/buildings/:id` | — | `204` |

`Building`: `{ id, name, remark }`.

### Floors

| Method · Path | Body | Response |
|---|---|---|
| `GET /api/floors?buildingId=` | — | `Floor[]` |
| `POST /api/buildings/:buildingId/floors` | `{ name, remark? }` | `Floor` |
| `PATCH /api/floors/:id` | `{ name?, remark? }` | `Floor` |
| `DELETE /api/floors/:id` | — | `204` |

`Floor`: `{ id, buildingId, name, remark }`.

### Rooms

| Method · Path | Body | Response |
|---|---|---|
| `GET /api/rooms` | — | `Room[]` |
| `GET /api/rooms/:id` | — | `Room` |
| `POST /api/floors/:floorId/rooms` | `{ name, size?, pricePerMonth }` | `Room` |
| `PATCH /api/rooms/:id` | `{ name?, size?, pricePerMonth? }` | `Room` |
| `DELETE /api/rooms/:id` | — | `204` |

`Room`: `{ id, floorId, buildingId, name, size, price, active, occupied, tenantName, canStartBill, dayCounter, daysInMonth, dayCounterColor, floorName?, buildingName? }`. `occupied` and `tenantName` are derived from the active contract.

### Tenants

| Method · Path | Body | Response |
|---|---|---|
| `GET /api/tenants` | — | `Tenant[]` |
| `GET /api/tenants/lookup?phone=` | — | `Tenant \| null` |
| `POST /api/tenants` | `{ fullName, phone, profilePhotoUrl? }` | `Tenant` |
| `PATCH /api/tenants/:id` | `{ fullName?, phone?, profilePhotoUrl?, status? }` | `Tenant` |

`Tenant`: `{ id, name, phone, photo, status }`.

### Contracts

| Method · Path | Body | Response |
|---|---|---|
| `GET /api/contracts?roomId=&tenantId=&status=` | — | `Contract[]` |
| `POST /api/rooms/:roomId/contracts` | `{ phone, fullName?, moveInDate, endDate?, baseRent, securityDeposit }` | `Contract` |
| `PATCH /api/contracts/:id` | `{ baseRent?, securityDeposit?, endDate? }` | `Contract` |
| `POST /api/contracts/:id/terminate` | `{ reason? }` | `Contract` |

`Contract`: `{ id, roomId, tenantId, tenantName, tenantPhone, startDate, endDate, baseRent, securityDeposit, status, terminationReason, terminatedAt }`. Adding a tenant auto-assigns Water + Electricity room services.

### Room services

| Method · Path | Body | Response |
|---|---|---|
| `GET /api/rooms/:roomId/services` | — | `RoomService[]` |
| `PUT /api/rooms/:roomId/services` | `{ services: [{ serviceId, enabled, priceOverride? }] }` | `RoomService[]` |

`RoomService`: `{ id, roomId, serviceId, serviceName, serviceIcon, serviceType, unit, defaultRate, effectiveRate, priceOverride, enabled, assignedAt }`.

### Meter readings

| Method · Path | Body | Response |
|---|---|---|
| `GET /api/rooms/:roomId/meter-readings` | — | `MeterReading[]` |
| `GET /api/rooms/:roomId/meter-readings/latest` | — | `[{ serviceType, previousReading, currentReading, autoFilled, lastRecordDate }]` |
| `POST /api/rooms/:roomId/meter-readings` | `{ serviceType, recordDate, recordedByName, previousReading, currentReading }` | `MeterReading` |

### Invoices

| Method · Path | Body | Response |
|---|---|---|
| `GET /api/invoices?roomId=&tenantId=&status=` | — | `Invoice[]` |
| `GET /api/invoices/:id` | — | `Invoice` |
| `POST /api/invoices` | `{ roomId, billPeriodStart, billPeriodEnd, dueDateOffsetDays }` | `Invoice` |
| `POST /api/invoices/:id/pay` | `{ method: "Cash" \| "QR Transfer" }` | `Invoice` |
| `POST /api/invoices/:id/cancel` | `{ reason? }` | `Invoice` |

`Invoice`: see [`src/utils/adapters.ts → InvoiceDto`](src/utils/adapters.ts). Status `progress` past its dueDate is returned as `overdue` (derived).

### Service fees (master)

| Method · Path | Body | Response |
|---|---|---|
| `GET /api/service-fees` | — | `ServiceFee[]` |
| `POST /api/service-fees` | `{ name, icon, serviceType, defaultRate, unit }` | `ServiceFee` |
| `PATCH /api/service-fees/:id` | `{ name?, icon?, serviceType?, defaultRate?, unit? }` | `ServiceFee` |
| `DELETE /api/service-fees/:id` | — | `204` (403 for system Water/Electricity) |

### Settings

| Method · Path | Body | Response |
|---|---|---|
| `GET /api/settings` | — | `Record<string,string>` (key/value map) |
| `PATCH /api/settings` | `Record<string,string>` | full updated map |

Known keys: `KHR_EXCHANGE_RATE`, `INVOICE_HEADER_ENABLED`, `INVOICE_BIZ_NAME`, `INVOICE_TIN_NO`, `INVOICE_ADDRESS`, `INVOICE_BIZ_PHONE`, `INVOICE_NO_DIGITS`, `INVOICE_FOOTER_ENABLED`, `INVOICE_FOOTER_NOTE`.

### Sub-users

| Method · Path | Body | Response |
|---|---|---|
| `GET /api/users` | — | `User[]` |
| `POST /api/users` | `{ username, fullName, password, phone?, role, active }` | `User` |
| `PATCH /api/users/:id` | `{ fullName?, phone?, role?, active?, password? }` | `User` |
| `DELETE /api/users/:id` | — | `204` |

Restricted to roles `owner` or `manager`.

### Notifications

| Method · Path | Body | Response |
|---|---|---|
| `GET /api/notifications?size=&onlyUnread=` | — | `{ data: Notification[] }` |
| `POST /api/notifications/:id/read` | — | `{ success: true }` |
| `POST /api/notifications/read-all` | — | `{ success: true }` |
| `DELETE /api/notifications` | — | `204` |

### Health

| Method · Path | Response |
|---|---|
| `GET /api/health` | `{ status, timestamp, uptime }` |
| `GET /api/health/db` | `{ status, db, timestamp }` (503 on failure) |

## Frontend Integration Notes

The current `Ptas168_Frontend` is **local-only** (its `src/api/` and Vite proxy were stripped). To wire the frontend to this backend:

1. Restore the API client layer the frontend used to have, or rewrite the Zustand store to call this backend (each store action maps 1:1 to an endpoint above).
2. Add a dev proxy back to `Ptas168_Frontend/vite.config.js`:
   ```js
   server: {
     port: 5173,
     proxy: {
       '/api': { target: 'http://localhost:3000', changeOrigin: true },
     },
   },
   ```
3. Restore `Ptas168_Frontend/.env.example` with `BACKEND_URL=http://localhost:3000`.
4. The auth token should be stored as `localStorage.pbms_token` and sent as `Authorization: Bearer <token>` (matches the JWT issued by `POST /api/auth/login` and `/api/auth/telegram`).

## Testing

```bash
npm test
```

Tests use Vitest + supertest. Database access is mocked at the `src/lib/prisma` module boundary, so the full test suite runs without a live PostgreSQL.

Coverage includes:
- `telegram-validator` — happy path, hash mismatch, missing hash, expired auth_date, tampered field, wrong bot token
- `jwt utils` — sign/verify round-trip, tamper rejection, garbage rejection
- `auth.controller` — Telegram login → 200+token, `/me` 401 without token, `/me` 200 with token, login validation error
- `health` — `/api/health` 200, `/api/health/db` 200 with mocked Prisma
- `buildings` — list (auth required), create, strict-field rejection

The same pattern (mock `prisma`, sign a JWT, hit the endpoint with supertest) can be replicated for any other domain module.

## Decisions / known caveats

- The contract was derived from the frontend Zustand store rather than a contract document. Some endpoints (`/api/auth/login`, `/api/tenants/lookup`, `/api/contracts/:id/terminate`) are inferred and may differ from a future authoritative spec.
- `Cash` / `QR Transfer` are the only payment methods (`InvoicePaymentMethod` enum). The Prisma value `QRTransfer` is mapped back to `"QR Transfer"` in responses.
- The frontend stores the auth token in `localStorage` under `pbms_token` (a name preserved from prior code). The JWT itself contains `userId`, `role`, and (when applicable) `telegramId`.
- `Owner` role is created out-of-band (e.g. via a seed script or `prisma studio`); the `POST /api/users` endpoint creates manager/staff/viewer sub-users only.
