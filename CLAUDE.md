# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**MotoManage Pro** — a management system for a motorcycle repair shop (clients, vehicles,
appointments, service orders with labor + parts, parts inventory with low-stock alerts, and
billing) for a **single workshop** (not a multi-tenant SaaS — each workshop gets its own separate
Supabase project + hosting).

Originally scaffolded by Blink (blink.new) with `@blinkdotnew/sdk` as the backend. That backend
was fully removed — see "History" below. Everything now runs on Supabase.

## Commands

```bash
npm run dev              # dev server on :3000 (fixed port, strictPort)
npm run build             # vite build (client+SSR) then flattens to dist/ (see Deployment)
npm run preview           # preview the production build
npx tsc --noEmit          # type-check (fast, no dev server needed) — run this after any change
npm run lint:types        # same as above
npm run lint:js           # eslint
npm run lint:css          # stylelint --fix
npm run lint              # runs all three via `bun run` — bun is NOT installed in this env;
                           # run the three lint:* scripts individually with npm/npx instead
```

There is no test suite (no Jest/Vitest/Playwright config in the repo). Verification in this
project has been done via manual `npx tsc --noEmit` + ad-hoc Playwright scripts run from outside
the repo (not checked in, except `scripts/security_check_rls.mjs` — see below).

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

### No custom backend — everything talks to Supabase directly from the browser

There is no Node/Express/serverless API layer. React components call `blink.db.table(...)` and
`blink.auth.*` (see `src/blink/client.ts`), which call `@supabase/supabase-js` directly using the
public anon key (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env`, gitignored). Security
is enforced entirely by **Postgres Row Level Security** (`auth.uid() = user_id` on every table),
not by an API layer — see `supabase-schema.sql`.

`src/blink/client.ts` exports a `blink` object shaped like the original Blink SDK
(`blink.auth.signIn/signUp/logout/...`, `blink.db.table(name).list/get/create/update/delete`) —
this is a deliberate compatibility shim so route components didn't need to change when the
backend was swapped. When adding a new table, extend `BACKUP_TABLES` in that file if it should be
included in the Configuracoes export/import backup feature.

Tables are queried with `.list()` (no server-side filtering beyond `orderBy`) and filtered
client-side by foreign key (e.g. `items.filter((it) => it.service_order_id === id)`) — this
mirrors the original template's pattern and keeps `blink.db.table()`'s surface small. Fine at
single-workshop scale; revisit if a table grows large.

### SQL migrations — must be run manually in the Supabase SQL Editor

There's no migration tool wired up. Every `supabase-*.sql` file in the repo root must be pasted
into the target Supabase project's SQL Editor by hand, in roughly this order, before the
corresponding feature works:
- `supabase-schema.sql` — core tables (clients, vehicles, appointments, parts, service_orders,
  service_order_items, transactions) + RLS
- `supabase-indices.sql` — perf indices (RLS filters every query by `user_id`, so this matters)
- `supabase-migration-workshop-branding.sql` — adds the `workshop_settings` table

If you add a feature needing a schema change, add a new `supabase-migration-*.sql` file (don't
edit `supabase-schema.sql` after the fact) and tell the user to run it — there is no way to run
DDL from the app itself (anon key can't do schema changes).

### Routing gotcha: file-based layout routes need `<Outlet/>`

TanStack Router (file-based) treats a file (`clientes.tsx`) alongside a same-named folder
(`clientes/`) as a **parent layout** for everything inside that folder. If the parent component
doesn't render `<Outlet/>`, child routes silently never render (URL changes, content doesn't).
`src/routes/_app/clientes.tsx` and `src/routes/_app/ordens-servico.tsx` are thin
`() => <Outlet />` layouts; the actual list pages live at `.../index.tsx`. Keep this pattern in
mind before adding new nested routes under an existing page.

### Auth screen states (`src/components/AppLayout.tsx`)

`AppLayout` branches on `useAuth()` state in this order: `isPasswordRecovery` (show
`NewPasswordScreen`) → `isLoading` (skeleton) → `!isAuthenticated` (show `AuthScreen`, which
itself has signin/signup/forgot-password modes) → authenticated app shell. `useAuth`
(`src/hooks/useAuth.ts`) wraps `blink.auth.onAuthStateChanged`.

The whole authenticated app (`src/routes/_app.tsx` and everything under `_app/`) is wrapped in
`<BlinkClientBoundary>` (a `ClientOnly` from TanStack Router) — these routes never actually
render on the server, only a static skeleton fallback. This is why `localStorage`/`window`/
`blink.auth` reads are safe in page components: they only ever run in the browser.

### WhatsApp reminders (`src/lib/whatsapp.ts`)

Not an API integration — just builds a `wa.me`/`api.whatsapp.com` deep link with
`encodeURIComponent`-escaped prefilled text and does `window.open`. No account, no cost, no
backend. Used for appointment reminders (agenda) and "your bike is ready" messages (OS detail).
Message text intentionally avoids most accented characters (repo convention, see below).

### Workshop branding (`src/hooks/useWorkshopBranding.ts`, `workshop_settings` table)

Workshop name/logo are **not** stored in Supabase Auth user metadata — metadata is embedded in
the JWT on every request, and an image there would bloat every authenticated call. They live in
their own `workshop_settings` table instead, fetched with a plain query. That table's SELECT
policy is intentionally public (`using (true)`) so the logo/name can render on the pre-login
screen too — this is safe only because each deployment is single-tenant (one workshop's Supabase
project), so a public-read row is that workshop's own public branding, not cross-tenant leakage.

### CSV client import (`src/lib/clientImport.ts`)

Auto-detects common Portuguese/English column headers (accent- and case-insensitive) via
`CLIENT_FIELDS`/`FIELD_ALIASES`, shows a mapping + preview before writing anything, then bulk
inserts via `blink.db.table(...).createMany()` (added specifically to avoid one Supabase request
per CSV row). Deliberately does **not** support `.xlsx` — both browser-side Excel-parsing
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
- `src/layouts/shared-app-layout.tsx`, `src/Shell.tsx`, `src/components/AppSidebarShell.tsx` are
  unused template leftovers, not wired into any route — don't extend them; the real layout is
  `src/components/AppLayout.tsx` + `src/components/AppSidebar.tsx`.
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
- Google Calendar sync (present in the original dental-clinic template this was converted from)
  was intentionally dropped as out-of-scope for the initial conversion — appointments are
  workshop-local only. Re-add via `src/lib/googleCalendar.ts`-style client-only OAuth (Google
  Identity Services, no backend/client secret) if a future request needs it.

## History

This was originally a Blink-generated template using `@blinkdotnew/sdk` for both auth and data
storage, then converted to **OdontoManage Pro** (a dental clinic system) on Supabase, then
repurposed into **MotoManage Pro** for a motorcycle repair shop — the domain tables
(patients/appointments/transactions/medical_records) were replaced with
clients/vehicles/appointments/parts/service_orders/service_order_items/transactions. If you see
any reference to `@blinkdotnew/sdk`, `blink.new`, dental/patient terminology, or Google Calendar
sync outside of historical context, that's leftover/dead.
