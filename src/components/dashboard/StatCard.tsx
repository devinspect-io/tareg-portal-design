"use client";

import { motion } from "framer-motion";
import CountUp from "react-countup";

type StatCardProps = {
  value: number;
  sub: string;
  prefix?: string;
};

/** Dashboard stat card with a count-up number and blue accent border. */
export default function StatCard({ value, sub, prefix = "" }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="rounded-xl border border-neutral-100 border-l-4 border-l-prime-600 bg-white p-5 shadow-sm dark:border-neutral-800 dark:border-l-prime-600 dark:bg-neutral-900"
    >
      <p className="text-2xl font-bold text-foreground">
        <CountUp
          end={value}
          duration={2}
          separator=","
          prefix={prefix}
          enableScrollSpy={false}
        />
      </p>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{sub}</p>
    </motion.div>
  );
}
