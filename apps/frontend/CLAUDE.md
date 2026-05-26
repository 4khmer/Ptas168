# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, port 5173)
npm run build     # Production build → /dist
npm run preview   # Preview production build
```

No test runner or linter is configured.

## Architecture

**Telegram Mini App** — React 18 SPA with a 430px max-width mobile viewport. All pages are functional components using hooks.

### State

All application state lives in a single Zustand store at [`src/store/index.js`](src/store/index.js). The store is **API-driven** — every CRUD action calls the backend at `/api/*` (Vite proxies to `BACKEND_URL`, default `http://localhost:3000`). The store caches successful responses so reads stay synchronous.

- API client lives in [`src/api/`](src/api/) — one module per domain (`auth.js`, `buildings.js`, …) plus the shared [`client.js`](src/api/client.js) which handles `Authorization: Bearer <token>`, JSON parsing, and 401 auto-logout
- JWT is stored in `localStorage` under `pbms_token` (set via `setToken()` in `client.js`)
- Login flow: `loginWithCredentials` / `loginWithTelegram` → store token → `loadInitialData()` populates buildings/rooms/services/settings in parallel
- Invoice computation happens server-side; the frontend's [`src/api/invoices.js`](src/api/invoices.js) `adaptInvoice()` reshapes the flat backend DTO into the nested `tenantSnapshot/roomSnapshot/total/fixedServices` shape the UI expects
- Meter readings: backend stores one row per `(roomId, serviceType, recordDate)`; [`src/api/meterReadings.js`](src/api/meterReadings.js) groups them by `(date, recorder)` for the UI

Backend contract: see [`Ptas168_Backend/README.md`](../Ptas168_Backend/README.md). Override the dev proxy target by creating `.env.local` with `BACKEND_URL=http://localhost:3000`.

### Routing

[`src/App.jsx`](src/App.jsx) defines two layouts:
- `<AppLayout>` (bottom nav) wraps the four main tabs: Rooms, Tenants, Billing, More
- Detail/form pages render without the nav bar

Unauthenticated users are redirected to `/login` via a `useStore(s => s.isLoggedIn)` guard.

### Key utilities

| File | Purpose |
|---|---|
| `src/lib/billing.js` | Invoice calculations (rent, utilities, fixed services) |
| `src/lib/dayCounter.js` | Monthly billing cycle logic and DayRing coloring |
| `src/lib/telegram.js` | Telegram Mini App SDK helpers |

### Styling

Tailwind CSS with a custom palette defined in [`tailwind.config.js`](tailwind.config.js) and CSS variables in [`src/index.css`](src/index.css). Color tokens: `pr`, `pl`, `tx`, `su`, `bd`, `re`, `am`, `gr`, `info`. Icons via `lucide-react`.

### Component conventions

- Reusable UI primitives live in `src/components/ui/`
- Layout wrappers in `src/components/layout/`
- Modal dialogs for CRUD operations in `src/components/modals/`
- Page components in `src/pages/`
