@AGENTS.md

# Tareg fleet portal: project conventions

Office web portal for Tareq Al-Jaafari Contracting's fleet (vehicles, drivers, kilometer readings,
maintenance and approvals, accidents, violations, compliance expiries, fuel,
expenses, history, reports). A driver-only mobile app is a separate deliverable.
Scope comes from the Tareq Al-Jaafari Contracting fleet-management proposal.

Follow these consistently across the whole app. When adding a new screen/form,
check this list before reaching for a native HTML control or writing a new
one-off component.

## Use the shared themed form components — never native controls

Native `<select>` and `<input type="date">` render browser chrome that
ignores the app's blue/orange(+dark) theme (see the reference screenshots in
this project's history — native date pickers show up as a plain OS calendar
that clashes with everything else). Always use:

- **Dates** → [`DatePicker`](src/components/dashboard/DatePicker.tsx) —
  `<DatePicker value={isoString} onChange={setIsoString} />`. `value` is a
  `"yyyy-mm-dd"` string (empty string = no selection, shows a placeholder).
- **Dropdowns / selects** → [`CustomSelect`](src/components/dashboard/CustomSelect.tsx) —
  `<CustomSelect value={v} onChange={setV} options={[...]} placeholder="…" error={bool} />`.

Both are controlled, dark-mode aware, and match the rest of the app's
styling automatically — do not build a new date or select control from
scratch, and do not fall back to `<input type="date">` or `<select>` even
for a quick/throwaway field. If a new use case doesn't fit either component,
extend the shared component rather than adding a local one-off.

## Other shared components to reuse

- Loading state (button-local or full-screen) → [`Loader`](src/components/Loader.tsx)
  (full-screen variant draws the car from [`CarGlyph`](src/components/CarGlyph.tsx))
- Any table → [`DataTable`](src/components/dashboard/DataTable.tsx) (supports
  row tints, stable `key`s, an `action` slot for "View all", and pills via
  `Badge label tone` for translated statuses)
- Placeholder for an unbuilt module → [`ComingSoon`](src/components/dashboard/ComingSoon.tsx)
- Theme (`light`/`dark`) → the [`useTheme`](src/lib/useTheme.ts) hook, never
  read/write `localStorage("prime-theme")` or the `dark` class directly

## Language: Arabic first, every string in both languages

The interface is Arabic (RTL) by default with an English toggle, per the
proposal. Never hardcode user-facing text:

- Fixed UI strings → add a key to [`translations.ts`](src/lib/translations.ts)
  in both `en` and `ar`, read with `t("key")`.
- Data and per-screen copy → a `Bi` pair `{ en, ar }`, read with `tx(bi)`
  (both from `useT()`).
- Layout → logical utilities only (`ms/me`, `ps/pe`, `start/end`,
  `border-s/e`, `text-start/end`), never `left/right`. No letter-spacing or
  uppercase on Arabic (use `ltr:tracking-*`, `ltr:uppercase`).
- Dates/money/km → `fmtDate`, `fmtSAR`, `fmtKm` in
  [`fleet-data.ts`](src/lib/fleet-data.ts): Gregorian calendar, Latin digits, SAR.

## Navigation and mock data

