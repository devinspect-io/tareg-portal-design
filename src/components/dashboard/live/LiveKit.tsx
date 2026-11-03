"use client";

// Shared pieces for screens backed by the real API: loading / error states,
// a pager, an inline form error, a debounced value for search boxes, the
// dialog / lightbox shells, driver and vehicle cells, and an action dialog.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Loader from "@/components/Loader";
import { Field, TextArea } from "@/components/dashboard/RecordTools";
import { ApiError, api } from "@/lib/api/client";
import { errorText } from "@/lib/api/errors";
import { useApi } from "@/lib/api/hooks";
import type { ApiDriver, ApiVehicle, ApprovalType, ComplianceDocument, RecordSummary, VehicleSummary } from "@/lib/api/types";
import { useT, type Bi } from "@/lib/translations";

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

// ---------- Dialogs ----------

export const ghostBtn =
  "rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700";

/** Centered dialog shell used by detail views and action dialogs. */
export function Dialog({ title, onClose, wide = false, z = "z-50", children }: { title: string; onClose: () => void; wide?: boolean; z?: string; children: React.ReactNode }) {
  const { tx } = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div
      className={`fixed inset-0 ${z} flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900 ${wide ? "max-w-3xl" : "max-w-md"}`}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} aria-label={tx({ en: "Close", ar: "إغلاق" })} className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Label over a value, in the fact grids of detail views. */
export function Fact({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-800/60 ${wide ? "col-span-2 sm:col-span-4" : ""}`}>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <div className="mt-0.5 text-sm font-semibold break-words text-foreground">{children}</div>
    </div>
  );
}

const arrowBtn = "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2.5 text-white transition-colors hover:bg-black/70 disabled:opacity-30";

/** Full-screen viewer with next / previous, keyboard arrows and Escape. `render(i)` draws item i. */
export function Lightbox({ count, start, onClose, render }: { count: number; start: number; onClose: () => void; render: (i: number) => React.ReactNode }) {
  const { tx } = useT();
  const [i, setI] = useState(start);
  const last = count - 1;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Arrows follow the reading direction of the page.
      const rtl = document.documentElement.dir === "rtl";
      if (e.key === "ArrowRight") setI((v) => Math.max(0, Math.min(last, v + (rtl ? -1 : 1))));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, Math.min(last, v + (rtl ? 1 : -1))));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [last, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <button onClick={onClose} aria-label={tx({ en: "Close", ar: "إغلاق" })} className="absolute end-4 top-4 z-10 rounded-full bg-black/50 p-2.5 text-white hover:bg-black/70">
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {render(i)}
      {count > 1 && (
        <>
          <button className={`${arrowBtn} start-3`} disabled={i === 0} onClick={() => setI(i - 1)} aria-label={tx({ en: "Previous photo", ar: "الصورة السابقة" })}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button className={`${arrowBtn} end-3`} disabled={i === last} onClick={() => setI(i + 1)} aria-label={tx({ en: "Next photo", ar: "الصورة التالية" })}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span dir="ltr" className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
            {i + 1} / {count}
          </span>
        </>
      )}
    </motion.div>
  );
}

export type ActionTone = "good" | "bad" | "info";

const ACTION_BTN: Record<ActionTone, string> = {
  good: "bg-green-600 hover:bg-green-500",
  bad: "bg-red-600 hover:bg-red-500",
  info: "bg-prime-600 hover:bg-prime-500",
};

/**
 * Confirm-and-send dialog for a status action (approve, start, close, mark
 * paid...), with an optional text box (a required reason, an optional
 * resolution). A 409 means someone else moved the record first: the list is
 * refreshed behind the dialog and the dialog stays open on the friendly text.
 */
export function ActionDialog({
  title,
  summary,
  note,
  confirm,
  tone = "info",
  text,
  run,
  onClose,
  onDone,
}: {
  title: string;
  /** One line naming the record (ref, plate...). */
  summary: React.ReactNode;
  /** What the action does, shown in a tinted box. */
  note?: React.ReactNode;
  confirm: string;
  tone?: ActionTone;
  text?: { label: string; hint?: string; required?: boolean; max: number };
  run: (text: string) => Promise<unknown>;
  onClose: () => void;
  onDone: (result: unknown, stale: boolean) => void;
}) {
  const { tx } = useT();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // After a 409 the action no longer applies: only the way out is offered.
  const [stale, setStale] = useState(false);
  const trimmed = value.trim();
  const canSend = !busy && !stale && (!text || ((!text.required || trimmed.length > 0) && trimmed.length <= text.max));

  async function submit() {
    if (!canSend) return;
    setBusy(true);
    setError(null);
    try {
      onDone(await run(trimmed), false);
    } catch (e) {
      setError(e);
      setBusy(false);
      if (e instanceof ApiError && e.status === 409) {
        setStale(true);
        onDone(null, true);
      }
    }
  }

  return (
    <Dialog z="z-[55]" onClose={busy ? () => {} : onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-4 overflow-y-auto px-5 py-5"
      >
        <div className="text-sm text-neutral-600 dark:text-neutral-300">{summary}</div>
        {note && <div className="rounded-lg bg-prime-50 px-3 py-2.5 text-sm text-prime-800 dark:bg-prime-950/50 dark:text-prime-200">{note}</div>}
        {text && !stale && (
          <Field label={text.label} wide>
            <TextArea value={value} onChange={setValue} />
            <p className="mt-1.5 flex justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              <span>{text.hint}</span>
              <span dir="ltr" className={trimmed.length > text.max ? "text-red-600" : ""}>
                {trimmed.length}/{text.max}
              </span>
            </p>
          </Field>
        )}
        <FormError error={error} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className={ghostBtn}>
            {stale ? tx({ en: "Close", ar: "إغلاق" }) : tx({ en: "Cancel", ar: "إلغاء" })}
          </button>
          {!stale && (
            <button type="submit" disabled={!canSend} className={`rounded-lg px-5 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${ACTION_BTN[tone]}`}>
              {busy ? tx({ en: "Saving…", ar: "جارٍ الحفظ…" }) : confirm}
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}

/** Small filled or outlined button for row and footer actions. */
export function ActionButton({ label, onClick, tone = "info", outline = false, size = "sm" }: { label: string; onClick: () => void; tone?: ActionTone; outline?: boolean; size?: "sm" | "md" }) {
  const pad = size === "md" ? "px-4 py-2 text-sm" : "px-2.5 py-1 text-xs";
  const look = outline
    ? tone === "bad"
      ? "border border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-transparent dark:hover:bg-red-950/40"
      : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-200 dark:hover:bg-neutral-800"
    : `${ACTION_BTN[tone]} text-white`;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-lg font-semibold whitespace-nowrap transition-colors ${look} ${pad}`}
    >
      {label}
    </button>
  );
}

