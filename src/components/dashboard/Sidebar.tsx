"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { APPROVALS, BREAKDOWNS, NAV_SECTIONS, type ModuleKey } from "@/lib/fleet-data";
import { useNotifications } from "@/lib/useNotifications";
import { useT } from "@/lib/translations";
import logoLight from "@/assets/logo-white-bg.png";
import logoDark from "@/assets/logo-dark-bg.png";

type SidebarProps = {
  active: ModuleKey;
  onSelect: (key: ModuleKey) => void;
  onLogout: () => void;
  /** Mobile drawer open state; ignored on lg+ where the rail is static. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

/** Counts shown as pills next to nav items that need attention. */
const STATIC_BADGES: Partial<Record<ModuleKey, number>> = {
  approvals: APPROVALS.filter((a) => a.status === "pending").length,
  breakdowns: BREAKDOWNS.filter((b) => b.status !== "closed").length,
};

/** Simple inline icon set keyed by nav item icon name. */
export function NavIcon({ name, size = 19 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    bell: (
      <>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </>
    ),
    sparkles: (
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
    ),
    car: (
      <>
        <path d="M5 16H3v-4l2-5h11l3 5h2v4h-2" />
        <path d="M9 16h6" />
        <circle cx={7} cy={16.5} r={2} />
        <circle cx={17} cy={16.5} r={2} />
        <path d="M6.5 12h12" />
      </>
    ),
    driver: (
      <>
        <circle cx={12} cy={12} r={9} />
        <circle cx={12} cy={12} r={2.5} />
        <path d="M12 14.5V21M9.6 11.2L3.5 9.5M14.4 11.2l6.1-1.7" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
      </>
    ),
    gauge: (
      <>
        <path d="M12 14l4-4" />
        <path d="M3.3 19a9.5 9.5 0 1 1 17.4 0" />
      </>
    ),
    wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z" />,
    breakdown: (
      <>
        <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    approval: (
      <>
        <rect x={4} y={3} width={16} height={18} rx={2} />
        <path d="M8.5 12.5l2.5 2.5 4.5-5" />
      </>
    ),
    accident: (
      <>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </>
    ),
    ticket: (
      <>
        <path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5z" transform="translate(0 3)" />
        <path d="M9 9.5h6M9 13.5h4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
    fuel: (
      <>
        <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
        <path d="M3 21h13M7 7h5v4H7z" />
        <path d="M15 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 2h12v20l-2-1.5L14 22l-2-1.5L10 22l-2-1.5L6 22z" />
        <path d="M9.5 7h5M9.5 11h5M9.5 15h3" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    chart: (
      <>
        <path d="M3 21h18" />
        <path d="M6 21V13M11 21V7M16 21V10M21 21V4" />
      </>
    ),
    users: (
      <>
        <circle cx={9} cy={8} r={3.5} />
        <path d="M2.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5" />
        <circle cx={17} cy={9} r={2.5} />
        <path d="M16 14.7c2.7.3 4.7 1.9 5.3 4.8" />
      </>
    ),
    gears: (
      <>
        <circle cx={12} cy={12} r={3} />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.home}
    </svg>
  );
}

function NavList({
  active,
  onSelect,
  onLogout,
}: Pick<SidebarProps, "active" | "onSelect" | "onLogout">) {
  const { t, tx } = useT();
  const { unread } = useNotifications();
  const badges: Partial<Record<ModuleKey, number>> = { ...STATIC_BADGES, notifications: unread };

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
        {/* The rail is white in light mode and near-black in dark, so the
            logo variant swaps with the theme. */}
        <Image src={logoLight} alt="" width={29} height={29} className="h-[29px] w-auto dark:hidden" />
        <Image src={logoDark} alt="" width={29} height={29} className="hidden h-[29px] w-auto dark:block" />
        <span className="text-base font-bold tracking-wide text-foreground">{t("brandName")}</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => !item.hidden);
          if (items.length === 0) return null;
          return (
            <div key={section.title.en} className="pb-1">
              <p className="px-5 pt-2.5 pb-1 text-[11px] font-semibold text-neutral-400 ltr:uppercase ltr:tracking-wider dark:text-neutral-500">
                {tx(section.title)}
              </p>
              {items.map((item) => {
                const isActive = active === item.key;
                const badge = badges[item.key];
                return (
                  <button
                    key={item.key}
                    onClick={() => onSelect(item.key)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex w-full items-center gap-3 px-5 py-2 text-start text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-prime-600 text-white"
                        : "text-neutral-600 hover:bg-prime-50 hover:text-prime-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-prime-400"
                    }`}
                  >
                    <NavIcon name={item.icon} />
                    <span className="flex-1 truncate">{tx(item.label)}</span>
                    {badge ? (
                      <span
                        className={`min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-bold ${
                          isActive ? "bg-white/20 text-white" : "bg-accent-100 text-accent-700 dark:bg-accent-950/60 dark:text-accent-400"
                        }`}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <button
        onClick={onLogout}
        className="flex items-center gap-3 border-t border-neutral-100 px-5 py-3.5 text-start text-sm font-semibold text-prime-600 transition-colors hover:bg-prime-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
      >
        <span className="rtl:-scale-x-100">
          <NavIcon name="logout" />
        </span>
        {t("logout")}
      </button>
    </div>
  );
}

export default function Sidebar({ active, onSelect, onLogout, mobileOpen, onCloseMobile }: SidebarProps) {
  const { language } = useT();
  // The drawer enters from the reading-start edge: left in English, right in Arabic.
  const offscreen = language === "ar" ? "100%" : "-100%";

  return (
    <>
      {/* Desktop static rail */}
      <aside className="hidden w-[260px] shrink-0 border-e border-neutral-100 bg-white lg:block dark:border-neutral-800 dark:bg-neutral-950">
        <div className="sticky top-0 h-screen">
          <NavList active={active} onSelect={onSelect} onLogout={onLogout} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            />
            <motion.aside
              initial={{ x: offscreen }}
              animate={{ x: 0 }}
              exit={{ x: offscreen }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-y-0 start-0 z-50 w-[260px] bg-white shadow-2xl lg:hidden dark:bg-neutral-950"
            >
              <NavList
                active={active}
                onSelect={(key) => {
                  onCloseMobile();
                  onSelect(key);
                }}
                onLogout={onLogout}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