Sidebar sections, module keys and all demo data live in
[`fleet-data.ts`](src/lib/fleet-data.ts) (`NAV_SECTIONS`, `ModuleKey`).
Each module screen is in [`FleetModules.tsx`](src/components/dashboard/FleetModules.tsx);
add a module by adding a nav item and a case there. Statuses map to label + tone
once in `STATUS`, never re-map inline. Mock dates are relative to today so
expiry and overdue states stay realistic. Hide (don't delete) a module with
`hidden: true` on its nav item; AI Reporting is hidden this way.
`dashboard-data.ts` is legacy finance data kept only for the hidden AI Reporting.

## Verification habit

After any UI change, check it in Arabic and English, in both themes
(`ThemeToggle` in the topbar), and at mobile width (375px) before calling it done.

## Backend API (tareg-backend, same API as the Tareg driver app)

- Host ONLY from `NEXT_PUBLIC_API_BASE_URL` (and file downloads from `NEXT_PUBLIC_FILES_BASE_URL`, see 2026-11-10) in `.env.local` (gitignored; see `.env.example`). API lives under `/api/v1`. Local dev: backend on :4000 started with `CORS_ORIGIN=http://localhost:3010`, portal on `next dev -p 3010`.
- `src/lib/api/`: `client.ts` (fetch wrapper, `{data}` / `{error:{code,message,details}}` envelope, `ApiError`, token in localStorage `tareg.token`), `types.ts` (wire types), `session.ts` (signIn / restoreSession / signOut, `useSession`, `useCan("vehicles:manage")`, `useCanOpen(moduleKey)`), `hooks.ts` (`useApi`, `useApiPage`), `errors.ts` (the ONE code to bilingual message map: add new backend codes there).
- Auth: `POST /auth/login {login, password}` (email or phone), 12h JWT, no refresh token, no logout endpoint. A 401 drops the session and `/dashboard` bounces to `/login`. Driver-audience accounts are refused (they use the mobile app).
- The sidebar shows a module only when the role has `<module>:view` (Users & Roles: `users:view` or `roles:view`). Hide manage actions with `useCan`.
- LIVE screens: `components/dashboard/live/` (Vehicles, Drivers, Assignments, Km Tracking, Users & Roles, Approvals, Breakdowns, Maintenance, Accidents, Violations, Compliance), built on `live/LiveKit.tsx` (LiveState, Pager, FormError, useDebounced, Refreshing, Dialog, Fact, Lightbox, ActionDialog / ActionButton for status actions with 409 handling, DriverCell / VehicleCell, useFleetOptions) and `ModulePage.tsx` (Page, Block, Status, ExpiryCell, ApprovalChain). Attachments are file ids: `GET /files/:id` needs the token, so `lib/api/files.ts` (`useFile`, ref-counted object URLs) and `live/Evidence.tsx` (FileThumbs, FileGallery, FileLightbox; PDFs open in a new tab) render them. Approvals buttons follow the server's `canApprove/canReject/canClose` only. Fuel is still mock (Expenses went live 2026-11-10). Their old mock views in FleetModules are PARKED, not deleted. Dashboard home is fully live (2026-11-13, see below).
- Every other module stays on mock data until its backend endpoints ship. Backend is read-only for us: report server bugs, don't fix them.

## 2026-11-10: files service, History, Settings, Expenses live

- **Files service split.** `/files/*` downloads go to `NEXT_PUBLIC_FILES_BASE_URL` (host without `/api/v1`, same convention as the API base); unset falls back to `NEXT_PUBLIC_API_BASE_URL` (a gateway routes `/api/v1/files` to the files service in production). Resolved once in `lib/api/client.ts` (`FILES_BASE`) and used by `api.blob`, so `useFile`/`Evidence` need no change. Local `.env.local` points it at `http://localhost:4100`; `.env.example` has the empty placeholder. Never hardcode the host.
- **Photo sources.** `useFile` (`lib/api/files.ts`) now also accepts a direct source: strings starting with `data:` or `http` render as is, anything else is a file id fetched with the token (`isDirectSrc`). Kilometer readings use this (newer app builds upload odometer photos and send ids; older readings hold data URLs or URLs). Approvals now show their `photos` (file ids) as a column of thumbnails and a gallery with lightbox in the detail dialog.
- **History LIVE** (`live/HistoryLive.tsx`, `history:view`): Vehicle | Driver tabs, a search box plus `CustomSelect` picker fed from `/vehicles` or `/drivers` (`search`, first 100), type chips (multi-select, none selected means all), From/To `DatePicker`s, paging (20/page). One timeline from `GET /history/{vehicles|drivers}/:id`; titles are built in the portal from `type`, details per the backend README table, photos and invoices through `Evidence`. The subject summary at the top carries `subject.documents` expiries. `api.getWithMeta` returns a single object plus paging meta. Mock `HistoryView` is PARKED in `FleetModules.tsx`. `STATUS` gained `current` and `ended` for assignments.
- **Settings LIVE** (`live/SettingsLive.tsx`, `settings:view` / `settings:manage`): shows the API's values, sends only changed fields in `PATCH /settings`, validates like the server (reminder days 1 to 365 and 1 to 10 distinct, `minPhotos` 1 to 10, `maintenanceDaysBefore` 0 to 365, `maintenanceKmBefore` 0 to 100,000, email or empty) and shows server 400 field errors under the field. Read-only without `settings:manage` (`disabled` added to `TextInput`, `NumberInput`, `Toggle`, `CustomSelect`). The approval chain Driver, Assistant, Fleet Manager is fixed information (no toggles); the Super Admin threshold settings are gone. Hosting and version rows (mock-only claims) were dropped; currency and time zone stay as static facts. Fields the backend only stores (km frequency, notification categories, default language) say so. Mock `SettingsView` is PARKED.
- **Expense Invoices LIVE** (`live/ExpensesLive.tsx`): no expenses module exists, it reads `GET /maintenance` (vendor, cost, category, `invoicePhotos`, filters `from`, `to`, `vehicleId`, `driverId`, plus status, emergency, search). Stat cards total the whole filtered range (it pages through up to 1,000 records and shows "+" if there are more). Mock `ExpensesView` is PARKED.
- `mock: true` removed from the history, settings and expenses nav items. New backend error codes added to `errors.ts` (files service, photo rules, maintenance requests disabled, driver-context codes).
- **Expense Invoices needs two permissions** (`useCanOpen` in `lib/api/session.ts`): `expenses:view` AND `maintenance:view`, because its data comes from `GET /maintenance` (maintenance:view on the API). A role with only `expenses:view` would otherwise open a 403. Reported as a backend gap.
- **Money:** `fmtSAR` shows whole riyals without decimals and any fractional amount with exactly two ("SAR 640.50", never "SAR 640.5").
- **Local test note:** the real `tareg-files` service is not in the devinspect-io org yet; local testing used a small stand-in with the same API on :4100. Photos uploaded before the split (and seed paths like `seed/km-3317-1.jpg`) 404 against it, which is expected.
- Sign-in page is white in both themes: its root carries `always-light`, which the `dark` custom variant (globals.css) excludes, plus light autofill colors. Any other white-only screen should add the same class.
- The open screen lives in the URL: `/dashboard?view=<ModuleKey>` (`app/dashboard/page.tsx`, read via `useSyncExternalStore`, written by `goToView`). Refresh reopens it, Back steps between screens, an unknown key or one the role can't open falls back to the dashboard. Navigate only through `openModule`, never keep the view in local state.
- Boot and "Opening <screen>" loaders follow the API, not a timer: `useApi` counts screens still waiting on their FIRST load (`subscribeFirstLoads`/`firstLoadsInFlight` in `lib/api/hooks.ts`), and the dashboard page keeps the loader up while that count is above zero, with a short minimum (600 ms boot, 300 ms open) so it never flashes and a 10 s cap. Reloads and polling never count. New screens get this for free as long as they load through `useApi`/`useApiPage`.

## 2026-11-13: Dashboard home live

- **`GET /dashboard/summary`** (`dashboard:view`, type `ApiDashboardSummary` in `lib/api/types.ts`) feeds every home KPI card and chart in one call (`useHomeSummary` in `app/dashboard/page.tsx`). The four home lists (expiries, pending approvals, upcoming maintenance, recent readings) still come from the screens' own endpoints (`useHomeLists`), as the backend README says. No Mock tags left on the home page.
- A section is `null` when the role can't open that screen, so each card and chart shows only with the matching permission (`show` map; Expenses uses `canOpen("expenses")`, i.e. expenses:view AND maintenance:view). The chart grid picks its column count from how many charts show.
- **The date filter now works, and only sets the expense period** (`from`/`to` query; empty means the server's last 30 days). It hides when the role can't see expenses. Counts are always "right now". A start after the end, or after today with no end, is caught before the call (Filter disabled + message). The expenses card and chart titles show the period.
- Charts: km by month from `mileage.kmByMonth` (y axis floored at 0 so the spline never dips below), expenses by category from `expenses.byCategory` with an empty message (`ChartCard` gained `empty`), fleet status from the `vehicles` counts, the hidden maintenance-cost chart from `expenses.byMonth` (planned / emergency). Month labels via `fmtMonth` (`lib/fleet-data.ts`). `StatCard` gained `decimals` (money with halalas).
- Sidebar badges keep their own counts (they need only approvals/breakdowns view, not `dashboard:view`).
- Mock exports `EXPENSES`, `EXPENSE_CATEGORIES`, `MAINTENANCE_COST`, `MONTHLY_KM`, `lastMonths` in `fleet-data.ts` are no longer used by the home page; kept for the parked mock views.
