"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import logo from "@/assets/logo-dark-bg.png";
import { useT } from "@/lib/translations";

type SplashScreenProps = {
  onSkip: () => void;
};

const WORDMARK = "TAREG";
const WORDMARK_AR = "طارق";
const SPEED_LINES = [
  { width: 40, top: "38%" },
  { width: 64, top: "50%" },
  { width: 48, top: "62%" },
];

const letterContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.9 },
  },
};

const letter = {
  hidden: { y: 28, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function SplashScreen({ onSkip }: SplashScreenProps) {
  const reduceMotion = useReducedMotion();
  const { t, language } = useT();
  // Letter-spacing and uppercase break Arabic's joined script, so the
  // tagline only gets the tracked caps treatment in English.
  const taglineClass =
    language === "ar"
      ? "text-base text-white/60"
      : "text-sm uppercase tracking-[0.35em] text-white/60";

  // The mark ships on a white background, so it sits on a white card here.
  const mark = (
    <Image src={logo} alt="" width={140} height={117} className="h-[105px] w-auto" priority />
  );

  // Reduced motion: a single quiet fade in and out, no choreography
  if (reduceMotion) {
    return (
      <motion.div
        onClick={onSkip}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#031835]"
      >
        <div className="rounded-2xl bg-white p-4">{mark}</div>
        <div className="flex flex-col items-center gap-2">
          <h1 dir="ltr" className="text-4xl font-bold tracking-[0.25em] text-white sm:text-5xl">
            {WORDMARK}
          </h1>
          <p className="text-2xl font-bold text-white/80">{WORDMARK_AR}</p>
        </div>
        <p className={taglineClass}>{t("splashTagline")}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      onClick={onSkip}
      exit={{ y: "-100%" }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#031835]"
    >
      {/* Soft glow behind the logo */}
      <div className="absolute h-96 w-96 rounded-full bg-white/10 blur-3xl" />

      <motion.div
        className="relative rounded-2xl bg-white p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]"
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {mark}
      </motion.div>

      {/* Wordmark with speed lines. dir="ltr": the letters are separate
          inline blocks, which an RTL page would otherwise lay out backwards. */}
      <div dir="ltr" className="relative mt-8">
        {SPEED_LINES.map(({ width, top }, i) => (
          <motion.div
            key={i}
            className="absolute -left-24 h-0.5 rounded-full bg-white/40"
            style={{ width, top }}
            initial={{ x: -90, opacity: 0 }}
            animate={{ x: 90, opacity: [0, 0.7, 0] }}
            transition={{ duration: 0.5, delay: 1.55 + i * 0.08, ease: "easeIn" }}
          />
        ))}
        <motion.h1
          variants={letterContainer}
          initial="hidden"
          animate="visible"
          className="text-4xl font-bold tracking-[0.25em] text-white sm:text-5xl"
        >
          {WORDMARK.split("").map((char, i) => (
            <motion.span key={i} variants={letter} className="inline-block">
              {char}
            </motion.span>
          ))}
        </motion.h1>
      </div>

      {/* Arabic name fades in whole: splitting it per letter would break the joins */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 1.3, ease: [0.22, 1, 0.36, 1] }}
        className="mt-3 text-2xl font-bold text-white/80"
      >
        {WORDMARK_AR}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.7 }}
        className={`mt-6 ${taglineClass}`}
      >
        {t("splashTagline")}
      </motion.p>
    </motion.div>
  );
}
