"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "prime-theme";
const listeners = new Set<() => void>();

function readTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable (private mode, etc.) — theme just won't persist
  }
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Reads/writes the site-wide theme, kept in sync with the `dark` class the
 * no-flash inline script (see layout.tsx) already applied before hydration.
 */
export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    readTheme,
    () => "light" as Theme, // SSR snapshot; real value settles on mount
  );

  const setTheme = useCallback((next: Theme) => applyTheme(next), []);
  const toggle = useCallback(
    () => applyTheme(readTheme() === "dark" ? "light" : "dark"),
    [],
  );

  return { theme, setTheme, toggle };
}
