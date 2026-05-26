# PTAS168 Monorepo Migration — Phase 1+2 Report

**Date:** 2026-05-25
**Status:** Phase 1 complete, Phase 2 analysis complete. Ready for review before touching Phase 3 (contracts package).

---

## 0. Repository facts

| | |
|---|---|
| Monorepo root | `/Users/kilozin/Desktop/ptas` |
| Backend | [apps/backend/](apps/backend/) — `4khmer/Ptas168_Backend` @ `main`, TypeScript + Express + Prisma 5.22 + PostgreSQL, Node ≥20, originally npm |
| Frontend | [apps/frontend/](apps/frontend/) — `4khmer/Ptas168_Frontend` @ `main`, Vite 5 + React 18 + Zustand, **plain JavaScript** (`.js`/`.jsx`, not TS), originally npm |
| Package manager | pnpm 11.3.0 (via Corepack) |
| Build orchestrator | turbo 2.9.14 |

Both apps' `.git` directories preserved inside `apps/*` so they can still push/pull from their `4khmer` origin. No root `git init` yet — keeps the migration reversible.

---

## 1. Phase 1 — Monorepo skeleton

### Files created at root

| File | Purpose |
|---|---|
| [package.json](package.json) | Workspace root; defines `dev`/`build`/`test`/`lint` turbo passthroughs and `dev:backend`/`dev:frontend` filter shortcuts |
| [pnpm-workspace.yaml](pnpm-workspace.yaml) | Workspace globs (`apps/*`, `packages/*`) + `allowBuilds` for Prisma/esbuild postinstall scripts (required by pnpm 11.3) |
| [turbo.json](turbo.json) | Task graph: `build` depends on `^build`, `dev` is persistent/non-cached |
| [.npmrc](.npmrc) | `auto-install-peers=true`, `strict-peer-dependencies=false` |
| [.gitignore](.gitignore) | node_modules, .turbo, dist, env files, OS/editor cruft |

### Per-app changes

| App | Change | Why |
|---|---|---|
| [apps/backend/package.json](apps/backend/package.json) | Added `@types/express-serve-static-core@^4.19.5` as devDep | Backend's [src/middleware/auth.middleware.ts:5](apps/backend/src/middleware/auth.middleware.ts#L5) does `declare module 'express-serve-static-core'` to attach `req.user`. Under pnpm's symlinked layout, that module is a transitive type and TS can't resolve it without an explicit dep. **No source code changed.** |

Both `package-lock.json` files in `apps/*` were left in place (ignored by pnpm) so each app can still be deployed standalone via `npm install` if needed — this preserves reversibility.

### Verification

```text
✔ pnpm install                          → 600 packages resolved, no errors
✔ pnpm --filter ptas168-backend build   → tsc clean, dist/ produced
✔ pnpm --filter pbms-app build          → vite build clean, 2332 modules transformed
✔ backend pnpm dev                      → bound to http://localhost:3001 (env validated)
✔ frontend pnpm dev                     → vite served on http://localhost:8080/Ptas168_Frontend/
```

Neither dev server was run with a real DB or Telegram token — both booted to the point of listening, which is as far as a smoke check can go without secrets/Postgres.

### Caveats worth flagging

- **Port mismatch in docs.** [apps/backend/README.md](apps/backend/README.md) and [apps/backend/CLAUDE.md](apps/backend/CLAUDE.md) say the dev server runs on `:3000`, but [apps/backend/.env.development](apps/backend/.env.development) sets `PORT=3001` and [apps/frontend/.env.example](apps/frontend/.env.example) targets `:3001`. Frontend wins (`:3001` is the source of truth in practice). Docs should be updated later — not touched in this phase.
- **Frontend base path.** [vite.config.js](apps/frontend/vite.config.js) serves under `/Ptas168_Frontend/` (default `BASE_URL`). Worth deciding whether the monorepo should pin this to `/` or keep it.
- **Frontend is plain JS.** TypeScript-shared contracts will be consumable but not type-checked at frontend use sites without first adding `// @ts-check` or migrating files to `.ts`/`.tsx`. The user's prompt didn't ask for a TS migration of the frontend — recommend deferring.

---

## 2. Phase 2 — Backend module inventory (summary)

