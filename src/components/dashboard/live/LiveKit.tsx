"use client";

// Shared pieces for screens backed by the real API: loading / error states,
// a pager, an inline form error and a debounced value for search boxes.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Loader from "@/components/Loader";
import { errorText } from "@/lib/api/errors";
import { useT } from "@/lib/translations";

const card = "rounded-xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900";

/** Loading on first fetch, error with retry, otherwise the content. */
export function LiveState({ loading, error, onRetry, children }: { loading: boolean; error: unknown; onRetry: () => void; children: React.ReactNode }) {
  const { tx } = useT();
  if (loading) {
    return (
      <div className={`${card} flex justify-center py-16 text-prime-600 dark:text-prime-400`}>
        <Loader size={44} label={tx({ en: "Loading…", ar: "جارٍ التحميل…" })} />
      </div>
    );
  }
  if (error) {
    return (
      <div className={`${card} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M12 8v5M12 16.5v.5" />
            <circle cx={12} cy={12} r={9} />
          </svg>
        </span>
        <p className="max-w-md text-sm text-neutral-600 dark:text-neutral-300">{errorText(error, tx)}</p>
        <button onClick={onRetry} className="rounded-lg bg-prime-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-prime-500">
          {tx({ en: "Try again", ar: "إعادة المحاولة" })}
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

/** Previous / next with "Page 2 of 5". Hidden when everything fits on one page. */
export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const { tx } = useT();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const btn =
    "rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700";
  return (
    <div className="flex items-center justify-end gap-2 pt-3 text-xs text-neutral-500 dark:text-neutral-400">
      <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {tx({ en: "Previous", ar: "السابق" })}
      </button>
      <span>{tx({ en: `Page ${page} of ${pages}`, ar: `صفحة ${page} من ${pages}` })}</span>
      <button className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {tx({ en: "Next", ar: "التالي" })}
      </button>
    </div>
  );
}

/** Red line inside a form, for a failed save. Spans both form columns. */
export function FormError({ error }: { error: unknown }) {
  const { tx } = useT();
  return (
    <AnimatePresence>
      {error ? (
        <motion.p
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2 dark:bg-red-950/40 dark:text-red-300"
        >
          {errorText(error, tx)}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

/** Value that settles `ms` after the last change (search boxes). */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Thin bar across the top of a table while a reload is in flight. */
export function Refreshing({ on }: { on: boolean }) {
  return (
    <div className="h-0.5 overflow-hidden rounded-full">
      <AnimatePresence>
        {on && (
          <motion.div
            className="h-full w-1/3 rounded-full bg-prime-500"
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: "300%", opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ x: { repeat: Infinity, duration: 1.1, ease: "easeInOut" } }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
