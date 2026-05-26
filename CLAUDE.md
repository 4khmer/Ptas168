# CLAUDE.md

This file is auto-loaded into Claude's context. Sub-app CLAUDE.md files are **not** auto-loaded — read them on demand when the work touches that app.

## Project

**PTAS168** — Property management system (originally a Telegram Mini App). Two private repos under the `4khmer` GitHub org, unified into this Turborepo monorepo.

## Layout

```
ptas168/
├── apps/
│   ├── backend/                    Express + TypeScript + Prisma 5 + PostgreSQL
│   │   └── CLAUDE.md               READ THIS before touching backend code
│   └── frontend/                   Vite + React 18 + Zustand (plain JS, not TS)
│       └── CLAUDE.md               READ THIS before touching frontend code
├── packages/
│   └── contracts/                  @ptas/contracts — shared Zod schemas + TS types
│                                   (Phase 3 in progress; only enums extracted so far)
├── infrastructure/
│   └── docker/
│       └── docker-compose.yml      Postgres 16 + Redis 7 for local dev
├── pnpm-workspace.yaml
├── turbo.json
├── MIGRATION_ANALYSIS.md           Phase 1+2 report; §7 lists Phase 3 sequencing
└── package.json
```

Future packages from the migration plan: `validation`, `sdk`. Future apps may include BullMQ workers, Telegram bot service, AI assistant service.

## Commands you'll use most

```bash
pnpm db:up                          # start postgres + redis containers
pnpm db:down                        # stop them (data preserved)
pnpm db:reset                       # nuke volumes + restart
pnpm db:psql                        # psql shell into the docker DB
pnpm db:logs                        # follow container logs

pnpm dev:backend                    # api on http://localhost:3001
pnpm dev:frontend                   # vite on http://localhost:8080/Ptas168_Frontend/

# from apps/backend
pnpm prisma migrate dev --name <x>  # create + apply migration
pnpm prisma studio                  # http://localhost:5555
pnpm prisma:seed                    # bootstrap (admin user + system services + settings)
pnpm prisma:demo-seed               # full demo dataset (idempotent, all demo-* ids)
```

## Dev login

`admin` / `admin123` (seeded by `pnpm prisma:seed`).

## Environment

- pnpm 11.3 via Corepack (Node ≥ 20)
- `gh` CLI is installed and authenticated as `KheangZinII` — can clone 4khmer org private repos directly with `gh repo clone 4khmer/<name>`
- Docker Desktop required for the local DB stack
- Backend env in [apps/backend/.env.development](apps/backend/.env.development) and [apps/backend/.env](apps/backend/.env) (the bare `.env` exists only so the Prisma CLI can resolve `DATABASE_URL`; the running backend reads `.env.development`)

## Current state of the migration

| Phase | Status | Notes |
|---|---|---|
| 1. pnpm + Turborepo skeleton | ✅ | both apps build and dev-boot |
| 2. Codebase analysis | ✅ | [MIGRATION_ANALYSIS.md](MIGRATION_ANALYSIS.md) |
| 3. `packages/contracts` | 🟡 in progress | enums extracted ([packages/contracts/src/enums.ts](packages/contracts/src/enums.ts)); one backend usage swapped at [apps/backend/src/modules/serviceFees/serviceFees.schema.ts](apps/backend/src/modules/serviceFees/serviceFees.schema.ts); next per §7 of the analysis: `error.ts` then `BuildingDto` |
| 4. `packages/validation` | ⏳ | shared Zod schemas (backend = request validation, frontend = form validation; frontend has zero validation libs today) |
| 5. `packages/sdk` | ⏳ | wraps backend API; future home for frontend adapters (`adaptInvoice`, `groupMeterReadings`, `parseInvoiceSettings`) |

## Hard constraints (from the user, repeat on every phase)

- **Do not** break either app
- **Do not** rewrite business logic
- **Do not** change Prisma schema unnecessarily
- Every phase must keep both apps runnable; migration is **incremental and reversible**

## Never confuse frontend with backend

This is a monorepo with two very different apps. Before editing code, **always know which app you're in.** When a request is ambiguous (e.g., "fix the invoice bug", "add validation to rooms"), state the assumption explicitly and confirm before changing anything.

### At-a-glance contrast

|  | `apps/backend` | `apps/frontend` |
|---|---|---|
| Language | **TypeScript** (strict) | **JavaScript** (no TS — `.js`/`.jsx`) |
| Module system | CommonJS (`"type": "commonjs"`) | ESM (`"type": "module"`) |
| Runtime | Node ≥ 20 (`tsx watch` / `node dist/server.js`) | Browser via Vite (`vite`) |
| Stack | Express 4, Prisma 5, Zod, pino, jsonwebtoken, bcryptjs | React 18, Zustand, react-router-dom, Tailwind, lucide-react |
| Persistence | PostgreSQL via Prisma | `localStorage` (`pbms_token`, `pbms_lang`) + Zustand in-memory |
| Port | `:3001` | `:8080` (Vite, base path `/Ptas168_Frontend/`) |
| Entry | [src/server.ts](apps/backend/src/server.ts) | [src/main.jsx](apps/frontend/src/main.jsx) |
| Build | `tsc → dist/` | `vite build → dist/` |

### Where each concept lives — never mix these up

