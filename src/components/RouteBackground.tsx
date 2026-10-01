"use client";

import { motion, useReducedMotion } from "framer-motion";
import Gear from "@/components/Gear";
import CarGlyph from "@/components/CarGlyph";

const SPOKE_ANGLES = [0, 72, 144, 216, 288];

// Motion streaks whooshing across the page: top position, width, timing
const STREAKS = [
  { top: "16%", width: 320, delay: 0, duration: 1.4, repeatDelay: 2.6 },
  { top: "27%", width: 200, delay: 0.9, duration: 1.1, repeatDelay: 3.4 },
  { top: "58%", width: 380, delay: 1.7, duration: 1.6, repeatDelay: 2.9 },
  { top: "71%", width: 240, delay: 0.4, duration: 1.2, repeatDelay: 3.8 },
  { top: "86%", width: 300, delay: 2.2, duration: 1.4, repeatDelay: 3.1 },
];

/** Wheel: tire, rim, five spokes, hub — spins slowly. */
function Wheel({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <circle cx={100} cy={100} r={92} fill="none" stroke="currentColor" strokeWidth={10} />
      <circle cx={100} cy={100} r={70} fill="none" stroke="currentColor" strokeWidth={4} />
      {SPOKE_ANGLES.map((a) => (
        <line
          key={a}
          x1={100}
          y1={100}
          x2={100}
          y2={32}
          stroke="currentColor"
          strokeWidth={7}
          strokeLinecap="round"
          transform={`rotate(${a} 100 100)`}
        />
      ))}
      <circle cx={100} cy={100} r={14} fill="none" stroke="currentColor" strokeWidth={6} />
    </svg>
  );
}

// Ambient particles drifting up: horizontal position, timing, size (deterministic — no Math.random)
const PARTICLES = [
  { left: "8%", delay: 0, duration: 9, size: 4 },
  { left: "18%", delay: 3, duration: 11, size: 3 },
  { left: "31%", delay: 6, duration: 8, size: 5 },
  { left: "47%", delay: 1.5, duration: 10, size: 3 },
  { left: "58%", delay: 4.5, duration: 9, size: 4 },
  { left: "72%", delay: 2, duration: 12, size: 3 },
  { left: "84%", delay: 5, duration: 8, size: 4 },
  { left: "93%", delay: 7, duration: 10, size: 3 },
];

/**
 * Car that drives across the bottom of the page. Faded with `opacity` rather
 * than a translucent text color, so the glyph's fixed-color glass, tyres and
 * lights fade along with the body.
 */
function DeliveryCar() {
  return (
    <motion.div
      className="absolute bottom-10 left-0 w-56 text-prime-700 opacity-30 sm:w-64"
      initial={{ x: "-30vw" }}
      animate={{ x: "115vw" }}
      transition={{ duration: 3, delay: 1.5, repeat: Infinity, repeatDelay: 6, ease: "linear" }}
    >
      {/* Motion trail behind the car */}
      <div className="absolute top-1/3 -left-36 flex w-32 flex-col items-end gap-2">
        <div className="h-0.5 w-full rounded-full bg-gradient-to-l from-prime-500/50 to-transparent" />
        <div className="h-0.5 w-2/3 rounded-full bg-gradient-to-l from-prime-500/35 to-transparent" />
        <div className="h-0.5 w-1/3 rounded-full bg-gradient-to-l from-prime-500/25 to-transparent" />
      </div>
      <motion.div animate={{ y: [0, -1.5, 0] }} transition={{ duration: 0.4, repeat: Infinity }}>
        <CarGlyph className="w-full" />
      </motion.div>
    </motion.div>
  );
}

/** Diagonal tire tracks: two parallel bands of tread blocks. */
function TireTracks({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1600 400" className={className} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern id="tread" width={44} height={40} patternUnits="userSpaceOnUse">
          <rect x={0} y={6} width={28} height={12} rx={3} fill="currentColor" />
          <rect x={22} y={26} width={28} height={12} rx={3} fill="currentColor" />
        </pattern>
      </defs>
      <rect x={0} y={80} width={1600} height={80} fill="url(#tread)" />
      <rect x={0} y={240} width={1600} height={80} fill="url(#tread)" />
    </svg>
  );
}

/**
 * Animated route scene behind the login card: spinning wheel + gear,
 * motion streaks, tire tracks, a dashed route strip, and soft blue/orange blobs.
 */
export default function RouteBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Soft blue/orange blobs for depth */}
      <motion.div
        className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-prime-500/20 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full bg-accent-400/25 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, -40, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Diagonal tire tracks crossing the page */}
      <TireTracks className="absolute -left-1/4 top-1/3 h-[28rem] w-[160%] -rotate-[18deg] text-prime-900/[0.035]" />

      {/* Giant spinning wheel, bleeding off the left edge */}
      <motion.div
        className="absolute top-1/2 -left-56 h-[38rem] w-[38rem] -translate-y-1/2 text-prime-600/[0.09] max-lg:-left-72 max-lg:h-[28rem] max-lg:w-[28rem]"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      >
        <Wheel className="h-full w-full" />
      </motion.div>

      {/* Gear rotating the other way, top-right */}
      <motion.div
        className="absolute -top-24 -right-24 h-[22rem] w-[22rem] text-prime-700/[0.08]"
        animate={reduceMotion ? undefined : { rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <Gear className="h-full w-full" />
      </motion.div>

      {/* Small companion gear meshing below it */}
      <motion.div
        className="absolute top-56 right-56 h-40 w-40 text-prime-600/[0.07] max-md:hidden"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      >
        <Gear className="h-full w-full" />
      </motion.div>

      {/* Motion streaks whooshing across, alternating blue/orange */}
      {!reduceMotion &&
        STREAKS.map(({ top, width, delay, duration, repeatDelay }, i) => (
          <motion.div
            key={i}
            className={`absolute h-0.5 rounded-full bg-gradient-to-r from-transparent ${
              i % 2 === 0 ? "via-prime-500/50" : "via-accent-500/50"
            } to-transparent`}
            style={{ top, width }}
            initial={{ x: "-30vw", opacity: 0 }}
            animate={{ x: "110vw", opacity: [0, 1, 1, 0] }}
            transition={{ duration, delay, repeat: Infinity, repeatDelay, ease: "easeIn" }}
          />
        ))}

      {/* Ambient particles drifting up */}
      {!reduceMotion &&
        PARTICLES.map(({ left, delay, duration, size }, i) => (
          <motion.div
            key={i}
            className="absolute -bottom-2 rounded-full bg-prime-500"
            style={{
              left,
              width: size,
              height: size,
              boxShadow: "0 0 6px rgba(18, 58, 130, 0.7)",
            }}
            animate={{
              y: [0, -560],
              x: [0, i % 2 === 0 ? 24 : -24, i % 2 === 0 ? -12 : 12, 0],
              opacity: [0, 0.7, 0.5, 0],
            }}
            transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
          />
        ))}

      {/* Car driving across the bottom */}
      {!reduceMotion && <DeliveryCar />}

      {/* Dashed route strip along the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-8 overflow-hidden opacity-[0.07]">
        <motion.div
          className="h-full w-[200%]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #03162e 0px, #03162e 24px, transparent 24px, transparent 48px)",
            backgroundSize: "96px 100%",
          }}
          animate={reduceMotion ? undefined : { x: [0, -96] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}
