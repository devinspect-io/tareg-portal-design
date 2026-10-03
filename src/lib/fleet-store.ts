"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ACCIDENTS, EXPENSES, type Accident, type Expense, type NotificationCategory } from "@/lib/fleet-data";

/**
 * Editable in-memory list seeded from the mock data, so add/edit/delete on a
 * screen survives navigating away and back. Resets on reload; a real backend
 * replaces this.
 */
function createListStore<T extends { id: string }>(seed: T[]) {
  let items = seed;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  const getSnapshot = () => items;

  return function useList() {
    const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    /** Replaces the item with the same id, or prepends it when new. */
    const upsert = useCallback((item: T) => {
      items = items.some((i) => i.id === item.id) ? items.map((i) => (i.id === item.id ? item : i)) : [item, ...items];
      emit();
    }, []);

    const remove = useCallback((id: string) => {
      items = items.filter((i) => i.id !== id);
      emit();
    }, []);

    return { items: list, upsert, remove };
  };
}

export const useExpenseStore = createListStore<Expense>(EXPENSES);
export const useAccidentStore = createListStore<Accident>(ACCIDENTS);

/** Next sequential reference for a prefix, e.g. INV-5563 after INV-5562. */
export function nextRef(prefix: string, existing: { id: string }[]): string {
  const max = existing.reduce((m, i) => Math.max(m, Number(i.id.replace(/\D/g, "")) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

// ---------- Settings ----------

export type KmFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export type FleetSettings = {
  companyName: string;
  crNumber: string;
  contactEmail: string;
  contactPhone: string;
  requireAssistant: boolean;
  requireFleetManager: boolean;
  superAdminAbove: boolean;
  superAdminThreshold: number;
  expiryReminderDays: number[];
  maintenanceDaysBefore: number;
  maintenanceKmBefore: number;
  notificationCategories: Record<NotificationCategory, boolean>;
  kmFrequency: KmFrequency;
  minPhotos: number;
  driversCanRequestMaintenance: boolean;
  breakdownPhotoRequired: boolean;
  defaultLanguage: "ar" | "en";
};

const DEFAULT_SETTINGS: FleetSettings = {
  companyName: "Montaka",
  crNumber: "1010487213",
  contactEmail: "fleet@montaka.sa",
  contactPhone: "+966 11 482 6600",
  requireAssistant: true,
  requireFleetManager: true,
  superAdminAbove: true,
  superAdminThreshold: 5000,
  expiryReminderDays: [30, 14, 7],
  maintenanceDaysBefore: 7,
  maintenanceKmBefore: 1000,
  notificationCategories: { maintenance: true, approvals: true, compliance: true, incidents: true, submissions: true, expenses: true },
  kmFrequency: "weekly",
  minPhotos: 1,
  driversCanRequestMaintenance: true,
  breakdownPhotoRequired: true,
  defaultLanguage: "ar",
};

let settings = DEFAULT_SETTINGS;
const settingsListeners = new Set<() => void>();
const subscribeSettings = (cb: () => void) => {
  settingsListeners.add(cb);
  return () => settingsListeners.delete(cb);
};
const getSettings = () => settings;

export function useSettingsStore() {
  const value = useSyncExternalStore(subscribeSettings, getSettings, getSettings);
  const save = useCallback((next: FleetSettings) => {
    settings = next;
    settingsListeners.forEach((l) => l());
  }, []);
  return { settings: value, save, defaults: DEFAULT_SETTINGS };
}