| Concept | Lives **only** in |
|---|---|
| Prisma schema, migrations, seeds | `apps/backend/prisma/` |
| `@prisma/client`, DB queries | `apps/backend/src/modules/<domain>/<domain>.repository.ts` |
| Route handlers, controllers, services | `apps/backend/src/modules/<domain>/` |
| Zod schemas (today) | `apps/backend/src/modules/<domain>/<domain>.schema.ts` — frontend has zero validation libs |
| JWT signing / `Bearer` verification | `apps/backend/src/utils/jwt.ts` + middleware |
| Express middleware, async handlers | `apps/backend/src/middleware/` |
| pino logging | `apps/backend` |
| **Prisma row → wire DTO** adapters | `apps/backend/src/utils/adapters.ts` |
| **Wire DTO → UI shape** adapters | `apps/frontend/src/api/*.js` (`adaptInvoice`, `groupMeterReadings`, `parseInvoiceSettings`) |
| Zustand store | `apps/frontend/src/store/index.js` |
| Page components, modals, UI primitives | `apps/frontend/src/{pages,components}/` |
| Tailwind tokens, CSS variables | `apps/frontend/tailwind.config.js`, `apps/frontend/src/index.css` |
| `pbms_token` (JWT) read/write | `apps/frontend/src/api/client.js` |
| Vite config, dev proxy | `apps/frontend/vite.config.js` |

### Forbidden imports

- Files under `apps/frontend/` **never** import from `apps/backend/`
- Files under `apps/backend/` **never** import from `apps/frontend/`
- Both may import from `packages/*` (currently only `@ptas/contracts`)
- `packages/contracts` **never** imports from `apps/*` or any framework (Prisma, Express, React, …)

### Triple-shape entities — name the shape you mean

The same domain concept exists in three forms. Always say which:

| Shape | Where | Example field difference |
|---|---|---|
| **Prisma model** | `apps/backend/prisma/schema.prisma` | `Invoice.pricePerMonth`, `Tenant.photoUrl`, `Contract.startDate` |
| **Wire DTO** (read response) | what the backend returns from `/api/*`, built by `apps/backend/src/utils/adapters.ts` | `Room.price`, `Tenant.photo`, `Contract.startDate` (sometimes renamed) |
| **UI shape** | what the frontend Zustand store / pages consume after `adapt*` runs | `Invoice.tenantSnapshot/roomSnapshot`, `Invoice.total`, grouped meter readings |

A few entities also have a **write input shape** that differs from the read shape — see [MIGRATION_ANALYSIS.md §5](MIGRATION_ANALYSIS.md) (Tenants, Rooms, Contracts use `fullName`/`profilePhotoUrl`/`pricePerMonth`/`moveInDate` on write, but `name`/`photo`/`price`/`startDate` on read).

### When the request is ambiguous

If the user says "fix the Invoice bug" or "add validation to the room form" without specifying which side:

1. **State the assumption** ("I read this as a frontend issue because the symptom is in the UI — confirm?")
2. **Don't touch code yet** until they confirm or redirect
3. For data-flow bugs, **trace the call path** (frontend page → store action → api/*.js → backend route → repository → DB) and identify *where* the problem is before deciding *what* to change

### One real example — the Billing empty-list bug

Earlier this session, the user reported "Billing displays count but no data." The instinct could be to check backend (`/invoices/page` query). But the backend was fine: the bug was a stale `loading: true` flag in [apps/frontend/src/store/index.js](apps/frontend/src/store/index.js#L433) that `resetPagedInvoices` failed to clear. **Frontend bug, frontend fix.** Diagnosing meant first verifying the backend returned data (it did via curl), then driving the frontend with Playwright to find where the state diverged. Always confirm which side before patching.

## Codebase quirks worth knowing upfront

- **Asymmetric write/read shapes** on the wire — `POST /tenants` takes `fullName`/`profilePhotoUrl`, response returns `name`/`photo`. Similarly for rooms (`pricePerMonth` ↔ `price`) and contracts (`moveInDate` ↔ `startDate`). Documented in [MIGRATION_ANALYSIS.md §5](MIGRATION_ANALYSIS.md). Each entity in `packages/contracts` needs paired `*Input` (write) and `*Dto` (read) shapes.
- **Frontend adapters live in `apps/frontend/src/api/`** today (`adaptInvoice` in [invoices.js](apps/frontend/src/api/invoices.js), `groupMeterReadings` in [meterReadings.js](apps/frontend/src/api/meterReadings.js), `parseInvoiceSettings` in [settings.js](apps/frontend/src/api/settings.js)). These move to `packages/sdk` in Phase 5 — don't reimplement them in `contracts`.
- **`tsx watch`** picks up `.env` file changes too — the dev backend hot-reloads even on env edits, occasionally producing stuck `node` processes on port 3001 (`pkill -f tsx` to clear).
- **Vite dev base path is `/Ptas168_Frontend/`** — anything that hardcodes `/` will break in dev.

## When in doubt

Read the relevant app's own `CLAUDE.md`:
- [apps/backend/CLAUDE.md](apps/backend/CLAUDE.md) — module pattern, adapters, JWT/auth flow, business rules
- [apps/frontend/CLAUDE.md](apps/frontend/CLAUDE.md) — Zustand store layout, routing, styling tokens

And [MIGRATION_ANALYSIS.md](MIGRATION_ANALYSIS.md) for everything the migration cares about.
