"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/lib/translations";
import type { Language } from "@/lib/useLanguage";

// Gregorian calendar + Latin digits in Arabic too (plain "ar" would give Hijri).
const LOCALE: Record<Language, string> = { en: "en-GB", ar: "ar-u-ca-gregory-nu-latn" };

/** Monday-first short weekday names, e.g. "Mo" / "الاثنين". */
function weekdays(lang: Language): string[] {
  const monday = new Date(2024, 0, 1); // a Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toLocaleDateString(LOCALE[lang], { weekday: lang === "ar" ? "narrow" : "short" }).slice(0, lang === "ar" ? undefined : 2);
  });
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function CalendarIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={3} y={5} width={18} height={16} rx={2} />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

type DatePickerProps = {
  id?: string;
  value: string; // yyyy-mm-dd
  onChange: (iso: string) => void;
};

/**
 * Custom themed date picker — calendar popover, no native UI. Ported from
 * darbcom-logistics-panel's date-time-picker (calendar grid + popover
 * mechanics), trimmed to date-only and re-themed to Tareg' blue/orange
 * (+ dark) palette.
 */
export default function DatePicker({ id, value, onChange }: DatePickerProps) {
  const { tx, language } = useT();
  const selectedDate = value ? fromISO(value) : null;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = selectedDate ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 6-week grid starting on the Monday of the first week of the month.
  const firstOfMonth = new Date(view.getFullYear(), view.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - ((firstOfMonth.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const label = selectedDate
    ? selectedDate.toLocaleDateString(LOCALE[language], { day: "numeric", month: "short", year: "numeric" })
    : tx({ en: "Select a date", ar: "اختر تاريخًا" });

  function pick(day: Date) {
    onChange(toISO(day));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-start text-sm text-foreground outline-none transition-colors focus:border-prime-500 focus:ring-4 focus:ring-prime-500/10 dark:border-neutral-700 dark:bg-neutral-800"
      >
        <span className="text-neutral-400 dark:text-neutral-500">
          <CalendarIcon />
        </span>
        <span className="truncate">{label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 mt-1.5 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                {view.toLocaleDateString(LOCALE[language], { month: "long", year: "numeric" })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
                  }
                  className="grid h-7 w-7 place-items-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
                >
                  <span className="block rtl:-scale-x-100">
                    <ChevronIcon direction="left" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
                  }
                  className="grid h-7 w-7 place-items-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
                >
                  <span className="block rtl:-scale-x-100">
                    <ChevronIcon direction="right" />
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center">
              {weekdays(language).map((w) => (
                <span
                  key={w}
                  className="pb-1 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500"
                >
                  {w}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day) => {
                const outside = day.getMonth() !== view.getMonth();
                const selected = selectedDate !== null && sameDay(day, selectedDate);
                const isToday = sameDay(day, today);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => pick(day)}
                    className={`mx-auto my-0.5 grid h-8 w-8 place-items-center rounded-full text-sm transition-colors ${
                      selected
                        ? "bg-prime-600 font-bold text-white"
                        : outside
                          ? "text-neutral-300 hover:bg-neutral-100 dark:text-neutral-600 dark:hover:bg-neutral-700"
                          : "text-neutral-700 hover:bg-prime-50 dark:text-neutral-200 dark:hover:bg-neutral-700"
                    } ${isToday && !selected ? "font-bold text-prime-600" : ""}`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => pick(new Date())}
              className="mt-2 w-full rounded-md py-1.5 text-center text-xs font-semibold text-prime-600 transition-colors hover:bg-prime-50 dark:hover:bg-prime-950/40"
            >
              {tx({ en: "Today", ar: "اليوم" })}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
