# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**MotoManage Pro** — a management system for a motorcycle repair shop (clients, vehicles,
appointments, service orders with labor + parts, parts inventory with low-stock alerts, and
billing) for a **single workshop** (not a multi-tenant SaaS — each workshop runs its own
self-hosted instance, own SQLite database file, own machine/server).

Originally scaffolded by Blink (blink.new) with `@blinkdotnew/sdk` as the backend, then rebuilt on
Supabase (Postgres + Auth), then moved off Supabase entirely onto a small self-hosted
Express + SQLite server with no login — see "History" below.

## Commands

```bash
npm run dev              # runs the API server (:3001) + Vite dev server (:3000) together
npm run build             # vite build -> dist/ (plain static SPA build, no SSR)
npm run start             # node server/index.mjs — serves dist/ + the API (production)
npm run preview           # preview the production Vite build only (no API — use `start` instead)
npx tsc --noEmit          # type-check (fast, no dev server needed) — run this after any change
npm run lint:types        # same as above
npm run lint:js           # eslint
npm run lint:css          # stylelint --fix
npm run lint              # runs all three via `bun run` — bun is NOT installed in this env;
                           # run the three lint:* scripts individually with npm/npx instead
```

There is no test suite (no Jest/Vitest/Playwright config in the repo). Verification in this
project has been done via manual `npx tsc --noEmit` + ad-hoc Playwright scripts run from outside
the repo (not checked in).

## Domain model

- **clients** — customer records (`src/routes/_app/clientes/`).
- **vehicles** — motorcycles, always owned by a client (`client_id`); managed inline from the
  client detail page's "Veiculos" tab, not a standalone top-level route.
- **appointments** — scheduled visits (`src/routes/_app/agenda.tsx`), optionally linked to a
  client + vehicle.
- **service_orders** + **service_order_items** — the core entity. An order (OS) belongs to a
  client/vehicle and has a status (`open → in_progress/waiting_parts → completed → delivered`,
  or `cancelled`). Items are either `part` (decrements `parts.quantity` on add, restocks on
  delete) or `labor` (free-text line item). `service_orders.total` is a denormalized sum
  (items + `labor_cost` − `discount`) recalculated by `src/routes/_app/ordens-servico/$id.tsx`
  after every item/field mutation — it is not a generated column, so any new code path that
  changes items or labor_cost/discount must call the same recalculation.
- **parts** — inventory (`src/routes/_app/estoque.tsx`), `quantity <= min_quantity` is the
  low-stock signal used on the dashboard and in the estoque page's alert badge.
