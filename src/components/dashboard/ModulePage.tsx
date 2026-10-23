"use client";

// Shared shell for every module screen (mock and live): title row with the
// primary action, the stat strip, and the staggered entrance variants.

import { motion } from "framer-motion";
import { Badge } from "@/components/dashboard/DataTable";
import { useT, type Bi } from "@/lib/translations";
import { MODULE_LABELS, STATUS, expiryStatus, fmtDate, type ModuleKey, type StatusCode, type Tone } from "@/lib/fleet-data";

// ---------- Animation ----------

export const container = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
export const section = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

// ---------- Page shell ----------

export function Status({ code }: { code: StatusCode }) {
  const { tx } = useT();
  return <Badge label={tx(STATUS[code].label)} tone={STATUS[code].tone} />;
}

/** Date plus a status pill, for expiry columns. */
export function ExpiryCell({ iso }: { iso: string }) {
  const { language } = useT();
  const code = expiryStatus(iso);
  return (
    <span className="flex items-center gap-2">
      <span>{fmtDate(iso, language)}</span>
      {code !== "valid" && <Status code={code} />}
    </span>
  );
}

export type Stat = { label: Bi; value: string; tone?: Tone };

const STAT_EDGE: Record<Tone, string> = {
  good: "border-s-green-500",
  warn: "border-s-accent-500",
  bad: "border-s-red-500",
  info: "border-s-prime-600",
  neutral: "border-s-prime-600",
};

export function StatStrip({ stats }: { stats: Stat[] }) {
  const { tx } = useT();
  return (
    <motion.div variants={section} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label.en}
          className={`rounded-xl border border-s-4 border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${STAT_EDGE[s.tone ?? "neutral"]}`}
        >
          <p className="text-xl font-bold text-foreground sm:text-2xl">{s.value}</p>
          <p className="mt-1 text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">{tx(s.label)}</p>
        </div>
      ))}
    </motion.div>
  );
}

export function Page({
  moduleKey,
  subtitle,
  stats,
  children,
  primaryAction,
  onPrimaryAction,
}: {
  moduleKey: ModuleKey;
  subtitle: Bi;
  stats?: Stat[];
  children: React.ReactNode;
  /** Label for the "add" button; omit for read-only screens. */
  primaryAction?: Bi;
  onPrimaryAction?: () => void;
}) {
  const { t, tx } = useT();
  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="mx-auto max-w-7xl space-y-6">
      <motion.div variants={section} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tx(MODULE_LABELS[moduleKey])}</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{tx(subtitle)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
            {t("export")}
          </button>
          {primaryAction && (
            <button onClick={onPrimaryAction} className="rounded-lg bg-prime-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-prime-500">
              + {tx(primaryAction)}
            </button>
          )}
        </div>
      </motion.div>
      {stats && <StatStrip stats={stats} />}
      {children}
    </motion.div>
  );
}

export const Block = ({ children }: { children: React.ReactNode }) => <motion.div variants={section}>{children}</motion.div>;
