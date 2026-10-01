"use client";

import { motion, useReducedMotion } from "framer-motion";

// Sedan side profile facing right: trunk, sloped rear glass, roof, windshield,
// hood, nose, with both wheel arches cut out of the sill line.
const BODY =
  "M12 58 L12 48 Q12 42 20 40 L52 36 Q66 20 86 16 L124 14 Q140 14 152 26 L160 34 L182 38 Q192 40 192 48 L192 58 L172 58 A17 17 0 0 0 138 58 L65 58 A17 17 0 0 0 31 58 Z";

function Wheel({ cx, spin }: { cx: number; spin: boolean }) {
  return (
    <g transform={`translate(${cx} 58)`}>
      <circle r={13} fill="#0B1220" />
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
    <svg viewBox="0 0 204 80" fill="none" className={className} aria-hidden="true">
      <ellipse cx={102} cy={73} rx={88} ry={4} fill="currentColor" opacity={0.18} />
      <path d={BODY} fill="currentColor" />

      {/* Glass */}
      <path d="M58 36 Q68 23 86 20 L102 19 L102 36 Z" fill="white" fillOpacity={0.55} />
      <path d="M108 19 L122 18 Q137 18 147 30 L151 36 L108 36 Z" fill="white" fillOpacity={0.55} />

      {/* Shoulder highlight, door seam, handles, sill shadow */}
      <path d="M22 41 L58 38 L152 38 L182 40" stroke="white" strokeOpacity={0.3} strokeWidth={1.5} strokeLinecap="round" />
      <path d="M105 37 L105 56" stroke="#0B1220" strokeOpacity={0.2} strokeWidth={1.2} />
      <rect x={90} y={42} width={8} height={1.8} rx={0.9} fill="#0B1220" fillOpacity={0.3} />
      <rect x={124} y={42} width={8} height={1.8} rx={0.9} fill="#0B1220" fillOpacity={0.3} />
      <path d="M66 55 L137 55" stroke="#0B1220" strokeOpacity={0.15} strokeWidth={3} strokeLinecap="round" />

      {/* Mirror, headlight, taillight */}
      <path d="M147 33 L154 32 L154 37 L149 37 Z" fill="currentColor" />
      <path d="M181 40 L190 42 L190 46 L181 45 Z" fill="#FEF3C7" />
      <rect x={12} y={42} width={6} height={5} rx={1.5} fill="#F87171" />

      <Wheel cx={48} spin={spinning} />
      <Wheel cx={155} spin={spinning} />
    </svg>
  );
}
