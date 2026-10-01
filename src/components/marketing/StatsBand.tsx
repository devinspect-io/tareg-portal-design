"use client";

import CountUp from "react-countup";
import { motion, useReducedMotion } from "framer-motion";

const STATS = [
  {
    value: 1284,
    suffix: "+",
    label: "Shipments completed",
    accent: "orange" as const,
    path: "M21 8l-9-5-9 5v8l9 5 9-5V8z M3 8l9 5 9-5 M12 13v8",
  },
  {
    value: 4,
    suffix: "",
    label: "Cities connected",
    accent: "blue" as const,
    path: "M4 21V8l8-5 8 5v13 M9 21v-6h6v6 M9 10h.01M9 14h.01M15 10h.01M15 14h.01",
  },
  {
    value: 98,
    suffix: "%",
    label: "On-time delivery",
    accent: "blue" as const,
    path: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 7v5l3 3",
  },
  {
    raw: "24/7",
    label: "Dispatch support",
    accent: "blue" as const,
    path: "M4 12v-1a8 8 0 0 1 16 0v1 M3 13a2 2 0 0 1 2-2h1v6H5a2 2 0 0 1-2-2zM21 13a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2z M6 19c0 1 3 2 6 2",
  },
] as const;

const bar = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, staggerChildren: 0.09 },
  },
};

const cell = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function StatsBand() {
  const reduceMotion = useReducedMotion();

  return (
    // Dark navy glass: the fill stays close to the hero so the road and light
    // trails read through it — the brightness comes from the border and glow,
    // not from a blue fill.
    <motion.div
      initial={reduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={bar}
      className="mx-auto max-w-6xl rounded-[2.5rem] border border-[#3B82F6]/55 bg-[#0A1D3A]/55 px-4 py-7 shadow-[0_0_60px_-15px_rgba(59,130,246,0.35)] backdrop-blur-md sm:px-7"
    >
        <div className="grid grid-cols-2 gap-y-8 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-white/[0.12]">
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              variants={cell}
              className="flex items-center gap-3.5 px-1 sm:gap-4 sm:px-4 lg:px-7"
            >
              <span
                className={`shrink-0 ${
                  s.accent === "orange" ? "text-[#FF6A00]" : "text-[#2E7DFF]"
                }`}
              >
                <svg
                  width={38}
                  height={38}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-8 w-8 sm:h-[38px] sm:w-[38px]"
                >
                  <path d={s.path} />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold tracking-tight text-white sm:text-[30px]">
                  {"raw" in s ? (
                    s.raw
                  ) : (
                    <CountUp
                      end={s.value}
                      duration={2}
                      separator=","
                      suffix={s.suffix}
                      enableScrollSpy
                      scrollSpyOnce
                    />
                  )}
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-[#94A3B8] sm:text-sm">
                  {s.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
    </motion.div>
  );
}
