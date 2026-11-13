"use client";

import { useEffect, useState } from "react";

// A filter a screen should open with, e.g. Compliance narrowed to expired when
// the dashboard's "Expired documents" card is clicked. Kept in memory, not the
// URL: a refresh shows the screen unfiltered, and the URL stays ?view=<screen>.
let pending: Record<string, string> | null = null;

/** Set by the dashboard right before it opens a screen (null clears it). */
export function setOpenFilter(filter: Record<string, string> | null) {
  pending = filter;
}

/**
 * The value of `name` the screen was opened with, if it is one of `allowed`,
 * else "". Read once on mount and then cleared, so it applies to that one
 * opening only.
 */
export function useOpenFilter(name: string, allowed: readonly string[]): string {
  const [initial] = useState(() => {
    const v = pending?.[name] ?? "";
    return allowed.includes(v) ? v : "";
  });
  useEffect(() => {
    pending = null;
  }, []);
  return initial;
}
