@AGENTS.md

# Prime Logistics — project conventions

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

- Loading state (button-local or full-screen) → [`GearLoader`](src/components/GearLoader.tsx)
- Any table → [`DataTable`](src/components/dashboard/DataTable.tsx) (supports
  row tints, stable `key`s for animated insert/reorder/delete, and status
  pills via `StatusBadge`)
- Placeholder for an unbuilt module → [`ComingSoon`](src/components/dashboard/ComingSoon.tsx)
- Theme (`light`/`dark`) → the [`useTheme`](src/lib/useTheme.ts) hook, never
  read/write `localStorage("prime-theme")` or the `dark` class directly

## Verification habit

After any UI change, check it in both themes (`ThemeToggle` in the topbar)
and at mobile width (375px) before calling it done.
