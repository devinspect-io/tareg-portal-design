"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import RouteMap from "@/components/marketing/RouteMap";
import StatsBand from "@/components/marketing/StatsBand";

const FEATURES = [
  {
    title: "Real-time tracking",
    body: "Live visibility at every step",
    path: "M12 21s7-6.5 7-11.5A7 7 0 1 0 5 9.5C5 14.5 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  },
  {
    title: "Secure & insured",
    body: "Your cargo is always protected",
    path: "M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z M9 12l2 2 4-4",
  },
  {
    title: "24/7 support",
    body: "Our team is always ready to help",
    path: "M4 12v-1a8 8 0 0 1 16 0v1 M3 13a2 2 0 0 1 2-2h1v6H5a2 2 0 0 1-2-2zM21 13a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2z M6 19c0 1 3 2 6 2",
  },
];

function FeatureIcon({ path }: { path: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export default function Hero() {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 50]);

  return (
    <section ref={heroRef} className="relative overflow-hidden bg-[#06152B] pt-36 pb-20 text-white md:pt-44 md:pb-24">
      {/* Plain gradient wash in place of the old hero photo — keeps the
          existing navy/orange palette (theme pass comes later), just the
          hero background breathing via a slow scale pulse. */}
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgba(255,101,8,0.12),transparent_60%)]"
        style={reduceMotion ? undefined : { y: bgY }}
        animate={reduceMotion ? undefined : { scale: [1, 1.045, 1] }}
        transition={reduceMotion ? undefined : { duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#06152B] via-[#06152B]/60 to-transparent" />
      {/* Fades the background photo out to exactly #06152B before the section
          ends, so the bright light trails never get cut off at the hero's edge.
          Kept short so the road stays visible behind the stats bar. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#06152B] to-transparent" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 md:px-8 lg:grid-cols-2 lg:gap-8">
        <div>
          <motion.span
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/80"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF6508]" />
            Reliable. Fast. Nationwide.
          </motion.span>

          <h1 className="mt-5 max-w-xl font-[family-name:var(--font-display)] text-5xl leading-[1.05] font-bold sm:text-6xl lg:text-7xl">
            <motion.span
              className="block"
              initial={reduceMotion ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              Freight that
            </motion.span>
            <motion.span
              className="block"
              initial={reduceMotion ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              keeps its <span className="text-[#FF6508]">word.</span>
            </motion.span>
          </h1>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-md text-lg text-[#AAB7CA]"
          >
            Tareg moves freight, manages warehousing, and keeps
            fleets running across Dubai, Riyadh, Abu Dhabi, and Jeddah.
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.54, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4"
          >
            <a
              href="mailto:sales@tareg.com"
              className="flex items-center gap-2 rounded-md bg-[#FF6508] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e85a00]"
            >
              Get a shipping quote
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
            <a
              href="#how"
              className="flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
                <circle cx={12} cy={12} r={10} />
                <path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" stroke="none" />
              </svg>
              See how it works
            </a>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.66 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-[#FF6508]">
                  <FeatureIcon path={f.path} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-[#AAB7CA]">{f.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: 32, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-[320px] sm:h-[400px] lg:h-[500px]"
        >
          <RouteMap />
        </motion.div>
      </div>

      {/* Stats bar lives inside the hero so it sits over the road and trails,
          and so no wrapper background is needed between the sections. */}
      <div className="relative mx-auto mt-10 max-w-7xl px-5 md:mt-12 md:px-8">
        <StatsBand />
      </div>
    </section>
  );
}
