"use client";

import { motion } from "framer-motion";
import DataTable, { StatusBadge } from "@/components/dashboard/DataTable";
import type { ModuleConfig } from "@/lib/module-data";

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

/** Generic module screen: heading, stat strip and a data table. */
export default function ModuleView({ config }: { config: ModuleConfig }) {
  const { title, subtitle, stats, tableTitle, headers, rows, statusColumn } =
    config;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-7xl space-y-6"
    >
      <motion.div variants={section}>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {subtitle}
        </p>
      </motion.div>

      {stats && stats.length > 0 && (
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
      )}

      <motion.div variants={section}>
        <DataTable
          title={tableTitle}
          headers={headers}
          rows={rows.map((row, i) => ({
            key: `${title}-${i}`,
            cells: row.map((cell, j) =>
              j === statusColumn ? (
                <StatusBadge key="s" status={String(cell)} />
              ) : (
                cell
              ),
            ),
          }))}
        />
      </motion.div>
    </motion.div>
  );
}
