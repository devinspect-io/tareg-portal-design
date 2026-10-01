"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { NAV_ITEMS } from "@/lib/dashboard-data";
import logoLight from "@/assets/logo-white-bg.png";
import logoDark from "@/assets/logo-dark-bg.png";

type SidebarProps = {
  active: string;
  onSelect: (label: string) => void;
  onLogout: () => void;
  /** Mobile drawer open state; ignored on lg+ where the rail is static. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

/** Simple inline icon set keyed by nav item icon name. */
function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    invoice: (
      <>
        <path d="M6 2h12v20l-2-1.5L14 22l-2-1.5L10 22l-2-1.5L6 22z" />
        <path d="M9.5 7.5h5M9.5 11h5M9.5 14.5h3" />
      </>
    ),
    sparkles: (
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
    ),
    people: (
      <>
        <circle cx={9} cy={8} r={3.5} />
        <path d="M2.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5" />
        <circle cx={17} cy={9} r={2.5} />
        <path d="M16 14.7c2.7.3 4.7 1.9 5.3 4.8" />
      </>
    ),
    cart: (
      <>
        <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.3h7.7a1.5 1.5 0 0 0 1.5-1.2L20 8H6" />
        <circle cx={10} cy={20} r={1.5} />
        <circle cx={16.5} cy={20} r={1.5} />
      </>
    ),
    truck: (
      <>
        <path d="M2 6h11v10H2zM13 10h4l3 3v3h-7z" />
        <circle cx={6.5} cy={17.5} r={1.8} />
        <circle cx={16.5} cy={17.5} r={1.8} />
      </>
    ),
    boxes: (
      <>
        <path d="M7.5 10.5h9v9h-9z" />
        <path d="M3.5 3.5h9v7h-9zM12.5 6.5h8v7h-8z" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 2h12v20l-2-1.5L14 22l-2-1.5L10 22l-2-1.5L6 22z" />
        <path d="M9.5 7h5M9.5 11h5M9.5 15h3" />
      </>
    ),
    bank: (
      <>
        <path d="M3 9l9-6 9 6M4 9v9M8 10v8M12 10v8M16 10v8M20 9v9M2.5 21h19" />
      </>
    ),
    ledger: (
      <>
        <rect x={4} y={3} width={16} height={18} rx={2} />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    chart: (
      <>
        <path d="M3 21h18" />
        <path d="M6 21V13M11 21V7M16 21V10M21 21V4" />
      </>
    ),
    person: (
      <>
        <circle cx={12} cy={7.5} r={3.5} />
        <path d="M5 20.5c.8-4 3.6-6 7-6s6.2 2 7 6" />
      </>
    ),
    factory: (
      <>
        <path d="M3 21V10l6 4v-4l6 4V6h6v15z" />
        <path d="M16 17h2M11 17h2" />
      </>
    ),
    gears: (
      <>
        <circle cx={9} cy={9} r={3} />
        <path d="M9 3.5v2M9 12.5v2M3.5 9h2M12.5 9h2M5.1 5.1l1.4 1.4M11.5 11.5l1.4 1.4M12.9 5.1l-1.4 1.4M6.5 11.5l-1.4 1.4" />
        <circle cx={17} cy={16} r={2.4} />
        <path d="M17 12.2v1.5M17 18.3v1.5M13.2 16h1.5M20.3 16h1.5" />
      </>
    ),
    tools: (
      <>
        <path d="M14.5 6.5a4 4 0 0 1 5-5l-3 3 .7 2.3 2.3.7 3-3a4 4 0 0 1-5 5L7 20a2 2 0 0 1-3-3z" />
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
      width={19}
      height={19}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.ledger}
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function NavList({
  active,
  onSelect,
  onLogout,
}: Pick<SidebarProps, "active" | "onSelect" | "onLogout">) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
        {/* The rail is white in light mode and near-black in dark, so the
            logo variant swaps with the theme. */}
        <Image
          src={logoLight}
          alt=""
          width={34}
          height={29}
          className="h-[29px] w-auto dark:hidden"
        />
        <Image
          src={logoDark}
          alt=""
          width={34}
          height={29}
          className="hidden h-[29px] w-auto dark:block"
        />
        <span className="text-base font-bold tracking-wide text-foreground">
          Tareg
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.filter((item) => !item.hidden).map((item) => {
          const isActive = active === item.label;
          return (
            <button
              key={item.label}
              onClick={() => onSelect(item.label)}
              className={`flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm font-medium transition-colors ${
                isActive
                  ? "bg-prime-600 text-white"
                  : "text-neutral-600 hover:bg-prime-50 hover:text-prime-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-prime-400"
              }`}
            >
              <NavIcon name={item.icon} />
              <span className="flex-1">{item.label}</span>
              {item.hasChildren && (
                <span
                  className={
                    isActive ? "text-white/70" : "text-neutral-400 dark:text-neutral-600"
                  }
                >
                  <Chevron />
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <button
        onClick={onLogout}
        className="flex items-center gap-3 border-t border-neutral-100 px-5 py-3.5 text-left text-sm font-semibold text-prime-600 transition-colors hover:bg-prime-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
      >
        <NavIcon name="logout" />
        Logout
      </button>
    </div>
  );
}

export default function Sidebar({
  active,
  onSelect,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {/* Desktop static rail */}
      <aside className="hidden w-[260px] shrink-0 border-r border-neutral-100 bg-white lg:block dark:border-neutral-800 dark:bg-neutral-950">
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
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] bg-white shadow-2xl lg:hidden dark:bg-neutral-950"
            >
              <NavList
                active={active}
                onSelect={(label) => {
                  onCloseMobile();
                  onSelect(label);
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
