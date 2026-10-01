"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AiChat from "@/components/dashboard/AiChat";

/** Shortcut chips in the banner — each seeds the chat with a real question. */
const CAPABILITIES = [
  {
    label: "Revenue",
    question: "Show me the revenue report",
    path: "M3 17l6-6 4 4 8-8 M21 7v5h-5",
  },
  {
    label: "Routes",
    question: "Which routes perform best?",
    path: "M12 21s7-6.5 7-11.5A7 7 0 1 0 5 9.5C5 14.5 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  },
  {
    label: "Warehouse stock",
    question: "Warehouse stock status",
    path: "M7.5 10.5h9v9h-9z M3.5 3.5h9v7h-9zM12.5 6.5h8v7h-8z",
  },
  {
    label: "Cash flow",
    question: "Cash flow summary",
    path: "M4 7h13M14 3l4 4-4 4M20 17H7M10 13l-4 4 4 4",
  },
  {
    label: "Customers",
    question: "Top customers this period",
    path: "M9 8.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5 M17 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M16 14.7c2.7.3 4.7 1.9 5.3 4.8",
  },
];

function ChipIcon({ path, size = 15 }: { path: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function SparkIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    </svg>
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** Full-page AI Reporting module — same chat engine as the floating assistant. */
export default function AiReportingView() {
  const askRef = useRef<((q: string) => void) | null>(null);
  const [chatActive, setChatActive] = useState(false);

  const registerAsk = useCallback((ask: (q: string) => void) => {
    askRef.current = ask;
  }, []);
  const handleActiveChange = useCallback((active: boolean) => {
    setChatActive(active);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mx-auto flex h-[calc(100vh-7rem)] max-w-6xl flex-col gap-4"
    >
      {/* Banner — collapses to a slim pill once the conversation starts.
          Height is animated for real (not a transform), so the chat below
          genuinely reflows and grows into the reclaimed space. */}
      <div
        className={`relative shrink-0 overflow-hidden border border-white/10 bg-gradient-to-br from-[#0B2450] via-[#123A82] to-[#06152B] text-white transition-[border-radius] duration-300 ${
          chatActive ? "rounded-full" : "rounded-2xl"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="pointer-events-none absolute -top-24 -right-12 h-56 w-56 rounded-full bg-[#2E7DFF]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-40 h-52 w-52 rounded-full bg-[#FF6A00]/15 blur-3xl" />

        <AnimatePresence mode="wait" initial={false}>
          {chatActive ? (
            <motion.div
              key="compact"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: EASE }}
              className="relative overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#FF9A4D]">
                  <SparkIcon size={14} />
                </span>
                <span className="shrink-0 text-sm font-semibold">
                  AI Reporting
                </span>

                <div className="ml-auto hidden items-center gap-1.5 overflow-x-auto sm:flex">
                  {CAPABILITIES.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => askRef.current?.(c.question)}
                      className="group flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                    >
                      <span className="text-[#FF9A4D] transition-colors group-hover:text-[#FF6A00]">
                        <ChipIcon path={c.path} size={13} />
                      </span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="full"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: EASE }}
              className="relative overflow-hidden"
            >
              <div className="px-6 py-7 sm:px-8">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide text-white/85 uppercase">
                  <SparkIcon />
                  AI powered
                </span>

                <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  AI Reporting
                </h1>
                <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/65">
                  Ask for any report in plain language. The assistant reads your
                  live dashboard data and answers with figures and tables.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {CAPABILITIES.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => askRef.current?.(c.question)}
                      className="group flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/85 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 hover:text-white"
                    >
                      <span className="text-[#FF9A4D] transition-colors group-hover:text-[#FF6A00]">
                        <ChipIcon path={c.path} />
                      </span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat surface — grows as the banner collapses */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_36px_-18px_rgba(6,21,43,0.28)] dark:border-neutral-800 dark:bg-neutral-900">
        <AiChat
          variant="page"
          registerAsk={registerAsk}
          onActiveChange={handleActiveChange}
        />
      </div>
    </motion.div>
  );
}
