"use client";

import { motion } from "framer-motion";
import Gear from "@/components/Gear";

type ComingSoonProps = {
  module: string;
  onBack: () => void;
};

/** Placeholder screen for modules that aren't built yet. */
export default function ComingSoon({ module, onBack }: ComingSoonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-[60vh] flex-col items-center justify-center text-center"
    >
      <div className="relative h-40 w-44 text-prime-600/80">
        <motion.div
          className="absolute bottom-0 left-0 h-28 w-28"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        >
          <Gear className="h-full w-full" />
        </motion.div>
        <motion.div
          className="absolute top-0 right-0 h-20 w-20 text-prime-300"
          animate={{ rotate: -360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        >
          <Gear teeth={8} className="h-full w-full" />
        </motion.div>
      </div>

      <h2 className="mt-8 text-2xl font-bold text-foreground">
        {module} <span className="text-prime-600">— Coming Soon</span>
      </h2>
      <p className="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
        This module is under construction. Our team is building it.
      </p>

      <motion.button
        onClick={onBack}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="mt-8 rounded-lg bg-prime-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-prime-500"
      >
        Back to Dashboard
      </motion.button>
    </motion.div>
  );
}
