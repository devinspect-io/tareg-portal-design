"use client";

import { motion } from "framer-motion";
import CountUp from "react-countup";
import MockTag from "@/components/dashboard/MockTag";

type StatCardProps = {
  value: number;
  sub: string;
  prefix?: string;
  suffix?: string;
  /** Digits after the point (money with halalas uses 2). */
  decimals?: number;
  /** Accent colour: brand blue by default, orange/red to flag attention. */
  tone?: "default" | "warn" | "bad";
  /** Makes the card a button that opens the related module. */
  onClick?: () => void;
  /** The figure is still mock data: shows a Mock tag. */
  mock?: boolean;
};

const ACCENT = {
  default: "border-s-prime-600 dark:border-s-prime-600",
  warn: "border-s-accent-500 dark:border-s-accent-500",
  bad: "border-s-red-500 dark:border-s-red-500",
} as const;

/** Dashboard stat card: count-up number, accent edge on the reading-start side. */
export default function StatCard({ value, sub, prefix = "", suffix = "", decimals = 0, tone = "default", onClick, mock = false }: StatCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative w-full rounded-xl border border-s-4 border-neutral-100 bg-white p-5 text-start shadow-sm transition-shadow enabled:cursor-pointer enabled:hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 ${ACCENT[tone]}`}
    >
      <p className="text-2xl font-bold text-foreground">
        <CountUp end={value} duration={2} decimals={decimals} separator="," prefix={prefix} suffix={suffix} enableScrollSpy={false} />
      </p>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{sub}</p>
      {mock && (
        <span className="absolute end-3 top-3">
          <MockTag />
        </span>
      )}
    </motion.button>
  );
}