- **transactions** — billing ledger (`src/routes/_app/financeiro.tsx`), optionally linked to a
  `service_order_id` (the OS detail page's "Lancar no financeiro" button creates one).

## Architecture

### Small self-hosted backend — Express + SQLite, no login

`server/` is a plain Node/Express app (ESM, no TypeScript):
`server/schema.mjs` declares the 8 tables + their allowed columns, `server/db.mjs` opens
`better-sqlite3` at `data/motomanage.db` (path overridable via `DB_PATH`) and creates
tables/indexes idempotently on boot, `server/index.mjs` exposes a generic REST API per table
(`GET/POST /api/:table`, `GET/PATCH/DELETE /api/:table/:id`, `POST /api/:table/bulk`) validated
against a table-name allowlist, and in production also serves `dist/` with an SPA fallback.

There is **no authentication** — a single workshop uses this system, so the app opens straight
into the dashboard. If a deployment is ever exposed beyond the workshop's own network, put it
behind a VPN or the reverse proxy's own auth (see `docs/IMPLANTACAO.md`) rather than re-adding a
login screen.

`src/blink/client.ts` exports a `blink` object shaped like the original Blink SDK
(`blink.db.table(name).list/get/create/update/delete/createMany`) — a deliberate compatibility
shim kept across two backend swaps (Blink SDK → Supabase → this Express/SQLite server) so route
components never needed to change. It now calls `fetch('/api/...')` instead of Supabase. When
adding a new table, add it to `server/schema.mjs`'s `TABLES` map and, if it should be included in
the Configuracoes export/import backup feature, to `BACKUP_TABLES` in `client.ts`.

Tables are queried with `.list()` (no server-side filtering beyond `orderBy`) and filtered
client-side by foreign key (e.g. `items.filter((it) => it.service_order_id === id)`) — this
mirrors the original template's pattern and keeps `blink.db.table()`'s surface small. Fine at
single-workshop scale; revisit if a table grows large.

**Insert defaults**: `server/index.mjs`'s `buildInsertRow` only puts a column in the SQL `INSERT`
when the request body actually provides it (id and the `created_at`/`opened_at`/`updated_at`
timestamps are the exception — those get auto-filled when absent). This matters: explicitly
inserting `NULL` for a `NOT NULL DEFAULT x` column is a constraint violation in SQL regardless of
the column's default, so a column must be *omitted* from the statement, not sent as null, for
`server/schema.mjs`'s `default` clauses to apply.

### Adding/changing tables — edit `server/schema.mjs`, no manual migration step

Unlike the old Supabase setup (hand-run SQL in a web dashboard), schema changes are just code:
edit the `createSql`/`indexes`/`columns` for a table in `server/schema.mjs` and restart the
server — `CREATE TABLE IF NOT EXISTS`/`CREATE INDEX IF NOT EXISTS` run on every boot. Because
these are `IF NOT EXISTS`, changing an *existing* column's type/constraints on a database that
already has the old table requires a real migration (e.g. `ALTER TABLE` run once, or a version
check in `db.mjs`) — plain edits to `createSql` only affect brand-new databases.

### Routing gotcha: file-based layout routes need `<Outlet/>`

TanStack Router (file-based) treats a file (`clientes.tsx`) alongside a same-named folder
(`clientes/`) as a **parent layout** for everything inside that folder. If the parent component
doesn't render `<Outlet/>`, child routes silently never render (URL changes, content doesn't).
`src/routes/_app/clientes.tsx` and `src/routes/_app/ordens-servico.tsx` are thin
`() => <Outlet />` layouts; the actual list pages live at `.../index.tsx`. Keep this pattern in
mind before adding new nested routes under an existing page.

### Plain client-rendered SPA — no SSR

This used to run on TanStack Start (SSR + prerendering, for SEO/crawlers). That's gone: this is
an internal, no-login admin tool with no public/crawlable content, so it's a standard Vite +
React SPA — `index.html` + `src/main.tsx` mount `RouterProvider` into `#root`, and
`src/routes/__root.tsx` is just `() => <Outlet />`. Per-route `head()` meta configs still exist on
some routes but are inert (nothing renders `<HeadContent/>`) — the browser tab title is the
static one in `index.html`. `vite.config.ts` proxies `/api` to the Express server in dev
(`server.proxy`); in production the same Express process serves both `dist/` and `/api`, so
there's never a cross-origin call to worry about.

### WhatsApp reminders (`src/lib/whatsapp.ts`)

Not an API integration — just builds a `wa.me`/`api.whatsapp.com` deep link with
`encodeURIComponent`-escaped prefilled text and does `window.open`. No account, no cost, no
backend. Used for appointment reminders (agenda) and "your bike is ready" messages (OS detail).
Message text intentionally avoids most accented characters (repo convention, see below).

### Portfolio/demo build (`VITE_DEMO_MODE=true`, not deployed anywhere — repo is source-only)

This repo intentionally has no live deployment/CI (no GitHub Actions, no Pages, no Vercel) — it's
meant to stay a plain source repository. There is still a backend-free build mode, useful for
running the app locally without setting up the real server, or if a live demo is wanted again
later: `src/blink/localStore.ts` re-implements the same `list/get/create/update/delete/createMany`
surface on top of `localStorage`, and `src/blink/client.ts` picks it over the real
`fetch('/api/...')` client whenever `import.meta.env.VITE_DEMO_MODE === 'true'` (Vite bakes it in
at build time). `src/blink/demoSeed.ts` seeds realistic example data into that visitor's browser on
first load (`seedDemoDataIfNeeded()`, called from `src/main.tsx`) and never overwrites what they
create/edit afterwards; a "Restaurar dados de demonstracao" button in Configuracoes
(demo-mode-only) wipes and re-seeds it via `resetDemoData()`. A small "DEMO" badge renders next to
the workshop name (`AppSidebar`/`AppLayout`) whenever this mode is active, so it's never mistaken
for the real system:

