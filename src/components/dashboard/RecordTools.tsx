"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CustomSelect, { type SelectOption } from "@/components/dashboard/CustomSelect";
import DatePicker from "@/components/dashboard/DatePicker";
import { useT } from "@/lib/translations";

// ---------- Filters ----------

export type FilterDef = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
};

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-neutral-400 focus:border-prime-500 focus:ring-4 focus:ring-prime-500/10 dark:border-neutral-700 dark:bg-neutral-800";

/** Search box + themed dropdown filters + optional date range, with a result count. */
export function FilterBar({
  search,
  onSearch,
  searchPlaceholder,
  filters,
  from,
  to,
  onFrom,
  onTo,
  shown,
  total,
  onClear,
}: {
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder: string;
  filters: FilterDef[];
  from?: string;
  to?: string;
  onFrom?: (v: string) => void;
  onTo?: (v: string) => void;
  shown: number;
  total: number;
  onClear: () => void;
}) {
  const { tx } = useT();
  const active = Boolean(search || filters.some((f) => f.value) || from || to);

  return (
    <div className="space-y-3 rounded-xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <div className="relative sm:col-span-2">
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          >
            <circle cx={11} cy={11} r={7} />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} className={`${inputClass} ps-9`} />
        </div>
        {filters.map((f) => (
          <CustomSelect key={f.label} value={f.value} onChange={f.onChange} options={[{ value: "", label: f.label }, ...f.options]} placeholder={f.label} />
        ))}
        {onFrom && <DatePicker value={from ?? ""} onChange={onFrom} />}
        {onTo && <DatePicker value={to ?? ""} onChange={onTo} />}
      </div>
      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>{tx({ en: `Showing ${shown} of ${total}`, ar: `عرض ${shown} من ${total}` })}</span>
        {active && (
          <button onClick={onClear} className="font-semibold text-prime-600 transition-colors hover:text-prime-700 dark:text-prime-400">
            {tx({ en: "Clear filters", ar: "مسح عوامل التصفية" })}
          </button>
        )}
      </div>
    </div>
  );
}

/** True when an ISO date falls inside an optional from/to range (inclusive). */
export function inRange(iso: string, from: string, to: string) {
  return (!from || iso >= from) && (!to || iso <= to);
}

// ---------- Editing ----------

export function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-prime-50 hover:text-prime-600 dark:hover:bg-neutral-800 dark:hover:text-prime-400"
    >
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
      </svg>
    </button>
  );
}

/**
 * Labelled form row. A <div role="group"> rather than <label>: wrapping the
 * dropdown/date-picker buttons in a label makes clicks inside their popovers
 * bubble back and re-toggle them.
 */
export function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div role="group" aria-label={label} className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</span>
      {children}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, dir }: { value: string; onChange: (v: string) => void; placeholder?: string; dir?: "ltr" | "rtl" }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={dir} className={inputClass} />;
}

export function NumberInput({ value, onChange, suffix }: { value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${inputClass} ${suffix ? "pe-14" : ""}`}
      />
      {suffix && <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">{suffix}</span>}
    </div>
  );
}

export function TextArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={`${inputClass} resize-none`} />;
}

/** Add/edit form shell: dialog with Cancel / Save and an optional confirmed Delete. */
export function RecordModal({
  open,
  title,
  onClose,
  onSave,
  onDelete,
  canSave = true,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  canSave?: boolean;
  children: React.ReactNode;
}) {
  const { tx } = useT();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence onExitComplete={() => setConfirming(false)}>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onSubmit={(e) => {
              e.preventDefault();
              if (canSave) onSave();
            }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              <button type="button" onClick={onClose} aria-label={tx({ en: "Close", ar: "إغلاق" })} className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="grid gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">{children}</div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
              <div>
                {onDelete &&
                  (confirming ? (
                    <span className="flex items-center gap-2 text-sm">
                      <span className="text-neutral-500">{tx({ en: "Delete this record?", ar: "حذف هذا السجل؟" })}</span>
                      <button type="button" onClick={onDelete} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500">
                        {tx({ en: "Delete", ar: "حذف" })}
                      </button>
                      <button type="button" onClick={() => setConfirming(false)} className="text-xs font-semibold text-neutral-500 hover:text-neutral-700">
                        {tx({ en: "Keep", ar: "إبقاء" })}
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirming(true)} className="text-sm font-semibold text-red-600 hover:text-red-500">
                      {tx({ en: "Delete", ar: "حذف" })}
                    </button>
                  ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  {tx({ en: "Cancel", ar: "إلغاء" })}
                </button>
                <button
                  type="submit"
                  disabled={!canSave}
                  className="rounded-lg bg-prime-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-prime-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tx({ en: "Save", ar: "حفظ" })}
                </button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Feedback & switches ----------

/** Bottom toast that dismisses itself; pass null to hide. */
export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, 2800);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-2xl dark:bg-neutral-100 dark:text-neutral-900"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="text-green-400 dark:text-green-600" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** On/off switch; the knob slides toward the reading end when on. */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-prime-600" : "bg-neutral-300 dark:bg-neutral-700"}`}
    >
      <motion.span
        className="absolute h-5 w-5 rounded-full bg-white shadow"
        initial={false}
        animate={{ insetInlineStart: checked ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 34 }}
      />
    </button>
  );
}
