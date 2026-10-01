"use client";

import { motion, useReducedMotion } from "framer-motion";

const SERVICES = [
  {
    title: "Freight & Shipments",
    body: "Nationwide trucking between major cities with real-time tracking.",
    path: "M2 6h11v10H2zM13 10h4l3 3v3h-7z M6.5 17.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM16.5 17.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z",
  },
  {
    title: "Warehousing Solutions",
    body: "Safe, secure, and strategically located warehouse facilities.",
    path: "M7.5 10.5h9v9h-9z M3.5 3.5h9v7h-9zM12.5 6.5h8v7h-8z",
  },
  {
    title: "Fleet Management",
    body: "Well-maintained fleet ensuring reliability on every route.",
    path: "M14.5 6.5a4 4 0 0 1 5-5l-3 3 .7 2.3 2.3.7 3-3a4 4 0 0 1-5 5L7 20a2 2 0 0 1-3-3z",
  },
  {
    title: "Procurement Services",
    body: "Sourcing and delivery of fuel, parts, and essentials.",
    path: "M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.3h7.7a1.5 1.5 0 0 0 1.5-1.2L20 8H6 M10 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM16.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  },
  {
    title: "Real-time Tracking",
    body: "Live visibility of your shipments at every step of the way.",
    path: "M12 21s7-6.5 7-11.5A7 7 0 1 0 5 9.5C5 14.5 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  },
  {
    title: "Dedicated Support",
    body: "A support team that's always ready to assist you.",
    path: "M4 12v-1a8 8 0 0 1 16 0v1 M3 13a2 2 0 0 1 2-2h1v6H5a2 2 0 0 1-2-2zM21 13a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2z M6 19c0 1 3 2 6 2",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const grid = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.085, delayChildren: 0.1 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function Services() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="services" className="relative bg-[#06152B] pt-20 pb-24 text-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        {/* Heading block */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <p className="text-sm font-semibold tracking-[0.12em] text-[#FF6A00] uppercase">
              Our services
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[42px]">
              End-to-end logistics
              <br className="hidden sm:block" /> solutions, built for speed.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#94A3B8]">
              From freight movement to warehousing and fleet management —
              <br className="hidden sm:block" /> we handle everything so you can
              focus on your business.
            </p>
          </motion.div>

          <motion.a
            href="#coverage"
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="group inline-flex shrink-0 items-center gap-2 self-start border-b border-white/25 pb-1 text-sm font-medium text-white transition-colors hover:border-[#FF6A00] lg:self-auto lg:mb-2"
          >
            Explore all services
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-[#FF6A00] transition-transform duration-300 group-hover:translate-x-1"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </motion.a>
        </div>

        {/* Six service cards */}
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={grid}
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          {SERVICES.map((s) => (
            <motion.a
              key={s.title}
              href="#coverage"
              variants={cardVariant}
              className="group flex flex-col rounded-xl border border-[#1557FF]/20 bg-[#0A1E3A] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#1557FF]/50"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1557FF]/12 text-[#2E7DFF] transition-shadow duration-300 group-hover:shadow-[0_0_18px_rgba(37,99,255,0.35)]">
                <svg
                  width={21}
                  height={21}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={s.path} />
                </svg>
              </span>

              <h3 className="mt-7 text-lg font-bold leading-snug text-white">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
                {s.body}
              </p>

              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="mt-6 text-[#FF6A00] transition-transform duration-300 group-hover:translate-x-1.5"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
