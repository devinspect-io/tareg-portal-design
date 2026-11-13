"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Paged } from "@/lib/api/types";

export type Loadable<T> = {
  data: T | undefined;
  error: unknown;
  /** True on the first load only; reloads keep the old data on screen. */
  loading: boolean;
  /** True while any request (first load or reload) is in flight. */
  fetching: boolean;
  reload: () => void;
};

// How many mounted screens are still waiting on their FIRST load. The
// full-screen "Opening <screen>" and boot loaders stay up while this is above
// zero, so they last as long as the API takes instead of a fixed timer.
// Reloads (refresh, polling badges) never count: their data is already shown.
let firstLoads = 0;
const firstLoadListeners = new Set<() => void>();
function changeFirstLoads(by: 1 | -1) {
  firstLoads += by;
  firstLoadListeners.forEach((l) => l());
}
export function subscribeFirstLoads(listener: () => void) {
  firstLoadListeners.add(listener);
  return () => {
    firstLoadListeners.delete(listener);
  };
}
export const firstLoadsInFlight = () => firstLoads;

/**
 * Runs `fetcher` on mount and whenever `key` changes (pass the serialised
 * filters). Out-of-order responses are dropped, so typing fast in a search
 * box never shows an older result last.
 */
export function useApi<T>(fetcher: () => Promise<T>, key: string): Loadable<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>(null);
  const [fetching, setFetching] = useState(true);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const fetcherRef = useRef(fetcher);
  // Counted in `firstLoads` until the first response (or error) lands.
  const loaded = useRef(false);
  const counted = useRef(false);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    const mine = ++seq.current;
    if (!loaded.current && !counted.current) {
      counted.current = true;
      changeFirstLoads(1);
    }
    // Async start keeps the effect free of synchronous setState.
    Promise.resolve()
      .then(() => {
        if (mine === seq.current) setFetching(true);
        return fetcherRef.current();
      })
      .then(
        (res) => {
          if (mine !== seq.current) return;
          setData(res);
          setError(null);
        },
        (e) => {
          if (mine !== seq.current) return;
          setError(e);
        },
      )
      .finally(() => {
        if (mine !== seq.current) return;
        setFetching(false);
        loaded.current = true;
        if (counted.current) {
          counted.current = false;
          changeFirstLoads(-1);
        }
      });
  }, [key, tick]);

  // Leaving a screen before its first load lands must not hold the loader up.
  useEffect(
    () => () => {
      if (counted.current) {
        counted.current = false;
        changeFirstLoads(-1);
      }
    },
    [],
  );

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading: fetching && data === undefined, fetching, reload };
}

/** Same as useApi for a paged list, with `items`/`total` defaults. */
export function useApiPage<T>(fetcher: () => Promise<Paged<T>>, key: string) {
  const res = useApi(fetcher, key);
  return { ...res, items: res.data?.items ?? [], total: res.data?.total ?? 0 };
}
