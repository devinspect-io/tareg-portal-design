"use client";

import { motion, useReducedMotion } from "framer-motion";

// Sedan side profile facing right (direction of travel). Proportions carry the
// direction: long bonnet and raked windshield up front, cabin set back, short
// upright trunk behind, and the beltline dipping toward the nose.
const BODY =
  "M10 58 L10 46 Q10 40 16 39 L44 36 Q52 22 66 17 Q72 14 86 14 L112 14 Q124 14 134 22 L150 34 L184 37 Q194 39 194 47 L194 58 L176 58 A18 18 0 0 0 140 58 L64 58 A18 18 0 0 0 28 58 Z";

function Wheel({ cx, spin }: { cx: number; spin: boolean }) {
  return (
    <g transform={`translate(${cx} 58)`}>
      <circle r={13} fill="#0B1220" />
      {/* Positive rotation = clockwise = rolling forward to the right */}
      <motion.g
        animate={spin ? { rotate: 360 } : undefined}
        transition={{ duration: 0.45, repeat: Infinity, ease: "linear" }}
      >
        <circle r={8} fill="#CBD5E1" />
        {[0, 60, 120].map((a) => (
          <rect key={a} x={-1} y={-7} width={2} height={14} rx={1} fill="#64748B" transform={`rotate(${a})`} />
        ))}
        <circle r={2.5} fill="#334155" />
      </motion.g>
    </g>
  );
}

/** Body paints in currentColor, so the parent's text color themes it. */
export default function CarGlyph({ className, spin = true }: { className?: string; spin?: boolean }) {
  const reduceMotion = useReducedMotion();
  const spinning = spin && !reduceMotion;

  return (
    <svg viewBox="0 0 210 80" fill="none" className={className} aria-hidden="true">
      <ellipse cx={102} cy={73} rx={90} ry={4} fill="currentColor" opacity={0.18} />

      {/* Headlight beam reaching ahead of the car */}
      <path d="M193 40 L210 35 L210 50 L193 45 Z" fill="#FEF3C7" fillOpacity={0.45} />

      <path d={BODY} fill="currentColor" />

      {/* Glass: short rear window, longer front window under the raked windshield */}
      <path d="M52 35 Q58 24 68 20 L92 19 L92 35 Z" fill="white" fillOpacity={0.55} />
      <path d="M98 19 L113 19 Q123 19 131 25 L142 35 L98 35 Z" fill="white" fillOpacity={0.55} />

      {/* Shoulder highlight, door seam, handles, sill shadow */}
      <path d="M18 40 L46 37 L150 36 L186 38.5" stroke="white" strokeOpacity={0.3} strokeWidth={1.5} strokeLinecap="round" />
      <path d="M95 36 L95 56" stroke="#0B1220" strokeOpacity={0.2} strokeWidth={1.2} />
      <rect x={78} y={41} width={8} height={1.8} rx={0.9} fill="#0B1220" fillOpacity={0.3} />
      <rect x={114} y={41} width={8} height={1.8} rx={0.9} fill="#0B1220" fillOpacity={0.3} />
      <path d="M64 55 L139 55" stroke="#0B1220" strokeOpacity={0.15} strokeWidth={3} strokeLinecap="round" />

      {/* Mirror at the windshield base, headlight at the nose, taillight at the tail */}
      <path d="M138 30 L146 29 L146 34 L140 34 Z" fill="currentColor" />
      <path d="M183 38 L193 40 L193 45 L183 44 Z" fill="#FEF3C7" />
      <rect x={10} y={41} width={5} height={5} rx={1.5} fill="#F87171" />

      <Wheel cx={46} spin={spinning} />
      <Wheel cx={158} spin={spinning} />
    </svg>
  );
}
