"use client";

import { useCallback, useSyncExternalStore } from "react";
import { NOTIFICATIONS } from "@/lib/fleet-data";

// Read state for the demo notifications, shared by the topbar bell, the
// sidebar badge and the Notifications page so they always agree. In-memory
// only: a real backend would own this.
let readIds = new Set(NOTIFICATIONS.filter((n) => n.read).map((n) => n.id));
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

const getSnapshot = () => readIds;

export function useNotifications() {
  const read = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const markRead = useCallback((id: string) => {
    if (readIds.has(id)) return;
    readIds = new Set(readIds).add(id);
    emit();
  }, []);

  const markAllRead = useCallback(() => {
    readIds = new Set(NOTIFICATIONS.map((n) => n.id));
    emit();
  }, []);

  const items = NOTIFICATIONS.map((n) => ({ ...n, read: read.has(n.id) }));
  const unread = items.filter((n) => !n.read).length;

  return { items, unread, markRead, markAllRead };
}
