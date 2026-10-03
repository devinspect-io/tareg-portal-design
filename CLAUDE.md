@AGENTS.md

# Tareg fleet portal: project conventions

Office web portal for Montaka's fleet (vehicles, drivers, kilometer readings,
maintenance and approvals, accidents, violations, compliance expiries, fuel,
expenses, history, reports). A driver-only mobile app is a separate deliverable.
Scope comes from the Montaka fleet-management proposal.

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
