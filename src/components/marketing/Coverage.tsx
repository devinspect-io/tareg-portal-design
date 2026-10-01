"use client";

import { motion, useReducedMotion } from "framer-motion";

const OFFICE_ICON =
  "M4 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16 M12 21V10h6a1 1 0 0 1 1 1v10 M3 21h18 M7 8h2M7 12h2M7 16h2M15 14h1M15 18h1";
const DEPOT_ICON =
  "M3 21V9.5L12 4l9 5.5V21 M2 21h20 M7 21v-6.5h10V21 M10 21v-3.5h4V21";

const WAYPOINTS = [
  {
    city: "Dubai",
    role: "Head office",
    detail: "Deira · Jebel Ali · Al Quoz · Business Bay",
    icon: OFFICE_ICON,
  },
  {
    city: "Riyadh",
    role: "Regional hub",
    detail: "Full-service depot",
    icon: DEPOT_ICON,
  },
  {
    city: "Abu Dhabi",
    role: "Regional hub",
    detail: "Full-service depot",
    icon: OFFICE_ICON,
  },
  { city: "Jeddah", role: "Depot", detail: "Al Balad", icon: DEPOT_ICON },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/** Pins sit at the tip of the marker, so the glyph is offset up-left of it. */
const PINS = [
  { x: 92, y: 128 },
  { x: 268, y: 96 },
  { x: 330, y: 168 },
];

const MAP_ROUTES = [
  { d: "M92 128 Q 180 58 268 96", dashed: false },
  { d: "M268 96 Q 322 118 330 168", dashed: true },
];

function NetworkMap() {
  const reduceMotion = useReducedMotion();

  return (
    <svg viewBox="0 0 420 260" className="h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="cov-dots" width={7} height={7} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={1} fill="#3B82F6" opacity={0.3} />
        </pattern>
        <radialGradient id="cov-fade" cx="0.5" cy="0.45" r="0.62">
          <stop offset="0%" stopColor="white" stopOpacity={1} />
          <stop offset="65%" stopColor="white" stopOpacity={0.5} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </radialGradient>
        <mask id="cov-mask">
          <rect width="420" height="260" fill="url(#cov-fade)" />
        </mask>
      </defs>

      <rect width="420" height="260" fill="url(#cov-dots)" mask="url(#cov-mask)" />

      {MAP_ROUTES.map((r, i) => (
        <motion.path
          key={r.d}
          d={r.d}
          fill="none"
          stroke="#FF6A00"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeDasharray={r.dashed ? "2 7" : undefined}
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.85 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, delay: 0.2 + i * 0.25, ease: EASE }}
        />
      ))}

      {PINS.map((p, i) => (
        <g key={`${p.x}-${p.y}`}>
          <ellipse cx={p.x} cy={p.y + 2} rx={13} ry={4} fill="#2E7DFF" opacity={0.28} />
          {!reduceMotion && (
            <motion.circle
              cx={p.x}
              cy={p.y}
              r={7}
              fill="#2E7DFF"
              initial={{ scale: 0.6, opacity: 0.45 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: i * 0.5 }}
              style={{ transformOrigin: `${p.x}px ${p.y}px` }}
            />
          )}
          {/* Positioning stays on a static <g>; framer animates an inner group.
              Putting both on one element lets framer's transform clobber the
              translate, which drops every pin back toward the origin. */}
          <g transform={`translate(${p.x - 12}, ${p.y - 22})`}>
            <motion.g
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: 0.5 + i * 0.15, ease: EASE }}
            >
              <path
                d="M12 22s7-7.2 7-12.2A7 7 0 1 0 5 9.8C5 14.8 12 22 12 22z"
                fill="#2E7DFF"
              />
              <circle cx={12} cy={9.6} r={2.6} fill="#06152B" />
            </motion.g>
          </g>
        </g>
      ))}
    </svg>
  );
}

export default function Coverage() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="coverage" className="bg-[#06152B] py-24 text-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <p className="text-sm font-semibold tracking-[0.12em] text-[#FF6A00] uppercase">
              Our network
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold sm:text-5xl">
              Where we operate
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#94A3B8]">
              One head office, three regional hubs, and depots wherever the
              freight needs to stop.
            </p>
          </motion.div>

          <div className="relative h-[220px] sm:h-[260px]">
            <NetworkMap />
          </div>
        </div>

        <div className="mt-16 grid gap-y-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-white/10">
          {WAYPOINTS.map((w, i) => (
            <motion.div
              key={w.city}
              initial={reduceMotion ? false : { opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.09, ease: EASE }}
              className="lg:px-8 lg:first:pl-0"
            >
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#1557FF]/10 text-[#2E7DFF]">
                <svg
                  width={28}
                  height={28}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={w.icon} />
                </svg>
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-[#FF6A00]" />
              </span>

              <h3 className="mt-6 text-2xl font-bold text-white">{w.city}</h3>
              <p className="mt-1.5 text-sm font-semibold text-[#FF6A00]">
                {w.role}
              </p>
              <p className="mt-2.5 max-w-[15rem] text-sm leading-relaxed text-[#94A3B8]">
                {w.detail}
              </p>

              <a
                href="#contact"
                className="group mt-5 inline-flex items-center gap-2 rounded-full border border-[#2E7DFF]/40 px-4 py-2 text-xs font-semibold text-[#2E7DFF] transition-colors hover:border-[#2E7DFF] hover:bg-[#1557FF]/10 hover:text-white"
              >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 21s7-6.5 7-11.5A7 7 0 1 0 5 9.5C5 14.5 12 21 12 21z" />
                  <circle cx={12} cy={9.5} r={2.5} />
                </svg>
                View location
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
