"use client";

import { motion, useReducedMotion } from "framer-motion";
import CarGlyph from "@/components/CarGlyph";

type LoaderProps = {
  /** Diameter of the inline route ring in px. */
  size?: number;
  /** Visible label (also announced to screen readers). */
  label?: string;
  /** Cover the viewport — for page/route loading. Renders the car variant. */
  fullScreen?: boolean;
  className?: string;
};

/**
 * Inline variant: a shipment travelling a circular route. Stays legible from
 * 16px (button spinners) up to ~64px, unlike a detailed truck glyph.
 */
function RouteRing({ size }: { size: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* The route */}
      <circle
        cx={50}
        cy={50}
        r={38}
        stroke="currentColor"
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray="10 14"
        opacity={0.25}
      />
      {/* Leading arc + the shipment riding it */}
      <motion.g
        style={{ originX: "50%", originY: "50%" }}
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 1.15, repeat: Infinity, ease: "linear" }}
      >
        <path
          d="M50 12a38 38 0 0 1 33 19"
          stroke="currentColor"
          strokeWidth={9}
          strokeLinecap="round"
        />
        <circle cx={50} cy={12} r={7} fill="currentColor" />
      </motion.g>
    </svg>
  );
}

/**
 * Full-screen variant: a car running a dashed road. dir="ltr" pins the scene
 * so the car keeps facing its direction of travel in Arabic too.
 */
function CarOnRoad() {
  const reduceMotion = useReducedMotion();

  return (
    <div dir="ltr" className="relative w-[200px]" aria-hidden="true">
      <svg width={40} height={30} viewBox="0 0 40 30" fill="none" className="absolute top-3 left-0">
        {[0, 1, 2].map((i) => (
          <motion.line
            key={i}
            x1={4}
            y1={5 + i * 10}
            x2={30}
            y2={5 + i * 10}
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.45}
            animate={reduceMotion ? undefined : { x: [-14, 6, -14], opacity: [0, 0.55, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut", delay: i * 0.16 }}
          />
        ))}
      </svg>

      <motion.div
        className="ml-10"
        animate={reduceMotion ? undefined : { y: [0, -1.5, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <CarGlyph className="w-[156px]" />
      </motion.div>

      <svg width={200} height={8} viewBox="0 0 200 8" fill="none" className="mt-1">
        <motion.line
          x1={0}
          y1={4}
          x2={200}
          y2={4}
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="16 14"
          opacity={0.4}
          animate={reduceMotion ? undefined : { strokeDashoffset: [0, -30] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
        />
      </svg>
    </div>
  );
}

/**
 * Tareg loading indicator. Inherits `currentColor`, so set a text
 * color on the parent (or via className) to theme it.
 *
 * Inline (buttons, cards):  <Loader size={18} className="text-white" />
 * Whole screen / route:     <Loader fullScreen label="Loading your dashboard…" />
 * (wrap the fullScreen usage in <AnimatePresence> to get the fade-out)
 */
export default function Loader({
  size = 40,
  label,
  fullScreen = false,
  className,
}: LoaderProps) {
  const content = (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center gap-3 ${className ?? ""}`}
    >
      {fullScreen ? <CarOnRoad /> : <RouteRing size={size} />}
      {label && (
        <p className="text-sm font-medium tracking-wide opacity-70">{label}</p>
      )}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 text-prime-600 backdrop-blur-sm dark:bg-neutral-950/80 dark:text-prime-400"
      >
        {content}
      </motion.div>
    );
  }

  return content;
}
