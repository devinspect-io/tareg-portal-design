"use client";

import { motion, useReducedMotion } from "framer-motion";

// The network spans the full panel now that nothing overlaps it. The truck
// occupies roughly x 78-460 / y 155-340, so nodes sit left of or above it, and
// every label is kept inside the 460 viewBox so none get clipped at the edge.
type City = {
  name: string;
  x: number;
  y: number;
  anchor: "start" | "end";
  /** Vertical nudge for the label; defaults to sitting level with the dot. */
  labelDy?: number;
};

const CITIES: City[] = [
  // Lifted clear of the arc, which passes right through the default position.
  { name: "Abu Dhabi", x: 178, y: 38, anchor: "start", labelDy: -12 },
  { name: "Riyadh", x: 368, y: 56, anchor: "start" },
  { name: "Dubai", x: 48, y: 158, anchor: "start" },
  { name: "Jeddah", x: 360, y: 142, anchor: "start" },
];

const ROUTES = [
  // Dubai sweeps up the left side to Abu Dhabi
  "M48 158 Q 88 58 178 38",
  // Abu Dhabi arcs the full width across to Riyadh
  "M178 38 Q 275 22 368 56",
  // Riyadh dives down behind the truck and resurfaces at Jeddah
  "M368 56 Q 240 270 360 142",
];

const ROUTE_ORANGE = "#FF6A00";

/** Dotted map + curved orange routes, drawn behind the hero truck. */
export default function RouteMap() {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      viewBox="0 0 460 340"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <pattern id="map-dots" width={9} height={9} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={1} fill="#8FB4FF" opacity={0.16} />
        </pattern>
        {/* Fades the dot field out toward the lower-left so it reads as a
            map panel behind the cities rather than a full-bleed grid. */}
        <radialGradient id="map-fade" cx="0.5" cy="0.28" r="0.92">
          <stop offset="0%" stopColor="white" stopOpacity={1} />
          <stop offset="60%" stopColor="white" stopOpacity={0.55} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </radialGradient>
        <mask id="map-mask">
          <rect width="460" height="340" fill="url(#map-fade)" />
        </mask>
      </defs>

      <rect width="460" height="340" fill="url(#map-dots)" mask="url(#map-mask)" />

      {ROUTES.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke={ROUTE_ORANGE}
          strokeWidth={1.9}
          strokeLinecap="round"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.75 }}
          transition={{ duration: 1.1, delay: 0.6 + i * 0.25, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}

      {/* Brighter dashes travelling the same paths — reads as cargo in transit */}
      {!reduceMotion &&
        ROUTES.map((d, i) => (
          <motion.path
            key={`${d}-flow`}
            d={d}
            fill="none"
            stroke="#FFB273"
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeDasharray="1 12"
            initial={{ strokeDashoffset: 0, opacity: 0 }}
            animate={{ strokeDashoffset: -26, opacity: 0.9 }}
            transition={{
              strokeDashoffset: { duration: 1.5, repeat: Infinity, ease: "linear", delay: 1.8 + i * 0.25 },
              opacity: { duration: 0.4, delay: 1.8 + i * 0.25 },
            }}
          />
        ))}

      {CITIES.map((c, i) => (
        <g key={c.name}>
          {!reduceMotion && (
            <motion.circle
              cx={c.x}
              cy={c.y}
              r={5.5}
              fill="none"
              stroke="#2E7DFF"
              strokeWidth={1}
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1.4 + i * 0.3 }}
              style={{ transformOrigin: `${c.x}px ${c.y}px` }}
            />
          )}
          <motion.circle
            cx={c.x}
            cy={c.y}
            r={5.5}
            fill="#2E7DFF"
            initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.9 + i * 0.15 }}
            style={{ transformOrigin: `${c.x}px ${c.y}px` }}
          />
          <motion.text
            x={c.anchor === "end" ? c.x - 11 : c.x + 11}
            y={c.y + (c.labelDy ?? 4.5)}
            textAnchor={c.anchor}
            fill="white"
            fillOpacity={0.9}
            fontSize={14}
            fontFamily="var(--font-geist-sans), system-ui, sans-serif"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1 + i * 0.15 }}
          >
            {c.name}
          </motion.text>
        </g>
      ))}
    </svg>
  );
}
