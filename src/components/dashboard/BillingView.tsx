"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import DataTable, { StatusBadge } from "@/components/dashboard/DataTable";
import { INVOICES, type InvoiceStatus } from "@/lib/module-data";

type Filter = "All" | InvoiceStatus;
const FILTERS: Filter[] = ["All", "Paid", "Pending", "Overdue"];

const AED = (n: number) => `AED ${n.toLocaleString()}`;

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const section = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function BillingView() {
  const [filter, setFilter] = useState<Filter>("All");

  const totals = useMemo(() => {
    const by = (s: InvoiceStatus) =>
      INVOICES.filter((i) => i.status === s).reduce((a, i) => a + i.amount, 0);
    return {
      invoiced: INVOICES.reduce((a, i) => a + i.amount, 0),
      paid: by("Paid"),
      pending: by("Pending"),
      overdue: by("Overdue"),
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      All: INVOICES.length,
      Paid: 0,
      Pending: 0,
      Overdue: 0,
    };
    for (const i of INVOICES) c[i.status] += 1;
    return c;
  }, []);

  const rows = useMemo(
    () =>
      filter === "All"
        ? INVOICES
        : INVOICES.filter((i) => i.status === filter),
    [filter],
  );

  const stats = [
    { label: "Total invoiced", value: AED(totals.invoiced) },
    { label: "Paid", value: AED(totals.paid) },
    { label: "Outstanding", value: AED(totals.pending) },
    { label: "Overdue", value: AED(totals.overdue) },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-7xl space-y-6"
    >
      <motion.div
        variants={section}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Billing &amp; Invoices
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Issue invoices and track what&apos;s been collected.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-prime-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-prime-500"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Invoice
        </button>
      </motion.div>

      <motion.div
        variants={section}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-neutral-100 border-l-4 border-l-prime-600 bg-white p-4 shadow-sm dark:border-neutral-800 dark:border-l-prime-600 dark:bg-neutral-900"
          >
            <p className="text-xl font-bold text-foreground sm:text-2xl">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
              {s.label}
            </p>
          </div>
        ))}
      </motion.div>

      <motion.div variants={section} className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={active}
              className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-prime-600 bg-prime-600 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-prime-300 hover:text-prime-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-prime-500 dark:hover:text-prime-400"
              }`}
            >
              {f}
              <span className={active ? "text-white/70" : "text-neutral-400"}>
                {" "}
                ({counts[f]})
              </span>
            </button>
          );
        })}
      </motion.div>

      <motion.div variants={section}>
        <DataTable
          title={`Invoices (${rows.length})`}
          headers={[
            "Invoice #",
            "Customer",
            "Issued",
            "Due",
            "Amount",
            "Status",
          ]}
          rows={rows.map((i) => ({
            key: i.id,
            cells: [
              i.id,
              i.customer,
              formatDate(i.issued),
              formatDate(i.due),
              AED(i.amount),
              <StatusBadge key="s" status={i.status} />,
            ],
          }))}
        />
      </motion.div>
    </motion.div>
  );
}
