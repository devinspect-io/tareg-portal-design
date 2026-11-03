"use client";

import { useT } from "@/lib/translations";

/**
 * Marks a screen, card or chart that still runs on mock data (no API yet).
 * Temporary: remove it from a place once that place goes live.
 */
export default function MockTag({ onDark = false }: { onDark?: boolean }) {
  const { t } = useT();
  return (
    <span
      className={`inline-block shrink-0 rounded-full border border-dashed px-1.5 text-[10px] leading-4 font-semibold ${
        onDark ? "border-white/50 text-white/85" : "border-neutral-300 text-neutral-400 dark:border-neutral-700 dark:text-neutral-500"
      }`}
    >
      {t("mockBadge")}
    </span>
  );
}
