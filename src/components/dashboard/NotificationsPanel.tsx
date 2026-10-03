"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/dashboard/DataTable";
import { NavIcon } from "@/components/dashboard/Sidebar";
import {
  NOTIFICATION_CATEGORIES,
  PRIORITIES,
  PRIORITY_ORDER,
  relativeTime,
  type ModuleKey,
  type NotificationCategory,
  type Priority,
  type Tone,
} from "@/lib/fleet-data";
import { useNotifications } from "@/lib/useNotifications";
import { useT } from "@/lib/translations";

const ICON_TONE: Record<Tone, string> = {
  good: "bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-400",
  warn: "bg-accent-100 text-accent-600 dark:bg-accent-950/50 dark:text-accent-400",
  bad: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
  info: "bg-prime-50 text-prime-600 dark:bg-prime-950/50 dark:text-prime-300",
  neutral: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

export type PriorityFilter = Priority | "all";
export type CategoryFilter = NotificationCategory | "all";

/**
 * Notification rows grouped under High / Medium / Low headings (newest first
 * within each). Optional priority/category filters; opening a row marks it read.
 */
export function NotificationList({
  onNavigate,
  compact = false,
  priority = "all",
  category = "all",
}: {
  onNavigate: (key: ModuleKey) => void;
  compact?: boolean;
  priority?: PriorityFilter;
  category?: CategoryFilter;
}) {
  const { tx, language } = useT();
  const { items, markRead } = useNotifications();

  const visible = items.filter(
    (n) => (priority === "all" || n.priority === priority) && (category === "all" || n.category === category),
  );

  if (visible.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-neutral-400">
        {tx({ en: "No notifications in this view.", ar: "لا توجد إشعارات في هذا العرض." })}
      </p>
    );
  }

  return (
    <div>
      {PRIORITY_ORDER.map((p) => {
        const group = visible.filter((n) => n.priority === p).sort((a, b) => a.minutesAgo - b.minutesAgo);
        if (group.length === 0) return null;
        const meta = PRIORITIES[p];
        return (
          <section key={p}>
            <h3
              className={`sticky top-0 z-10 flex items-center gap-2 border-y border-neutral-100 bg-neutral-50/95 font-semibold text-neutral-500 backdrop-blur ltr:uppercase ltr:tracking-wider dark:border-neutral-800 dark:bg-neutral-900/95 dark:text-neutral-400 ${
                compact ? "px-4 py-1.5 text-[11px]" : "px-5 py-2 text-xs"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${p === "high" ? "bg-red-500" : p === "medium" ? "bg-accent-500" : "bg-prime-500"}`} />
              {tx(meta.heading)}
              <span className="font-medium text-neutral-400 ltr:normal-case">({group.length})</span>
            </h3>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {group.map((n) => {
                const cat = NOTIFICATION_CATEGORIES[n.category];
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => {
                        markRead(n.id);
                        onNavigate(n.target);
                      }}
                      className={`flex w-full items-start gap-3 text-start transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${
                        compact ? "px-4 py-3" : "px-5 py-4"
                      } ${n.read ? "" : "bg-prime-50/50 dark:bg-prime-950/20"}`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ICON_TONE[meta.tone]}`}>
                        <NavIcon name={cat.icon} size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className={`text-sm text-foreground ${n.read ? "font-medium" : "font-bold"}`}>{tx(n.title)}</span>
                          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-prime-600" aria-hidden="true" />}
                        </span>
                        <span className={`mt-0.5 block text-neutral-600 dark:text-neutral-300 ${compact ? "line-clamp-2 text-xs" : "text-sm"}`}>
                          {tx(n.body)}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-neutral-400">
                          <Badge label={tx(meta.label)} tone={meta.tone} />
                          <span className="font-medium text-neutral-500 dark:text-neutral-400">{tx(cat.label)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{relativeTime(n.minutesAgo, language)}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** All / High / Medium / Low tabs with unread counts and a gliding indicator. */
export function PriorityTabs({
  value,
  onChange,
  layoutId,
}: {
  value: PriorityFilter;
  onChange: (p: PriorityFilter) => void;
  /** Distinct per instance so two tab bars on screen don't share an indicator. */
  layoutId: string;
}) {
  const { tx } = useT();
  const { items } = useNotifications();
  const tabs: { key: PriorityFilter; label: string; unread: number }[] = [
    { key: "all", label: tx({ en: "All", ar: "الكل" }), unread: items.filter((n) => !n.read).length },
    ...PRIORITY_ORDER.map((p) => ({
      key: p,
      label: tx(PRIORITIES[p].label),
      unread: items.filter((n) => n.priority === p && !n.read).length,
    })),
  ];

  return (
    <div role="tablist" className="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              active ? "text-foreground" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-neutral-700"
                transition={{ type: "spring", stiffness: 500, damping: 36 }}
              />
            )}
            <span className="relative">{tab.label}</span>
            {tab.unread > 0 && (
              <span
                className={`relative min-w-4 rounded-full px-1 text-[10px] leading-4 font-bold text-white ${
                  tab.key === "high" ? "bg-red-500" : tab.key === "medium" ? "bg-accent-500" : tab.key === "low" ? "bg-prime-500" : "bg-neutral-500"
                }`}
              >
                {tab.unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Topbar bell with a dropdown panel of recent notifications. */
export default function NotificationsPopover({ onNavigate }: { onNavigate: (key: ModuleKey) => void }) {
  const { t, tx } = useT();
  const { unread, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const go = (key: ModuleKey) => {
    setOpen(false);
    onNavigate(key);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("notifications")}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          open
            ? "bg-prime-50 text-prime-600 dark:bg-neutral-800 dark:text-prime-400"
            : "text-neutral-500 hover:bg-prime-50 hover:text-prime-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-prime-400"
        }`}
      >
        <motion.span
          className="block"
          animate={unread > 0 && !open ? { rotate: [0, -14, 12, -8, 6, 0] } : { rotate: 0 }}
          transition={{ duration: 0.9, repeat: unread > 0 && !open ? Infinity : 0, repeatDelay: 4 }}
        >
          <NavIcon name="bell" size={18} />
        </motion.span>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-neutral-950"
            >
              {unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t("notifications")}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-x-3 top-16 z-50 flex max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl ltr:origin-top-right rtl:origin-top-left sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-[400px] sm:max-h-[560px] dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="space-y-3 border-b border-neutral-100 px-4 pt-3 pb-3 dark:border-neutral-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">{t("notifications")}</h2>
                  {unread > 0 && (
                    <span className="rounded-full bg-prime-600 px-2 py-0.5 text-[11px] font-bold text-white">
                      {tx({ en: `${unread} new`, ar: `${unread} جديدة` })}
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs font-semibold text-prime-600 transition-colors hover:text-prime-700 dark:text-prime-400">
                    {tx({ en: "Mark all as read", ar: "تحديد الكل كمقروء" })}
                  </button>
                )}
              </div>
              <PriorityTabs value={priority} onChange={setPriority} layoutId="popover-priority" />
            </div>

            <div className="flex-1 overflow-y-auto">
              <NotificationList onNavigate={go} compact priority={priority} />
            </div>

            <button
              onClick={() => go("notifications")}
              className="border-t border-neutral-100 px-4 py-3 text-center text-sm font-semibold text-prime-600 transition-colors hover:bg-prime-50 dark:border-neutral-800 dark:text-prime-400 dark:hover:bg-neutral-800"
            >
              {tx({ en: "View all notifications", ar: "عرض جميع الإشعارات" })}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
