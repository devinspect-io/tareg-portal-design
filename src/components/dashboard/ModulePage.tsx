"use client";

// Shared shell for every module screen (mock and live): title row with the
// primary action, the stat strip, and the staggered entrance variants.

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge, type SearchText } from "@/components/dashboard/DataTable";
import { useT, type Bi } from "@/lib/translations";
import { MODULE_LABELS, STATUS, expiryStatus, fmtDate, type ApprovalStep, type ModuleKey, type StatusCode, type Tone } from "@/lib/fleet-data";

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
Status.searchText = (({ code }, { tx }) => tx(STATUS[code].label)) satisfies SearchText<{ code: StatusCode }>;

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
ExpiryCell.searchText = (({ iso }, { tx, language }) => {
  const code = expiryStatus(iso);
  return `${fmtDate(iso, language)} ${code !== "valid" ? tx(STATUS[code].label) : ""}`;
}) satisfies SearchText<{ iso: string }>;

// ---------- Approval chain (mock and live Approvals) ----------

const STEP_STYLE: Record<ApprovalStep["state"], string> = {
  done: "bg-green-500 text-white",
  current: "bg-accent-500 text-white ring-4 ring-accent-500/20",
  waiting: "bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400",
  rejected: "bg-red-500 text-white",
  skipped: "border border-dashed border-neutral-300 text-neutral-400 dark:border-neutral-600",
};

/** Driver → Assistant → Fleet Manager, with each step's state. */
export function ApprovalChain({ steps }: { steps: ApprovalStep[] }) {
  const { tx } = useT();
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className="flex items-center gap-1.5" title={s.state === "skipped" ? tx({ en: "Skipped: approved by the Fleet Manager", ar: "تم تجاوزه: اعتمده مدير الأسطول" }) : undefined}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${STEP_STYLE[s.state]}`}>
              {s.state === "done" ? "✓" : s.state === "rejected" ? "✕" : s.state === "skipped" ? "-" : i + 1}
            </span>
            <span
              className={`text-xs font-medium ${
                s.state === "current" ? "text-accent-700 dark:text-accent-400" : s.state === "skipped" ? "text-neutral-400 line-through" : "text-neutral-600 dark:text-neutral-300"
              }`}
            >
              {tx(s.role)}
            </span>
          </span>
          {i < steps.length - 1 && <span className="h-px w-6 bg-neutral-300 dark:bg-neutral-700" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

export type Stat = {
  label: Bi;
  value: string;
  tone?: Tone;
  /** Makes the card a filter toggle for the grid below it. */
  onClick?: () => void;
  /** The grid is currently narrowed by this card. */
  active?: boolean;
};

const STAT_EDGE: Record<Tone, string> = {
  good: "border-s-green-500",
  warn: "border-s-accent-500",
  bad: "border-s-red-500",
  info: "border-s-prime-600",
  neutral: "border-s-prime-600",
};

/** Selected card: a ring and a wash in the card's own tone. */
const STAT_ACTIVE: Record<Tone, string> = {
  good: "ring-2 ring-green-500/50 bg-green-50/70 dark:bg-green-950/25",
  warn: "ring-2 ring-accent-500/50 bg-accent-50/70 dark:bg-accent-950/25",
  bad: "ring-2 ring-red-500/50 bg-red-50/70 dark:bg-red-950/25",
  info: "ring-2 ring-prime-600/45 bg-prime-50/70 dark:bg-prime-950/30",
  neutral: "ring-2 ring-prime-600/45 bg-prime-50/70 dark:bg-prime-950/30",
};

function FunnelIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 5h18l-7 8.5V19l-4 2v-7.5z" />
    </svg>
  );
}

export function StatStrip({ stats }: { stats: Stat[] }) {
  const { tx } = useT();
  return (
    <motion.div variants={section} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => {
        const tone = s.tone ?? "neutral";
        const body = (
          <>
            <p className="text-xl font-bold text-foreground sm:text-2xl">{s.value}</p>
            <p className="mt-1 text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">{tx(s.label)}</p>
          </>
        );
        const base = `rounded-xl border border-s-4 border-neutral-100 p-4 shadow-sm dark:border-neutral-800 ${STAT_EDGE[tone]}`;
        if (!s.onClick) {
          return (
            <div key={s.label.en} className={`${base} bg-white dark:bg-neutral-900`}>
              {body}
            </div>
          );
        }
        return (
          <motion.button
            key={s.label.en}
            type="button"
            onClick={s.onClick}
            aria-pressed={s.active ?? false}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className={`group relative cursor-pointer text-start outline-none transition-[box-shadow,background-color] hover:shadow-md focus-visible:ring-4 focus-visible:ring-prime-500/20 ${base} ${
              s.active ? STAT_ACTIVE[tone] : "bg-white dark:bg-neutral-900"
            }`}
          >
            <span
              className={`absolute end-3 top-3 transition-opacity ${
                s.active ? "text-foreground opacity-80" : "text-neutral-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              }`}
            >
              <FunnelIcon />
            </span>
            {body}
          </motion.button>
        );
      })}
    </motion.div>
  );
}

