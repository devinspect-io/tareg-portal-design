"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Language = "ar" | "en";

const STORAGE_KEY = "tareg-language";
const listeners = new Set<() => void>();

function readLanguage(): Language {
  return document.documentElement.lang === "en" ? "en" : "ar";
}

function applyLanguage(lang: Language) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage unavailable (private mode, etc.), so the language just won't persist
  }
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Reads/writes the site-wide language (default Arabic, RTL), kept in sync
 * with the `lang`/`dir` attributes the no-flash inline script (see
 * layout.tsx) already applied before hydration. Mirrors useTheme.ts.
 */
export function useLanguage() {
  const language = useSyncExternalStore(
    subscribe,
    readLanguage,
    () => "ar" as Language, // SSR snapshot; real value settles on mount
  );

  const setLanguage = useCallback((next: Language) => applyLanguage(next), []);
  const toggle = useCallback(
    () => applyLanguage(readLanguage() === "ar" ? "en" : "ar"),
    [],
  );

  return { language, setLanguage, toggle };
}
