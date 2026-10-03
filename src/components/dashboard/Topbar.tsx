"use client";

import { useEffect, useState } from "react";
import ThemeToggle from "@/components/dashboard/ThemeToggle";
import LanguageToggle from "@/components/dashboard/LanguageToggle";
import NotificationsPopover from "@/components/dashboard/NotificationsPanel";
import type { ModuleKey } from "@/lib/fleet-data";
import { useT } from "@/lib/translations";

type TopbarProps = {
  onToggleMobileSidebar: () => void;
  /** Opens a module; enables the notifications bell. */
  onNavigate?: (key: ModuleKey) => void;
};

// Gregorian calendar + Latin digits in Arabic too.
const LOCALE = { en: "en-US", ar: "ar-u-ca-gregory-nu-latn" } as const;

function formatTime(d: Date, lang: keyof typeof LOCALE) {
  return d.toLocaleTimeString(LOCALE[lang], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatDate(d: Date, lang: keyof typeof LOCALE) {
  return d.toLocaleDateString(LOCALE[lang], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function Topbar({ onToggleMobileSidebar, onNavigate }: TopbarProps) {
  // Render a placeholder until mounted so SSR/client markup match
  const [now, setNow] = useState<Date | null>(null);
  const { t, language } = useT();

  useEffect(() => {
    const update = () => setNow(new Date());
    const raf = requestAnimationFrame(update); // async first tick, then every second
    const id = setInterval(update, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-neutral-100 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 dark:border-neutral-800 dark:bg-neutral-950/90">
      {/* Hamburger (mobile only) */}
      <button
        onClick={onToggleMobileSidebar}
        aria-label={t("toggleMenu")}
        className="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-prime-50 hover:text-prime-700 lg:hidden dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-prime-400"
      >
        <svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div className="min-w-0">
        <p className="truncate text-sm font-bold tracking-wide text-foreground">
          {t("brandName").toUpperCase()}
        </p>
        <p className="hidden truncate text-xs text-neutral-400 sm:block dark:text-neutral-500">
          {t("brandSub")}
        </p>
      </div>

      {/* Live clock */}
      <div className="hidden flex-1 text-center md:block">
        <p className="font-mono text-sm font-semibold text-foreground ltr:tracking-widest">
          {now ? formatTime(now, language) : "--:--:-- --"}
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          {now ? formatDate(now, language) : ""}
        </p>
      </div>
      <div className="flex-1 md:hidden" />

      <div className="hidden text-center sm:block">
        <p className="text-[10px] text-neutral-400 ltr:uppercase ltr:tracking-widest dark:text-neutral-500">
          {t("version")}
        </p>
        <p className="text-xs font-semibold text-prime-600">1.0</p>
      </div>

      {onNavigate && <NotificationsPopover onNavigate={onNavigate} />}

      <LanguageToggle />
      <ThemeToggle />

      {/* User chip */}
      <div className="flex items-center gap-2.5">
        <div className="text-end">
          <p className="text-sm font-semibold text-foreground">{t("superAdmin")}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-prime-600 text-sm font-bold text-white">
          S
        </div>
      </div>
    </header>
  );
}