// ---------- Driver and vehicle ----------

export function DriverCell({ driver }: { driver: RecordSummary | null }) {
  const { tx } = useT();
  if (!driver) return <>-</>;
  return (
    <span className="block">
      {tx(driver.name)}
      <span dir="ltr" className="block text-xs font-normal text-neutral-500">{driver.employeeNo}</span>
    </span>
  );
}

export function VehicleCell({ vehicle }: { vehicle: VehicleSummary | null }) {
  const { tx } = useT();
  if (!vehicle) return <>-</>;
  return (
    <span className="block">
      <span dir="ltr" className="font-medium">{vehicle.plateNumber}</span>
      <span className="block text-xs font-normal text-neutral-500">{tx(vehicle.make)} {tx(vehicle.model)}</span>
    </span>
  );
}

/** Vehicle and driver dropdown options for filter bars (first 100 of each, the API's page limit). */
export function useFleetOptions() {
  const { tx } = useT();
  const vehicles = useApi(() => api.page<ApiVehicle>("/vehicles", { pageSize: 100 }), "vehicles");
  const drivers = useApi(() => api.page<ApiDriver>("/drivers", { pageSize: 100 }), "drivers");
  return {
    vehicleOptions: (vehicles.data?.items ?? []).map((v) => ({ value: v.id, label: `${v.plateNumber} - ${tx(v.make)} ${tx(v.model)}` })),
    driverOptions: (drivers.data?.items ?? []).map((d) => ({ value: d.id, label: `${tx(d.name)} (${d.employeeNo})` })),
  };
}

/** A count for a stat card: "-" until it has loaded. */
export const countText = (n: number | undefined) => (n === undefined ? "-" : n.toLocaleString("en-US"));

/** Request types drivers pick in the app (approvals, and the category of a maintenance record). */
export const APPROVAL_TYPE_LABEL: Record<ApprovalType, Bi> = {
  maintenance: { en: "Maintenance", ar: "صيانة" },
  emergencyRepair: { en: "Emergency repair", ar: "إصلاح طارئ" },
  tyres: { en: "Tyres", ar: "إطارات" },
  battery: { en: "Battery", ar: "بطارية" },
  expenseClaim: { en: "Expense claim", ar: "مطالبة مصروفات" },
};

/** Documents tracked by GET /compliance (compliance page and the dashboard preview). */
export const DOCUMENT_LABEL: Record<ComplianceDocument, Bi> = {
  license: { en: "Driving license", ar: "رخصة القيادة" },
  nationalId: { en: "National ID", ar: "الهوية الوطنية" },
  iqama: { en: "Iqama", ar: "الإقامة" },
  registration: { en: "Vehicle registration (Istimara)", ar: "رخصة السير (الاستمارة)" },
  insurance: { en: "Insurance", ar: "التأمين" },
  inspection: { en: "Periodic inspection", ar: "الفحص الدوري" },
};