The full per-module breakdown (routes, Zod schemas, controller-returned DTOs) is **not duplicated here** to keep this report readable; it was produced during exploration and is reproducible by re-running the same agent. The high-altitude facts you need to make Phase 3 decisions:

### Module count

15 domain modules under [apps/backend/src/modules/](apps/backend/src/modules/):

`auth`, `buildings`, `floors`, `rooms`, `tenants`, `contracts`, `roomServices`, `meterReadings`, `invoices`, `serviceFees`, `settings`, `users` (sub-users, owner/manager only), `notifications`, `bankPayments` (read-only, Telegram-fed), `telegramLinks`, `bankNotificationGroups`, `telegramBot` (webhook), `health`, `uploads`.

Every domain follows the documented 5-file pattern: `.routes.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `.schema.ts`. **No deviations.**

### Zod schemas

Every domain has `.schema.ts` with `.strict()` Zod schemas for request bodies/queries. **All schemas live in the backend today.** Total schema count: ~30 (create + update + list-query per domain + a few special ones like `payInvoiceSchema`, `terminateContractSchema`).

These are the primary candidates for `packages/validation`.

### DTOs

All response shapes are constructed by adapter functions in **one file**: [apps/backend/src/utils/adapters.ts](apps/backend/src/utils/adapters.ts). 12 named adapter functions map Prisma rows → frontend-shaped DTOs:

`toBuildingDto`, `toFloorDto`, `toRoomDto`, `toTenantDto`, `toContractDto`, `toServiceFeeDto`, `toRoomServiceDto`, `toMeterReadingDto`, `toInvoiceDto`, `toNotificationDto`, `toUserDto`, `toBankPaymentDto`.

The DTO interfaces are co-located with the adapters in the same file — **they're the canonical source of API response shapes.** These are the primary candidates for `packages/contracts`.

### Prisma schema

[apps/backend/prisma/schema.prisma](apps/backend/prisma/schema.prisma) defines **16 models and 10 enums**. Models: `User`, `Building`, `Floor`, `Room`, `Tenant`, `Contract`, `ServiceFee`, `RoomService`, `MeterReading`, `Invoice`, `InvoiceLineItem`, `Notification`, `Setting`, `BankPayment`, `TelegramLink`, `BankNotificationGroup`. Enums (`UserRole`, `ServiceType`, `InvoiceStatus`, `LineItemType`, `NotificationType`, etc.) are the easiest first extract — they're plain string unions with no logic.

### Error contract

[apps/backend/src/middleware/error-handler.ts](apps/backend/src/middleware/error-handler.ts) emits a uniform body for every error:

```ts
{ error: { code: string, message: string, details?: unknown, stack?: string } }
```

Error codes are stable strings: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `DB_ERROR`. Worth a typed export.

### Auth contract

JWT payload (from [apps/backend/src/utils/jwt.ts](apps/backend/src/utils/jwt.ts)):

```ts
{ userId: string, role: 'owner'|'manager'|'staff'|'viewer', telegramId?: string }
```

`req.user` is augmented with this shape via the module declaration in [auth.middleware.ts:5](apps/backend/src/middleware/auth.middleware.ts#L5).

---

## 3. Phase 2 — Frontend API inventory (summary)

### API client modules

15 files in [apps/frontend/src/api/](apps/frontend/src/api/), one per backend domain:
`auth`, `buildings`, `floors`, `rooms`, `tenants`, `contracts`, `roomServices`, `meterReadings`, `invoices`, `serviceFees`, `settings`, `users`, `bankPayments`, `telegramLinks`, `bankNotificationGroups`, `uploads` (plus the shared [client.js](apps/frontend/src/api/client.js)).

[client.js](apps/frontend/src/api/client.js) is the single HTTP layer: reads `pbms_token` from localStorage, sets `Authorization: Bearer`, parses JSON, throws an `Error` with `.status/.code/.details` on non-2xx, and auto-clears the token on 401. **Every domain module is a thin wrapper around `api.get/post/patch/put/delete`.**

### Store

One Zustand store at [apps/frontend/src/store/index.js](apps/frontend/src/store/index.js). All API calls flow through store actions except **uploads**, which are called directly from [InvoiceSetup.jsx](apps/frontend/src/pages/InvoiceSetup.jsx) and [Profile.jsx](apps/frontend/src/pages/Profile.jsx) (the upload URL is returned to local state and only the eventual URL goes through a store action).

This means the SDK migration in Phase 5 has a **clean target**: replace `import { *Api } from '../api/*'` with `import { *Api } from '@ptas/sdk'` in the store and the two upload sites. No widespread `fetch(` calls to chase.

### Frontend-side adapters (the awkward bits)

These reshape backend wire formats into UI-friendly shapes and live in the frontend today:

| Adapter | File | Backend wire shape | Frontend UI shape |
|---|---|---|---|
| `adaptInvoice` | [api/invoices.js](apps/frontend/src/api/invoices.js) | Flat: `tenantName/roomName/buildingName/floorName/totalAmount`, line items with `lineItemType` enum | Nested: `tenantSnapshot.{name,phone}`, `roomSnapshot.{name,building,floor}`, `total`, derived `waterPrev/Current/Rate`, `elecPrev/Current/Rate`, `fixedServices:[]` |
| `groupMeterReadings` | [api/meterReadings.js](apps/frontend/src/api/meterReadings.js) | One row per `(roomId, serviceType, recordDate)` | Grouped by `(date, recorder)` into `{ date, recorder, waterPrev, waterCurrent, elecPrev, elecCurrent }` |
| `parseInvoiceSettings` | [api/settings.js](apps/frontend/src/api/settings.js) | Flat `Record<string,string>` map (`INVOICE_HEADER_ENABLED`, `INVOICE_BIZ_NAME`, …) | Nested `{ header, body, footer, qr }` object |
| In-place in `serviceFees.js` | [api/serviceFees.js](apps/frontend/src/api/serviceFees.js) | `unit: 'mo'` | `unitLabel: '$/mo'` (prepends `$/`, strips on send) |
| In-place in `users.js` | [api/users.js](apps/frontend/src/api/users.js) | `fullName`, `active: boolean` | `name`, `status: 'active'\|'inactive'` |

**These adapters are critical for Phase 5 SDK design — see §5 below.**

### Validation

**Frontend uses zero validation libraries.** No Zod, no Yup, no react-hook-form. Modal forms hand-roll synchronous `errors` state. This means Phase 4 (validation layer) can extract backend Zod schemas to a shared package and the frontend can adopt them **as new code** — there's nothing to migrate away from on the frontend side.

### Env vars

- `VITE_API_URL` — read in [api/client.js](apps/frontend/src/api/client.js) and [api/uploads.js](apps/frontend/src/api/uploads.js); defaults to `/api` (Vite proxy)
- `BACKEND_URL` — read in [vite.config.js](apps/frontend/vite.config.js); defaults to `http://localhost:3001`
- `import.meta.env.BASE_URL` — used for router basename

### localStorage keys

- `pbms_token` — JWT
- `pbms_lang` — language preference

---

## 4. Cross-reference — Duplicated DTOs (Phase 3 extract candidates)

These DTO shapes appear effectively duplicated between the backend adapter file and the frontend's implicit usage. **All of them are safe to extract to `packages/contracts` as types + (where appropriate) Zod schemas.** Listed in approximately the order they should be extracted (easiest first):

| Priority | Type | Backend source | Frontend uses |
|---|---|---|---|
| 1 | **Prisma enums** as string unions: `UserRole`, `UserStatus`, `AuthVia`, `TenantStatus`, `ContractStatus`, `ServiceType`, `InvoiceStatus`, `InvoicePaymentMethod`, `LineItemType`, `NotificationType` | [prisma/schema.prisma](apps/backend/prisma/schema.prisma) | Compared as string literals in store/UI | Pure types, zero risk |
| 2 | **Error envelope** `{ error: { code, message, details?, stack? } }` and code-string union | [src/middleware/error-handler.ts](apps/backend/src/middleware/error-handler.ts), [src/utils/errors.ts](apps/backend/src/utils/errors.ts) | Surfaced as thrown `Error` w/ `.status/.code/.details` in [api/client.js](apps/frontend/src/api/client.js) | Trivial extract |
| 3 | **JwtPayload** `{ userId, role, telegramId? }` | [src/utils/jwt.ts](apps/backend/src/utils/jwt.ts) | Not used directly on frontend (opaque token) | Backend-only initially; export anyway |
| 4 | **`BuildingDto`** `{ id, name, remark }` | adapters.ts | api/buildings.js, store `buildings` slice | Simple, symmetric |
| 5 | **`FloorDto`** `{ id, buildingId, name, remark }` | adapters.ts | api/floors.js, store `floors` slice | Simple, symmetric |
| 6 | **`UserDto`** `{ id, name, username, phone, profileImage, role, status, via, createdAt }` | adapters.ts | api/auth.js, api/users.js | See §5 — **asymmetric** for sub-user create |
| 7 | **`TenantDto`** `{ id, name, phone, photo, status, documents }` + **`TenantDocumentDto`** | adapters.ts | api/tenants.js, store `tenants` slice | See §5 — **asymmetric** for create (`profilePhotoUrl` → `photo`) |
| 8 | **`RoomDto`** + **`RoomAssetDto`** | adapters.ts | api/rooms.js, store `rooms` slice | See §5 — **asymmetric** for create (`pricePerMonth` → `price`) |
| 9 | **`ContractDto`** | adapters.ts | api/contracts.js, store `contracts` slice | See §5 — **asymmetric** for create (`moveInDate` → `startDate`) |
| 10 | **`ServiceFeeDto`**, **`RoomServiceDto`** | adapters.ts | api/serviceFees.js, api/roomServices.js | See §5 — `unit` ↔ `unitLabel` re-prefix |
| 11 | **`MeterReadingDto`** (flat) + UI-grouped `GroupedMeterReadingDto` | adapters.ts + frontend `groupMeterReadings` | api/meterReadings.js | Both shapes need to live in contracts |
| 12 | **`InvoiceDto` flat + `InvoiceUi` nested** + `InvoiceLineItemDto` | adapters.ts + frontend `adaptInvoice` | api/invoices.js | Both shapes need to live in contracts; the adapter belongs in SDK |
| 13 | **`NotificationDto`** | adapters.ts | (Notifications appear loaded but no API module file present — store-only? worth verifying when Phase 3 starts) | Easy extract |
| 14 | **`BankPaymentDto`** | adapters.ts | api/bankPayments.js | Easy extract |
| 15 | **Settings flat map keys** as a typed union; nested `InvoiceSettings` UI shape | settings.repository.ts + frontend `parseInvoiceSettings` | api/settings.js | Both shapes in contracts; parser belongs in SDK |
| 16 | **Pagination wrapper** `{ items, total, page, pageSize, hasMore }` for `/invoices/page` | invoices.controller.ts | api/invoices.js | Generic type; share |
| 17 | **TelegramLink / BankNotificationGroup** small DTOs and `/code` response `{ code, expiresAt }` | telegramLinks/bankNotificationGroups controllers | api/telegramLinks.js, api/bankNotificationGroups.js | Easy extract |

**Suggested layout for `packages/contracts`:**

```
packages/contracts/src/
  enums.ts              # Prisma enums as string unions + Zod
  error.ts              # ErrorEnvelope, ErrorCode union
  auth.ts               # JwtPayload, AuthResponse, login schemas
  building.ts           # BuildingDto, CreateBuildingInput, UpdateBuildingInput
  floor.ts
  room.ts
  tenant.ts
  contract.ts
  service-fee.ts
  room-service.ts
  meter-reading.ts      # Both flat and grouped shapes
  invoice.ts            # Both flat (wire) and nested (UI) shapes
  notification.ts
  bank-payment.ts
  telegram-link.ts
  settings.ts           # SettingsKey union + InvoiceSettings nested
  pagination.ts         # generic Page<T>
  index.ts
```

Rules already specified by the user — restating for the record: **contracts must be pure types + Zod, no logic, no Prisma imports, no Express imports, no React imports.**

---

## 5. Cross-reference — Contract mismatches & asymmetric shapes

These are **deliberate by the backend** but they're the trickiest part of the contracts extract because a naïve `Tenant` type doesn't fit both ends.

### Pattern: write payload uses different field names than read response

Verified in source (not just inferred from the inventory):

| Domain | Endpoint | Request field | Response field | Verified at |
|---|---|---|---|---|
| Rooms | `POST /floors/:id/rooms` | `pricePerMonth: number` | `price: number` | [adapters.ts:85](apps/backend/src/utils/adapters.ts#L85), [api/rooms.js:6-11](apps/frontend/src/api/rooms.js#L6) |
| Tenants | `POST /tenants`, `PATCH /tenants/:id` | `profilePhotoUrl: string\|null` | `photo: string\|null` | [adapters.ts:118-124](apps/backend/src/utils/adapters.ts#L118), [api/tenants.js:7-11](apps/frontend/src/api/tenants.js#L7) |
| Tenants | (same) | `fullName: string` | `name: string` | (same) |
| Contracts | `POST /rooms/:roomId/contracts` | `moveInDate: string` | `startDate: string` | [adapters.ts:136-152](apps/backend/src/utils/adapters.ts#L136) |
| Sub-users | `POST /users`, `PATCH /users/:id` | `active: boolean`, `fullName` | `status: 'active'\|'inactive'`, `name` | adapters.ts + api/users.js |
| Service fees | `POST /service-fees`, `PATCH …` | `unit: 'mo'` | `unit: 'mo'` + frontend reassembles `unitLabel: '$/mo'` | api/serviceFees.js (in-place) |

**Implication for `packages/contracts`:**

Each affected entity needs **three** related types/schemas:

```ts
// Example: tenant.ts
export const CreateTenantInput = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().min(3).max(40),
  profilePhotoUrl: z.string().nullable().optional(),
})
export type CreateTenantInput = z.infer<typeof CreateTenantInput>

export const UpdateTenantInput = CreateTenantInput.partial().extend({ ... })
export type UpdateTenantInput = z.infer<typeof UpdateTenantInput>

export interface TenantDto {                // <-- response shape (read)
  id: string
  name: string         // NB: fullName on the wire → name in the response
  phone: string
  photo: string | null // NB: photoUrl in DB → photo in response
  status: 'active' | 'inactive'
  documents: TenantDocumentDto[]
}
```

The SDK in Phase 5 will be the place where create() takes `CreateTenantInput` (camelCase write shape) and returns a `TenantDto` (read shape). No translation in either app's code — the wire shape and the DTO shape are both defined upfront.

### Pattern: backend wire shape vs. frontend UI shape both legitimate

These aren't bugs — they're an explicit "the backend speaks one language, the UI thinks in another." Both shapes need to live in contracts; the **adapter belongs in the SDK** so the frontend just sees the UI shape.

| Domain | Wire (from backend) | UI (after adapter) | Adapter today |
|---|---|---|---|
| Invoices | Flat: `{ tenantName, roomName, buildingName, floorName, totalAmount, lineItems:[{lineItemType,…}] }` | Nested: `{ tenantSnapshot, roomSnapshot, total, waterPrev/Current/Rate, elecPrev/Current/Rate, fixedServices:[], lineItems }` | `adaptInvoice` in [api/invoices.js](apps/frontend/src/api/invoices.js) |
| Meter readings | One row per `(roomId, serviceType, date)` | `{ date, recorder, waterPrev, waterCurrent, elecPrev, elecCurrent }` rows | `groupMeterReadings` in [api/meterReadings.js](apps/frontend/src/api/meterReadings.js) |
| Settings | Flat `Record<string,string>` | Nested `{ header, body, footer, qr }` | `parseInvoiceSettings` in [api/settings.js](apps/frontend/src/api/settings.js) |

### Pattern: enum casing inconsistencies

Worth knowing:

- **Notification types**: stored uppercase in Prisma (`OVERDUE_INVOICE`, `PAYMENT_RECEIVED`), **lowercased by the adapter** in the response (`overdue_invoice`, `payment_received`).
- **ServiceType**: uppercase on the wire in both directions (`WATER`, `ELECTRICITY`, `FIXED`).
- **InvoicePaymentMethod**: stored `Cash | QRTransfer`, but the frontend `adaptInvoice` re-emits as `'Cash' | 'QR Transfer'` (with the space). Worth confirming during Phase 3 schema authoring.

### Pattern: derived-on-read fields

These aren't persisted in the DB; they're computed in adapters:

- `InvoiceDto.status` is `'progress'|'paid'|'cancelled'` in the DB; the adapter derives `'overdue'` when `status === 'progress' && dueDate < now` ([CLAUDE.md](apps/backend/CLAUDE.md) confirms).
- `RoomDto.occupied`, `tenantName`, `canStartBill`, `dayCounter`, `daysInMonth`, `dayCounterColor` are all derived in `toRoomDto` from joined data.

These should be **read-only** in the contracts package — never on a write schema.

### Pattern: known stale-doc items

- README says backend on `:3000`; reality is `:3001` (see §1 caveats).
- [CLAUDE.md](apps/backend/CLAUDE.md) module table doesn't list `bank-payments`, `telegram-links`, `bank-notification-groups`, `telegram-bot`, `uploads`. The agent inventory confirmed they exist in code.

Both are documentation drift, not contract drift. Out of scope for this migration.

---

## 6. Risk register & open questions before Phase 3

Logged as items the user should look at before authoring contracts:

1. **`InvoiceLineItem.lineItemType` literal: `FIXED_SERVICE` or `FIXED`?** Backend Prisma enum is `LineItemType { RENT, WATER, ELECTRICITY, FIXED_SERVICE }`, but the `adaptInvoice` frontend grouper keys off `'FIXED_SERVICE'`. **Worth a quick confirm — if the adapter ever sees just `'FIXED'`, fixed services will silently fall off invoices.**
2. **Service fee `serviceType` vs UI `type`.** Backend exposes both `serviceType: 'WATER'|'ELECTRICITY'|'FIXED'` and `type: 'utility'|'fixed'` on `ServiceFeeDto` (the adapter computes `type`). Two-way mapping must be preserved when extracting.
3. **Pagination response shape mismatch.** Backend report describes `/invoices/page` as returning `{ items, total, page }`; frontend report describes it as `{ items, total, page, pageSize, hasMore }`. Both could be true (extra fields ignored on frontend), but worth confirming in [invoices.controller.ts](apps/backend/src/modules/invoices/invoices.controller.ts) before authoring the `Page<T>` contract.
4. **Notification module — is there a frontend API file?** Frontend inventory didn't list `api/notifications.js`. Either it's accessed only via store directly using `api.get('/notifications')`, or the agent missed it. Verify before claiming the contract is "fully covered."
5. **Frontend stays JS.** Without TS in apps/frontend, the contracts package gives compile-time safety only at backend use sites. The frontend will get **runtime** safety from Zod parsing, plus editor IntelliSense via JSDoc/`// @ts-check` if you opt in per file. **Recommend not migrating the frontend to TS as part of this migration** — too big a scope blowup; do it separately after contracts/sdk land.
6. **Telegram bot module untouched.** The `telegramBot/webhook` route is private (HMAC-secret-token authenticated, no JWT). Its payload schemas are internal to the backend. Do not extract them.
7. **Asymmetric write/read shapes** (see §5) are the highest-thought area of the contracts design. Recommend Phase 3 starts with `building`/`floor` (simple, symmetric) to validate the package layout, then tackles `tenant`/`room`/`contract` with the explicit `*Input` + `*Dto` split, then finishes with `invoice`/`meter-reading`/`settings` where adapters need a designated home (vote: in `packages/sdk`, not in contracts).

---

## 7. Recommended Phase 3 sequencing

1. Scaffold [packages/contracts/](packages/contracts/) with `tsconfig.json`, `package.json` (`@ptas/contracts`, ESM), `src/index.ts`. Wire as a workspace dep of both apps.
2. Extract enums (zero-risk, no downstream usage to wire up).
3. Extract `ErrorEnvelope` + error code union; import into [src/middleware/error-handler.ts](apps/backend/src/middleware/error-handler.ts) and [api/client.js](apps/frontend/src/api/client.js) (via JSDoc).
4. Extract `BuildingDto`, `FloorDto`, their create/update inputs. Import in backend's `buildings.schema.ts` and adapter; verify backend builds.
5. Extract one of the **asymmetric** entities (recommend `Tenant`) end-to-end to validate the `*Input` + `*Dto` pattern. Verify backend builds and existing tests pass.
6. Repeat for the remaining domains, leaving `Invoice` for last (it's the most complex due to the flat ↔ nested adapter).
7. After each domain extract, run `pnpm --filter ptas168-backend build` and `pnpm --filter ptas168-backend test` to keep the safety net green.

---

**End of Phase 1+2 report. Per the user's stop-for-review instruction, no Phase 3 work has been started.**