```bash
VITE_DEMO_MODE=true npm run build && npm run preview
```

Two other things are gated the same way, dormant unless this mode (or a future static deployment)
needs them: `src/router.tsx` switches to `createHashHistory()` when `DEMO_MODE`, so the whole
route path lives after a `#` and a direct link or page refresh never 404s on a static host with no
server-side rewrite support; `vite.config.ts`'s `base` reads `VITE_BASE_PATH` (defaults to `/`), for
a host that serves from a subpath instead of a domain root. This mode is for demonstration only —
it is NOT what a real workshop deployment uses (that's the self-hosted Express+SQLite path above),
and data here never leaves the visitor's own browser.

### Workshop branding (`src/hooks/useWorkshopBranding.ts`, `workshop_settings` table)

Workshop name/logo live in their own `workshop_settings` table (no auth/user concept to hang them
off anymore), fetched with a plain query and rendered in the sidebar/mobile top bar.

### CSV client import (`src/lib/clientImport.ts`)

Auto-detects common Portuguese/English column headers (accent- and case-insensitive) via
`CLIENT_FIELDS`/`FIELD_ALIASES`, shows a mapping + preview before writing anything, then bulk
inserts via `blink.db.table(...).createMany()` (one `POST /api/clients/bulk` request instead of
one per CSV row). Deliberately does **not** support `.xlsx` — both browser-side Excel-parsing
libraries available on npm (`xlsx`/SheetJS, `exceljs`) carry known unpatched vulnerabilities or a
large added dependency surface; users are asked to export their spreadsheet to CSV first instead.

### Printing an OS / orcamento (`src/index.css`, `ordens-servico/$id.tsx`)

`window.print()` on the OS detail page. Tailwind's `print:` variant hides editable form controls
and shows plain-text equivalents instead; a global `@media print` block in `index.css` hides the
sidebar (`aside`) and mobile top bar so only the order content prints.

## Conventions

- Source strings mostly avoid accented Portuguese characters (`Configuracoes` not
  `Configurações`, `nao` not `não`) — a repo-wide style from the original scaffold, kept for
  consistency. New user-facing strings should generally follow suit unless already inconsistent
  nearby.
- `src/assets/hero.png` shows as permanently "modified" in `git status`/`git diff` — a pre-existing
  Git LFS quirk (the blob was committed as raw binary, not an LFS pointer, so the LFS clean filter
  keeps re-flagging it). It's cosmetic; don't try to "fix" it as part of unrelated work, and don't
  `git add` it by accident (`git add -A`/`git add .` will pick it up — stage files explicitly
  instead).
- Generic dependencies with no imports anywhere in `src/` have been deliberately removed
  (`date-fns`, `framer-motion`, `@react-three/*`, `@dnd-kit/core`, `react-hook-form`, `zod`,
  `react-hot-toast`, `react-responsive`, `@hookform/resolvers`). Before adding a "might need it
  later" dependency, check it's actually imported before it lands in `package.json`.
- `npm install` needs `--legacy-peer-deps` in this repo (`@tailwindcss/vite` wants Vite 5-7, the
  project pins Vite 8) — this is expected, not a sign something is broken.
- `data/` (the SQLite database file + its WAL/SHM sidecar files) is gitignored — it's this
  workshop's live data, never shared/committed.
- Google Calendar sync (present in the original dental-clinic template this was converted from)
  was intentionally dropped as out-of-scope for the initial conversion — appointments are
  workshop-local only. Re-add via `src/lib/googleCalendar.ts`-style client-only OAuth (Google
  Identity Services, no backend/client secret) if a future request needs it.

## History

This was originally a Blink-generated template using `@blinkdotnew/sdk` for both auth and data
storage, then converted to **OdontoManage Pro** (a dental clinic system) on Supabase, then
repurposed into **MotoManage Pro** for a motorcycle repair shop (domain tables became
clients/vehicles/appointments/parts/service_orders/service_order_items/transactions), then moved
off Supabase entirely onto a self-hosted Express + SQLite backend with no login (single workshop,
no need for accounts). If you see any reference to `@blinkdotnew/sdk`, `blink.new`, Supabase,
Row Level Security, dental/patient terminology, or Google Calendar sync outside of historical
context, that's leftover/dead.
