"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import sectionFour from "@/assets/sectionfour.png";

const EASE = [0.22, 1, 0.36, 1] as const;

const FEATURES = [
  {
    title: "Reliable delivery",
    body: "On-time performance you can count on, every time. Your cargo arrives when it should.",
    path: "M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z M9 12l2 2 4-4",
  },
  {
    title: "Real-time visibility",
    body: "Live tracking and proactive updates give you full visibility across every mile.",
    path: "M12 21s7-6.5 7-11.5A7 7 0 1 0 5 9.5C5 14.5 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  },
  {
    title: "Flexible capacity",
    body: "Scale up or down with ease. We adapt to your business, not the other way around.",
    path: "M21 8l-9-5-9 5v8l9 5 9-5V8z M3 8l9 5 9-5 M12 13v8",
  },
  {
    title: "Dedicated support",
    body: "Real people, real solutions. Our team is here whenever you need us.",
    path: "M4 12v-1a8 8 0 0 1 16 0v1 M3 13a2 2 0 0 1 2-2h1v6H5a2 2 0 0 1-2-2zM21 13a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2z M6 19c0 1 3 2 6 2",
  },
];

const PROOF = [
  {
    title: "3 Regional hubs",
    sub: "Dubai, Riyadh, Jeddah",
    path: "M12 21s7-6.5 7-11.5A7 7 0 1 0 5 9.5C5 14.5 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  },
  {
    title: "500K+ Shipments",
    sub: "Delivered on time",
    path: "M21 8l-9-5-9 5v8l9 5 9-5V8z M3 8l9 5 9-5 M12 13v8",
  },
  {
    title: "Middle East coverage",
    sub: "Strong network, wider reach",
    path: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z",
  },
  {
    title: "24/7 Support",
    sub: "We're always here",
    path: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 7v5l3 3",
  },
];

function Icon({ path, size = 24 }: { path: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

/** Dotted map + the freight route that runs up to the delivery marker. */
const STOPS = [
  { name: "JEDDAH", x: 70, y: 300, labelW: 76 },
  { name: "RIYADH", x: 210, y: 232, labelW: 74 },
  { name: "DUBAI", x: 396, y: 128, labelW: 66 },
];

const ROUTE = "M70 300 Q 150 292 210 232 Q 290 148 396 128 Q 470 114 512 84";

function RouteVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <svg viewBox="0 0 600 380" className="h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="why-dots" width={8} height={8} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={1} fill="#3B82F6" opacity={0.26} />
        </pattern>
        <radialGradient id="why-fade" cx="0.45" cy="0.4" r="0.62">
          <stop offset="0%" stopColor="white" stopOpacity={1} />
          <stop offset="70%" stopColor="white" stopOpacity={0.4} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </radialGradient>
        <mask id="why-mask">
          <rect width="600" height="380" fill="url(#why-fade)" />
        </mask>
      </defs>

      <rect width="600" height="380" fill="url(#why-dots)" mask="url(#why-mask)" />

      <motion.path
        d={ROUTE}
        fill="none"
        stroke="#FF6A00"
        strokeWidth={2}
        strokeLinecap="round"
        initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 0.9 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1.3, delay: 0.2, ease: EASE }}
      />

      {STOPS.map((s, i) => (
        <g key={s.name}>
          <motion.circle
            cx={s.x}
            cy={s.y}
            r={6}
            fill="#FF6A00"
            initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.35, delay: 0.5 + i * 0.18, ease: EASE }}
            style={{ transformOrigin: `${s.x}px ${s.y}px` }}
          />
          <g transform={`translate(${s.x - s.labelW / 2}, ${s.y - 46})`}>
            <motion.g
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: 0.62 + i * 0.18, ease: EASE }}
            >
              <rect
                width={s.labelW}
                height={26}
                rx={5}
                fill="#06152B"
                stroke="#ffffff"
                strokeOpacity={0.28}
              />
              <text
                x={s.labelW / 2}
                y={17}
                textAnchor="middle"
                fill="white"
                fontSize={12}
                letterSpacing={1}
                fontFamily="var(--font-geist-sans), system-ui, sans-serif"
              >
                {s.name}
              </text>
            </motion.g>
          </g>
        </g>
      ))}

      {/* Delivery marker at the end of the route */}
      <motion.g
        initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45, delay: 1.1, ease: EASE }}
        style={{ transformOrigin: "512px 84px" }}
      >
        <circle cx={512} cy={84} r={26} fill="#06152B" stroke="#FF6A00" strokeWidth={1.6} />
        <g transform="translate(500, 72)" className="text-[#FF6A00]">
          <path
            d="M21 8l-9-5-9 5v8l9 5 9-5V8z M3 8l9 5 9-5 M12 13v8"
            fill="none"
            stroke="#FF6A00"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="scale(1)"
          />
        </g>
      </motion.g>
    </svg>
  );
}

export default function WhyUs() {
  const reduceMotion = useReducedMotion();

  return (
    // overflow-hidden: the visual column enters from x:26px, which on narrow
    // screens pushes it past the viewport and adds horizontal page scroll
    // until the animation settles.
    <section id="why" className="overflow-hidden bg-[#06152B] py-24 text-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <p className="text-sm font-semibold tracking-[0.12em] text-[#FF6A00] uppercase">
              Why Tareg
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
              Built around
              <br />
              your business<span className="text-[#FF6A00]">.</span>
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#94A3B8]">
              From planning to final delivery, we remove friction from your
              supply chain so you can focus on what matters most.
            </p>
            <a
              href="mailto:sales@tareg.com"
              className="mt-8 inline-flex items-center gap-3 rounded-md bg-[#FF6A00] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#e85a00]"
            >
              Get a shipping quote
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 26 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="relative h-[300px] sm:h-[360px] lg:h-[400px]"
          >
            <RouteVisual />
            <Image
              src={sectionFour}
              alt="Tareg warehouse and delivery truck"
              className="absolute right-0 bottom-0 h-auto w-[92%] drop-shadow-[0_25px_40px_rgba(0,0,0,0.5)]"
            />
          </motion.div>
        </div>

        {/* Feature cards */}
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
          className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={{
                hidden: { opacity: 0, y: 22 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
              }}
              className="group rounded-xl border border-[#1557FF]/20 bg-[#0A1E3A]/50 p-6 transition-colors duration-300 hover:border-[#1557FF]/45"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 text-white transition-colors duration-300 group-hover:border-[#FF6A00]/60">
                <Icon path={f.path} size={26} />
              </span>
              <h3 className="mt-6 text-lg font-bold text-white">{f.title}</h3>
              <span className="mt-3 block h-0.5 w-9 bg-[#FF6A00]" />
              <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">
                {f.body}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Proof strip */}
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          className="mt-14 grid gap-y-8 border-t border-white/10 pt-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-white/10"
        >
          {PROOF.map((p) => (
            <motion.div
              key={p.title}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
              }}
              className="flex items-center gap-4 lg:px-7 lg:first:pl-0"
            >
              <span className="shrink-0 text-[#FF6A00]">
                <Icon path={p.path} size={30} />
              </span>
              <div>
                <p className="font-semibold text-white">{p.title}</p>
                <p className="mt-0.5 text-sm text-[#94A3B8]">{p.sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
