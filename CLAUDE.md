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

- Host ONLY from `NEXT_PUBLIC_API_BASE_URL` in `.env.local` (gitignored; see `.env.example`). API lives under `/api/v1`. Local dev: backend on :4000 started with `CORS_ORIGIN=http://localhost:3010`, portal on `next dev -p 3010`.
- `src/lib/api/`: `client.ts` (fetch wrapper, `{data}` / `{error:{code,message,details}}` envelope, `ApiError`, token in localStorage `tareg.token`), `types.ts` (wire types), `session.ts` (signIn / restoreSession / signOut, `useSession`, `useCan("vehicles:manage")`, `useCanOpen(moduleKey)`), `hooks.ts` (`useApi`, `useApiPage`), `errors.ts` (the ONE code to bilingual message map: add new backend codes there).
- Auth: `POST /auth/login {login, password}` (email or phone), 12h JWT, no refresh token, no logout endpoint. A 401 drops the session and `/dashboard` bounces to `/login`. Driver-audience accounts are refused (they use the mobile app).
- The sidebar shows a module only when the role has `<module>:view` (Users & Roles: `users:view` or `roles:view`). Hide manage actions with `useCan`.
- LIVE screens: `components/dashboard/live/` (Vehicles, Drivers, Assignments, Km Tracking, Users & Roles), built on `live/LiveKit.tsx` (LiveState, Pager, FormError, useDebounced, Refreshing) and `ModulePage.tsx` (Page, Block, Status, ExpiryCell). Their old mock views in FleetModules are PARKED, not deleted. Dashboard home: vehicle/driver/off-road counts and recent readings are live, the rest is still mock.
- Every other module stays on mock data until its backend endpoints ship. Backend is read-only for us: report server bugs, don't fix them.
