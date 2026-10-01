"use client";

import { AnimatePresence, motion } from "framer-motion";

export type TableRow = {
  cells: React.ReactNode[];
  /** Optional row background tint (e.g. balance-sheet totals). */
  tint?: "red" | "green" | "blue";
  /** Stable identity for animated insertion/reordering (e.g. a DB id). */
  key?: string;
};

type DataTableProps = {
  title: string;
  headers: string[];
  rows: TableRow[];
};

const TINTS: Record<NonNullable<TableRow["tint"]>, string> = {
  red: "bg-accent-50 dark:bg-accent-950/40",
  green: "bg-green-50 dark:bg-green-950/30",
  blue: "bg-neutral-50 font-semibold dark:bg-neutral-800/60",
};

/** Small styled table card used across the dashboard. */
export default function DataTable({ title, headers, rows }: DataTableProps) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-400">
              {headers.map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((row, i) => (
                <motion.tr
                  key={row.key ?? i}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={`border-b border-neutral-100 last:border-0 dark:border-neutral-800 ${
                    row.tint ? TINTS[row.tint] : ""
                  }`}
                >
                  {row.cells.map((cell, j) => (
                    <td
                      key={j}
                      className="px-3 py-2.5 text-neutral-700 dark:text-neutral-300"
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
  neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
} as const;

function toneFor(status: string): keyof typeof TONES {
  if (GOOD.includes(status)) return "good";
  if (WARN.includes(status)) return "warn";
  if (BAD.includes(status)) return "bad";
  return "neutral";
}

/** Status pill — colour is derived from the status label. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONES[toneFor(status)]}`}
    >
      {status}
    </span>
  );
}
