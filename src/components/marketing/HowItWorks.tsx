"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

const STEPS = [
  {
    title: "Book your shipment",
    body: "Share pickup, drop-off, and cargo details online or by phone.",
  },
  {
    title: "We collect & load",
    body: "A driver arrives in the scheduled window and secures the cargo.",
  },
  {
    title: "In transit",
    body: "Track the route in real time until it reaches its destination.",
  },
  {
    title: "Delivered & invoiced",
    body: "Proof of delivery and your invoice land the same day.",
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/** Pulsing marker that rides the progress track (was a truck photo). */
function TrackMarker() {
  return (
    <span className="relative flex h-5 w-5 items-center justify-center">
      <span className="absolute h-5 w-5 animate-ping rounded-full bg-[#FF6A00]/50" />
      <span className="relative h-3 w-3 rounded-full bg-[#FF6A00] shadow-[0_0_0_4px_rgba(6,21,43,1),0_6px_10px_rgba(0,0,0,0.45)]" />
    </span>
  );
}

export default function HowItWorks() {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 0.85", "end 0.55"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 22,
    restDelta: 0.001,
  });
  // The truck wrapper is exactly the track width, so translating it by 100% of
  // itself walks the truck from step 1 to step 4 — a GPU transform rather than
  // animating `left`, which would relayout every frame.
  const truckX = useTransform(progress, [0, 1], ["0%", "100%"]);

  return (
    // overflow-hidden: the truck's wrapper is full-track-width and translated
    // by up to 100% of itself, so at the end of the scroll it extends past the
    // viewport and would otherwise add horizontal page scroll.
    <section id="how" className="relative overflow-hidden bg-[#06152B] py-24 text-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-sm font-semibold tracking-[0.12em] text-[#FF6A00] uppercase"
        >
          How it works
        </motion.p>

        <motion.h2
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.55, delay: 0.08, ease: EASE }}
          className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-4xl font-bold sm:text-5xl"
        >
          How a shipment moves
        </motion.h2>

        <div
          ref={trackRef}
          className="relative mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* Track spans centre-to-centre of the first and last markers. The
              markers are left-aligned in their columns, not centred, so the
              track starts 24px in (half a 48px marker). With 4 equal columns
              and a 32px gap that distance works out to 75% + 24px. */}
          <div className="pointer-events-none absolute top-6 left-6 hidden w-[calc(75%+24px)] lg:block">
            <div className="h-px w-full bg-white/15" />
            {/* The fill spans the same distance the marker travels, so its
                leading edge stays under the marker instead of running ahead
                of it. With motion off there's no marker, so it fills the track. */}
            <motion.div
              className={`absolute top-0 left-0 h-px origin-left bg-[#FF6A00] ${
                reduceMotion ? "w-full" : "w-[calc(100%-40px)]"
              }`}
              style={reduceMotion ? { scaleX: 1 } : { scaleX: progress }}
            />
            {/* z-20 keeps the marker above the z-10 step badges — otherwise it
                vanishes behind each badge as it passes one. Travel stops short
                of the track end by half the marker (10px) plus the badge radius
                (24px) plus a small gap, so it pulls up at step 4 rather than
                sitting on top of the badge. */}
            {!reduceMotion && (
              <motion.div
                className="absolute inset-y-0 left-0 z-20 w-[calc(100%-40px)]"
                style={{ x: truckX }}
              >
                <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2">
                  <TrackMarker />
                </div>
              </motion.div>
            )}
          </div>

          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.09, ease: EASE }}
              className="relative"
            >
              <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#2E7DFF] bg-[#06152B] font-[family-name:var(--font-display)] text-xl font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-8 font-semibold text-white">{step.title}</h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#94A3B8]">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
