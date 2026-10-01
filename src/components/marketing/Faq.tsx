"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import qaImage from "@/assets/QA-image-2.png";

const EASE = [0.22, 1, 0.36, 1] as const;

const QUESTIONS = [
  {
    q: "Which cities do you serve?",
    a: "We currently serve major cities across the GCC including Dubai (Deira, Jebel Ali, Al Quoz, and Business Bay), Riyadh, Abu Dhabi, and Jeddah. We continue to expand with new routes as demand grows.",
    path: "M12 21s7-6.5 7-11.5A7 7 0 1 0 5 9.5C5 14.5 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  },
  {
    q: "How do I get a shipping quote?",
    a: "Email sales@tareg.com or call your account manager with pickup, drop-off, and cargo details. We'll come back to you the same day.",
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 13h6M9 17h4",
  },
  {
    q: "Can I track my shipment in real time?",
    a: "Yes. Every booking gets a waybill number you can check for live status from pickup through to delivery.",
    path: "M21 8l-9-5-9 5v8l9 5 9-5V8z M3 8l9 5 9-5 M12 13v8",
  },
  {
    q: "Do you handle warehousing as well as transport?",
    a: "Yes. Our branch depots offer bonded and general storage alongside trucking, so a single team covers the whole journey.",
    path: "M3 21V9.5L12 4l9 5.5V21 M2 21h20 M7 21v-6.5h10V21 M10 21v-3.5h4V21",
  },
  {
    q: "What size shipments do you take?",
    a: "From single-pallet loose cargo to full-truck loads — talk to us about anything in between.",
    path: "M3 5h18v14H3z M7 9v6M11 9v3M15 9v6M19 9v3",
  },
  {
    q: "What are the payment terms?",
    a: "Standard terms are net 15 days on invoice, with alternate arrangements available for regular accounts.",
    path: "M2 7h20v10H2z M2 11h20 M6 15h3",
  },
];

function Icon({ path, size = 22 }: { path: string; size?: number }) {
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

function Toggle({ open }: { open: boolean }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <line x1={5} y1={12} x2={19} y2={12} stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <motion.line
        x1={12}
        y1={5}
        x2={12}
        y2={19}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        initial={false}
        animate={{ opacity: open ? 0 : 1, rotate: open ? 90 : 0 }}
        transition={{ duration: 0.2 }}
        style={{ originX: "12px", originY: "12px" }}
      />
    </svg>
  );
}

export default function Faq() {
  const [open, setOpen] = useState(0);
  const reduceMotion = useReducedMotion();

  return (
    <section id="faq" className="relative overflow-hidden bg-[#06152B] py-24 text-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          {/* Left: heading, support box, artwork */}
          <div className="relative">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <p className="text-sm font-semibold tracking-[0.12em] text-[#FF6A00] uppercase">
                FAQs
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-[1.02] font-bold sm:text-5xl lg:text-6xl">
                Questions,
                <br />
                <span className="text-[#FF6A00]">answered.</span>
              </h2>
              <span className="mt-6 block h-1 w-14 bg-[#FF6A00]" />

              <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-[#94A3B8]">
                Everything you need to know about shipping with Tareg.
                Can&apos;t find the answer you&apos;re looking for? Our team is
                here to help.
              </p>

              <div className="mt-8 inline-flex items-center gap-4 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-4">
                <span className="text-[#FF6A00]">
                  <Icon
                    path="M4 12v-1a8 8 0 0 1 16 0v1 M3 13a2 2 0 0 1 2-2h1v6H5a2 2 0 0 1-2-2zM21 13a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2z M6 19c0 1 3 2 6 2"
                    size={26}
                  />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Still have questions?
                  </p>
                  <a
                    href="mailto:sales@tareg.com"
                    className="group mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium text-[#FF6A00] transition-colors hover:text-[#ff8534]"
                  >
                    Contact our support team
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </a>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.75, delay: 0.15, ease: EASE }}
              className="mt-12 lg:-mb-20"
            >
              {/* The artwork is wide (≈2.6:1), so it's scaled past the column
                  and bled toward the section edge to give it real presence.
                  The section clips the overflow. */}
              <Image
                src={qaImage}
                alt="Container ship and delivery truck at port"
                className="h-auto w-full max-w-none lg:w-[143%] lg:-translate-x-[25%]"
              />
            </motion.div>
          </div>

          {/* Right: accordion */}
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
            className="space-y-4"
          >
            {QUESTIONS.map((item, i) => {
              const isOpen = open === i;
              return (
                <motion.div
                  key={item.q}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
                  }}
                  className={`overflow-hidden rounded-xl border transition-colors duration-300 ${
                    isOpen
                      ? "border-[#FF6A00]/35 bg-white/[0.04]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-4 px-5 py-5 text-left sm:px-6"
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                        isOpen
                          ? "border-[#FF6A00] text-[#FF6A00]"
                          : "border-white/20 text-[#FF6A00]"
                      }`}
                    >
                      <Icon path={item.path} />
                    </span>
                    <span className="flex-1 font-semibold text-white">
                      {item.q}
                    </span>
                    <span className="text-[#FF6A00]">
                      <Toggle open={isOpen} />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-6 pl-20 text-[15px] leading-relaxed text-[#94A3B8] sm:px-6 sm:pl-[5.5rem]">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Closing help card */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 18 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
              }}
              className="!mt-8 flex flex-wrap items-center gap-5 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-5 sm:px-6"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#FF6A00]/50 text-[#FF6A00]">
                <Icon
                  path="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M8 10h.01M12 10h.01M16 10h.01"
                  size={26}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">
                  Need help with something else?
                </p>
                <p className="mt-1 text-sm text-[#94A3B8]">
                  Our logistics experts are ready to assist you.
                </p>
              </div>
              <a
                href="mailto:sales@tareg.com"
                className="flex items-center gap-2 rounded-md bg-[#FF6A00] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e85a00]"
              >
                Contact us
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