/** One stat card that can narrow the grid. */
export type CardFilter<T> = {
  /** Cards sharing an id light up together (e.g. "Unpaid fines" and "Unpaid amount"). */
  id: string;
  label: Bi;
  tone?: Tone;
  /** Shown figure; defaults to how many items the card matches. */
  value?: string;
  /** The rows this card narrows the grid to. Omit for a card that only reports (money, averages). */
  test?: (item: T) => boolean;
  /** A totals card: clicking it shows everything again. */
  all?: boolean;
};

/**
 * Stat cards that filter a client-side list. Clicking a card narrows the rows
 * to what it counts; clicking it again (or the totals card, or the chip on the
 * table) shows everything.
 *
 *   const cards = useCardFilter(BREAKDOWNS, [{ id: "open", label, tone, test: (b) => b.status === "open" }]);
 *   <Page stats={cards.stats}> <DataTable rows={cards.rows.map(...)} filter={cards.filter} />
 */
export function useCardFilter<T>(items: T[], cards: CardFilter<T>[]) {
  const { tx } = useT();
  const [active, setActive] = useState<string | null>(null);
  const current = cards.find((c) => c.id === active && c.test);
  const clear = () => setActive(null);
  const stats: Stat[] = cards.map((c) => ({
    label: c.label,
    tone: c.tone,
    value: c.value ?? String(c.test ? items.filter(c.test).length : items.length),
    active: Boolean(c.test) && current?.id === c.id,
    onClick: c.all ? clear : c.test ? () => setActive((a) => (a === c.id ? null : c.id)) : undefined,
  }));
  return {
    stats,
    rows: current?.test ? items.filter(current.test) : items,
    active: current?.id ?? null,
    filter: current ? { label: tx(current.label), onClear: clear } : undefined,
  };
}

/** Card wiring for a filter that already lives in a dropdown: selects `value`, or clears it when picked again. */
export function toggleCard(current: string, value: string, set: (v: string) => void) {
  return { active: current === value, onClick: () => set(current === value ? "" : value) };
}

export function Page({
  moduleKey,
  subtitle,
  stats,
  children,
  primaryAction,
  onPrimaryAction,
  onExport,
}: {
  moduleKey: ModuleKey;
  subtitle: Bi;
  stats?: Stat[];
  children: React.ReactNode;
  /** Label for the "add" button; omit for read-only screens. */
  primaryAction?: Bi;
  onPrimaryAction?: () => void;
  /**
   * Downloads what the screen lists, with its current filters (see lib/export.ts).
   * Omit it and the Export button is not shown.
   */
  onExport?: () => Promise<void>;
}) {
  const { t, tx } = useT();
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const runExport = async () => {
    if (!onExport || exporting) return;
    setExporting(true);
    setExportFailed(false);
    try {
      await onExport();
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  };
  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="mx-auto max-w-7xl space-y-6">
      <motion.div variants={section} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tx(MODULE_LABELS[moduleKey])}</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{tx(subtitle)}</p>
        </div>
        <div className="flex items-center gap-2">
          {exportFailed && (
            <span role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {tx({ en: "Export failed. Try again.", ar: "تعذر التصدير. حاول مرة أخرى." })}
            </span>
          )}
          {onExport && (
            <button
              onClick={runExport}
              disabled={exporting}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-wait disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              {exporting ? tx({ en: "Exporting…", ar: "جارٍ التصدير…" }) : t("export")}
            </button>
          )}
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
