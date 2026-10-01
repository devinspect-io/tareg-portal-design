"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Appears once the page is scrolled: the primary CTA plus a back-to-top. */
export default function ScrollActions() {
  const [show, setShow] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 480);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toTop() {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: 18 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-3 sm:right-7 sm:bottom-7"
        >
          {/* Short label so the floating pill stays compact; the full intent
              is kept on the accessible name. */}
          <motion.a
            href="mailto:sales@tareg.com"
            aria-label="Get a shipping quote"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.06, ease: EASE }}
            className="flex items-center gap-1.5 rounded-full bg-[#FF6A00] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(255,106,0,0.6)] transition-colors hover:bg-[#e85a00]"
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Quote
          </motion.a>

          <motion.button
            type="button"
            onClick={toTop}
            aria-label="Back to top"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            whileHover={reduceMotion ? undefined : { y: -2 }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#0A1D3A]/90 text-white shadow-[0_10px_28px_-10px_rgba(0,0,0,0.8)] backdrop-blur transition-colors hover:border-[#FF6A00]/60 hover:text-[#FF6A00]"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
