"use client";

import { isValidElement, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useT, type Bi } from "@/lib/translations";
import type { Language } from "@/lib/useLanguage";

export type TableRow = {
  cells: React.ReactNode[];
  /** Optional row background tint (e.g. balance-sheet totals). */
  tint?: "red" | "green" | "blue";
  /** Stable identity for animated insertion/reordering (e.g. a DB id). */
  key?: string;
  /** Extra text the search box should match (defaults to the cells' text). */
  search?: string;
};

type DataTableProps = {
  title: string;
  headers: string[];
  rows: TableRow[];
  /** Optional control in the card header (e.g. a "View all" link). */
  action?: React.ReactNode;
  /** Shown instead of the table when there are no rows. */
  empty?: string;
  /**
   * Built-in search over the rows on screen (default on). Turn it off where a
   * FilterBar already searches, e.g. server-paged lists, so there is one box.
   */
  searchable?: boolean;
  /** Filter applied from outside (a stat card), shown as a removable chip. */
  filter?: { label: string; onClear: () => void };
};

// ---------- Row search ----------

type SearchCtx = { tx: (b: Bi) => string; language: Language };

/**
 * Lets a cell component tell the search what it reads as, when its text is
 * computed from props (e.g. a status code rendered as a translated label).
 */
export type SearchText<P> = (props: P, ctx: SearchCtx) => string;

/** Plain text of a rendered cell: strings, numbers, children, and the label of pills. */
function textOf(node: React.ReactNode, ctx: SearchCtx): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((n) => textOf(n, ctx)).join(" ");
  if (!isValidElement(node)) return "";
  const props = node.props as Record<string, unknown>;
  if (typeof node.type !== "string") {
    const custom = (node.type as { searchText?: SearchText<Record<string, unknown>> }).searchText;
    if (custom) return custom(props, ctx);
  }
  const parts = [textOf(props.children as React.ReactNode, ctx)];
  if (typeof node.type !== "string") {
    for (const k of ["label", "status"]) if (typeof props[k] === "string") parts.push(props[k] as string);
  }
  return parts.join(" ");
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

const TINTS: Record<NonNullable<TableRow["tint"]>, string> = {
  red: "bg-accent-50 dark:bg-accent-950/40",
  green: "bg-green-50 dark:bg-green-950/30",
  blue: "bg-neutral-50 font-semibold dark:bg-neutral-800/60",
};

function SearchIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <circle cx={11} cy={11} r={7} />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function CloseIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Small styled table card used across the dashboard, with a search box over its rows. */
export default function DataTable({ title, headers, rows, action, empty, searchable = true, filter }: DataTableProps) {
  const { tx, language } = useT();
  const [query, setQuery] = useState("");
  const q = norm(query);

  const haystacks = useMemo(
    () => rows.map((r) => norm(`${r.cells.map((c) => textOf(c, { tx, language })).join(" ")} ${r.search ?? ""}`)),
    // tx is derived from language, so language covers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, language],
  );
  const shown = searchable && q ? rows.filter((_, i) => haystacks[i].includes(q)) : rows;
  const searching = searchable && q !== "";

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <AnimatePresence initial={false}>
            {filter && (
              <motion.button
                key={filter.label}
                type="button"
                onClick={filter.onClear}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                aria-label={tx({ en: `Remove filter: ${filter.label}`, ar: `إزالة التصفية: ${filter.label}` })}
                className="inline-flex items-center gap-1.5 rounded-full bg-prime-50 py-1 ps-2.5 pe-2 text-xs font-semibold text-prime-700 transition-colors hover:bg-prime-100 dark:bg-prime-950/50 dark:text-prime-300 dark:hover:bg-prime-900/50"
              >
                {filter.label}
                <CloseIcon />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {searchable && rows.length > 0 && (
            <div className="relative flex-1 sm:w-60 sm:flex-none">
              <span className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
                <SearchIcon />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                placeholder={tx({ en: "Search", ar: "بحث" })}
                aria-label={tx({ en: `Search ${title}`, ar: `بحث في ${title}` })}
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 ps-8 pe-16 text-sm text-foreground outline-none transition-colors placeholder:text-neutral-400 focus:border-prime-500 focus:ring-4 focus:ring-prime-500/10 dark:border-neutral-700 dark:bg-neutral-800 [&::-webkit-search-cancel-button]:hidden"
              />
              {searching && (
                <span className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                  <span className="text-[11px] tabular-nums text-neutral-400">
                    {shown.length}/{rows.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label={tx({ en: "Clear search", ar: "مسح البحث" })}
                    className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                  >
                    <CloseIcon />
                  </button>
                </span>
              )}
            </div>
          )}
          {action}
        </div>
      </div>
      {shown.length === 0 && (searching || filter || empty) ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-neutral-400">
          <p>
            {searching
              ? tx({ en: `Nothing matches "${query.trim()}".`, ar: `لا توجد نتائج مطابقة لـ "${query.trim()}".` })
              : (empty ?? tx({ en: "Nothing here for this filter.", ar: "لا توجد سجلات لهذه التصفية." }))}
          </p>
          {(searching || filter) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                if (!searching) filter?.onClear();
              }}
              className="text-xs font-semibold text-prime-600 transition-colors hover:text-prime-700 dark:text-prime-400"
            >
              {searching ? tx({ en: "Clear search", ar: "مسح البحث" }) : tx({ en: "Show all", ar: "عرض الكل" })}
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              {/* Caps + letter-spacing only in LTR: both break Arabic's joined script. */}
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500 ltr:uppercase ltr:tracking-wide dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-400">
                {headers.map((h, i) => (
                  <th key={`${h}-${i}`} className="px-3 py-2.5 text-start font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {shown.map((row, i) => (
                  <motion.tr
                    key={row.key ?? i}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={`border-b border-neutral-100 last:border-0 dark:border-neutral-800 ${
                      row.tint ? TINTS[row.tint] : ""
                    }`}
                  >
                    {row.cells.map((cell, j) => (
                      <td
                        key={j}
                        className="px-3 py-2.5 whitespace-nowrap text-neutral-700 dark:text-neutral-300"
                      >
                        {cell}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const GOOD = [
  "OK", "Active", "Paid", "Delivered", "Received", "Posted", "Cleared",
  "Ready", "Road-ready", "Connected",
];
const WARN = [
  "Pending", "In transit", "In service", "On hold", "Awaiting pickup", "On leave",
];
const BAD = [
  "LOW", "Overdue", "Cancelled", "Inactive", "Out of service", "Disabled",
];

const TONES = {
  good: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  warn: "bg-accent-100 text-accent-700 dark:bg-accent-950/50 dark:text-accent-400",
  bad: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  info: "bg-prime-50 text-prime-700 dark:bg-prime-950/50 dark:text-prime-300",
  neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
} as const;

export type BadgeTone = keyof typeof TONES;

function toneFor(status: string): BadgeTone {
  if (GOOD.includes(status)) return "good";
  if (WARN.includes(status)) return "warn";
  if (BAD.includes(status)) return "bad";
  return "neutral";
}

/** Pill with an explicit tone, for translated labels that can't be matched by text. */
export function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONES[tone]}`}
    >
      {label}
    </span>
  );
}

/** Status pill whose colour is derived from an English status label. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge label={status} tone={toneFor(status)} />;
}
