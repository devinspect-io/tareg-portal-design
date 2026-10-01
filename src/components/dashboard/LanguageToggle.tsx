"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/lib/useLanguage";
import { useT } from "@/lib/translations";

/**
 * AR/EN pill switch for the site-wide language (default Arabic, RTL).
 * Same interaction model as ThemeToggle — one click flips the stored
 * preference everywhere useLanguage() is read.
 */
export default function LanguageToggle() {
  const { language, toggle } = useLanguage();
  const { t } = useT();
  const isArabic = language === "ar";

  return (
    <button
      onClick={toggle}
      aria-label={isArabic ? t("switchToEnglish") : t("switchToArabic")}
      className="relative flex h-9 items-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-50 px-1 text-xs font-bold tracking-wide text-neutral-500 transition-colors hover:border-prime-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
    >
      <span
        className={`relative z-10 grid w-8 place-items-center py-1 text-[11px] transition-colors ${
          isArabic ? "" : "text-white"
        }`}
      >
        EN
      </span>
      <span
        className={`relative z-10 grid w-8 place-items-center py-1 text-[11px] transition-colors ${
          isArabic ? "text-white" : ""
        }`}
      >
        عربي
      </span>
      {/* Animates the logical inset directly (not a transform x), so the
          slide direction is correct in both LTR and RTL without a branch. */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-y-1 w-8 rounded-full bg-prime-600"
        initial={false}
        animate={{ insetInlineStart: isArabic ? 36 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
    </button>
  );
}
