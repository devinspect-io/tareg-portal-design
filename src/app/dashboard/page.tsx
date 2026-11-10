"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar, { NavIcon } from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "@/components/dashboard/ChartCard";
import DataTable, { Badge } from "@/components/dashboard/DataTable";
import DatePicker from "@/components/dashboard/DatePicker";
import AiReportingView from "@/components/dashboard/AiReportingView";
import AiAssistant from "@/components/dashboard/AiAssistant";
import FleetModule from "@/components/dashboard/FleetModules";
import Loader from "@/components/Loader";
import { primeChartOptions, PRIME_BLUE, ACCENT_ORANGE, CHART_COLORS } from "@/lib/chart-theme";
import { useTheme } from "@/lib/useTheme";
import { useT, type Bi } from "@/lib/translations";
import { restoreSession, signOut, useCan, useCanOpen, useSession } from "@/lib/api/session";
import { api } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { ApiApproval, ApiComplianceItem, ApiMileage, ApiServiceDue } from "@/lib/api/types";
import { APPROVAL_TYPE_LABEL, DOCUMENT_LABEL } from "@/components/dashboard/live/LiveKit";
import type { Language } from "@/lib/useLanguage";
import {
  EXPENSES,
  EXPENSE_CATEGORIES,
  MAINTENANCE_COST,
  MODULE_LABELS,
  MONTHLY_KM,
  STATUS,
  fmtDate,
  fmtKm,
  fmtSAR,
  lastMonths,
  type ExpenseCategory,
  type ModuleKey,
  type StatusCode,
} from "@/lib/fleet-data";

// The open screen lives in the URL (/dashboard?view=settings) so a refresh or
// a shared link lands on the same screen, and Back steps between screens.
function viewFromUrl(): ModuleKey {
  const v = new URLSearchParams(window.location.search).get("view");
  return v && v in MODULE_LABELS ? (v as ModuleKey) : "dashboard";
}

function urlFor(key: ModuleKey) {
  return key === "dashboard" ? "/dashboard" : `/dashboard?view=${key}`;
}

const VIEW_EVENT = "tareg:view";

function subscribeView(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(VIEW_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(VIEW_EVENT, onChange);
  };
}

function goToView(key: ModuleKey, replace = false) {
  if (replace) window.history.replaceState(null, "", urlFor(key));
  else window.history.pushState(null, "", urlFor(key));
  window.dispatchEvent(new Event(VIEW_EVENT));
}

// Floating AI assistant (bottom-right) is hidden for now, not removed. Flip to bring it back.
const SHOW_AI_ASSISTANT = false;
// "Maintenance cost: scheduled vs emergency" chart is hidden for now, not removed.
const SHOW_MAINTENANCE_COST_CHART = false;

// ---------- Chart configs ----------

function buildChartOptions(dark: boolean, lang: Language, tx: (b: Bi) => string, statusCounts: Map<StatusCode, number>) {
  const months = lastMonths(6, lang);

  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of EXPENSES) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);

  const STATUS_COLOR: Partial<Record<StatusCode, string>> = {
    active: "#16a34a",
    inMaintenance: ACCENT_ORANGE,
    brokenDown: "#dc2626",
    inactive: "#a3a3a3",
  };

  // Donuts live in a third-width card: two legend columns and a slightly smaller
  // pie keep six long category names from paging the legend ("1/2").
  const donutLegend = { itemWidth: 135, itemDistance: 8, itemMarginTop: 3, symbolHeight: 9 };
  const donutPie = { pie: { size: "78%", center: ["50%", "42%"] as [string, string] } };

  return {
    mileage: primeChartOptions(
      {
        chart: { type: "areaspline", height: 250 },
        xAxis: { categories: months },
        legend: { enabled: false },
        plotOptions: { areaspline: { fillOpacity: 0.12 } },
        tooltip: { pointFormat: `<b>{point.y:,.0f} ${lang === "ar" ? "كم" : "km"}</b>` },
        series: [{ type: "areaspline", name: tx({ en: "Kilometers", ar: "الكيلومترات" }), data: MONTHLY_KM, color: PRIME_BLUE, marker: { enabled: true, radius: 4 } }],
      },
      dark,
    ),
    expenses: primeChartOptions(
      {
        chart: { type: "pie", height: 250 },
        legend: donutLegend,
        plotOptions: donutPie,
        tooltip: { pointFormat: `<b>{point.y:,.0f} ${lang === "ar" ? "ر.س" : "SAR"}</b>` },
        series: [
          {
            type: "pie",
            innerSize: "60%",
            dataLabels: { enabled: false },
            showInLegend: true,
            data: [...byCategory.entries()].map(([cat, y], i) => ({ name: tx(EXPENSE_CATEGORIES[cat]), y, color: CHART_COLORS[i % CHART_COLORS.length] })),
          },
        ],
      },
      dark,
    ),
    status: primeChartOptions(
      {
        chart: { type: "pie", height: 250 },
        legend: donutLegend,
        plotOptions: donutPie,
        series: [
          {
            type: "pie",
            innerSize: "60%",
            dataLabels: { enabled: false },
            showInLegend: true,
            data: [...statusCounts.entries()].map(([code, y]) => ({ name: tx(STATUS[code].label), y, color: STATUS_COLOR[code] ?? PRIME_BLUE })),
          },
        ],
      },
      dark,
    ),
    maintenance: primeChartOptions(
      {
        chart: { type: "column", height: 250 },
        xAxis: { categories: months },
        plotOptions: { column: { borderRadius: 3, stacking: "normal" } },
        tooltip: { pointFormat: `{series.name}: <b>{point.y:,.0f} ${lang === "ar" ? "ر.س" : "SAR"}</b>` },
        series: [
          { type: "column", name: tx({ en: "Scheduled", ar: "مجدولة" }), data: MAINTENANCE_COST.scheduled, color: PRIME_BLUE },
          { type: "column", name: tx({ en: "Emergency", ar: "طارئة" }), data: MAINTENANCE_COST.emergency, color: ACCENT_ORANGE },
        ],
      },
      dark,
    ),
  };
}

// ---------- Entrance animation variants ----------

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const section = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const QUICK_ACTIONS: { icon: string; label: Bi; target: ModuleKey }[] = [
  { icon: "car", label: { en: "Add vehicle", ar: "إضافة مركبة" }, target: "vehicles" },
  { icon: "driver", label: { en: "Add driver", ar: "إضافة سائق" }, target: "drivers" },
  { icon: "wrench", label: { en: "Record maintenance", ar: "تسجيل صيانة" }, target: "maintenance" },
  { icon: "accident", label: { en: "Record accident", ar: "تسجيل حادث" }, target: "accidents" },
  { icon: "ticket", label: { en: "Record violation", ar: "تسجيل مخالفة" }, target: "violations" },
  { icon: "receipt", label: { en: "Add expense", ar: "إضافة مصروف" }, target: "expenses" },
];

function ViewAll({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  return (
    <button onClick={onClick} className="text-xs font-semibold text-prime-600 transition-colors hover:text-prime-700 dark:text-prime-400">
      {t("viewAll")}
    </button>
  );
}

// ---------- Live figures ----------

/** Pageless counts: ask for one row and read the total. */
const count = (path: string, query: Record<string, string> = {}) => api.page(path, { ...query, pageSize: 1 }).then((p) => p.total);

/** First rows of a list. */
const firstRows = <T,>(path: string, query: Record<string, string | number> = {}) =>
  api.page<T>(path, { ...query, page: 1 }).then((p) => p.items);

/**
 * The home figures the backend can answer. Each part is fetched only when the
 * role can see that module. List filters take one status each, so "pending"
 * and "open" figures add two counts. Fleet expenses, the expenses chart and
 * the km chart have no API yet and stay mock (tagged on screen).
 */
function useLiveHome(enabled: boolean) {
  const can = useCan();
  const vehicles = enabled && can("vehicles:view");
  const drivers = enabled && can("drivers:view");
  const mileage = enabled && can("mileage:view");
  const breakdowns = enabled && can("breakdowns:view");
  const approvals = enabled && can("approvals:view");
  const compliance = enabled && can("compliance:view");
  const maintenance = enabled && can("maintenance:view");
  return useApi(async () => {
    const none = Promise.resolve(null);
    const [
      [total, active, maint, broken, inactive],
      drv,
      [open, inProgress],
      [atAssistant, atManager, waitAssistant, waitManager],
      [expiring, expired, expiries],
      schedule,
      recent,
    ] = await Promise.all([
      vehicles
        ? Promise.all([count("/vehicles"), count("/vehicles", { status: "active" }), count("/vehicles", { status: "inMaintenance" }), count("/vehicles", { status: "brokenDown" }), count("/vehicles", { status: "inactive" })])
        : [null, null, null, null, null],
      drivers ? count("/drivers", { status: "active" }) : none,
      breakdowns ? Promise.all([count("/breakdowns", { status: "open" }), count("/breakdowns", { status: "inProgress" })]) : [null, null],
      approvals
        ? Promise.all([
            count("/approvals", { status: "pendingAssistant" }),
            count("/approvals", { status: "pendingFleetManager" }),
            firstRows<ApiApproval>("/approvals", { status: "pendingAssistant", pageSize: 6, sort: "createdAt" }),
            firstRows<ApiApproval>("/approvals", { status: "pendingFleetManager", pageSize: 6, sort: "createdAt" }),
          ])
        : [null, null, null, null],
      compliance
        ? Promise.all([
            count("/compliance", { status: "expiringSoon" }),
            count("/compliance", { status: "expired" }),
            // Expired and expiring within 30 days, soonest expiry first.
            firstRows<ApiComplianceItem>("/compliance", { withinDays: 30, pageSize: 6 }),
          ])
        : [null, null, null],
      maintenance ? api.get<ApiServiceDue[]>("/maintenance/schedule") : none,
      mileage ? firstRows<ApiMileage>("/mileage", { pageSize: 5, sort: "-date" }) : none,
    ]);
    const sum = (a: number | null, b: number | null) => (a === null || b === null ? null : a + b);
    const statusCounts = new Map<StatusCode, number>();
    if (active !== null) statusCounts.set("active", active);
    if (maint !== null) statusCounts.set("inMaintenance", maint);
    if (broken !== null) statusCounts.set("brokenDown", broken);
    if (inactive !== null) statusCounts.set("inactive", inactive);
    return {
      total,
      active: drv,
      offRoad: sum(maint, broken),
      openBreakdowns: sum(open, inProgress),
      pendingApprovals: sum(atAssistant, atManager),
      // Oldest first: the request waiting longest leads.
      pending: waitAssistant && waitManager ? [...waitAssistant, ...waitManager].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, 6) : [],
      expiring,
      expired,
      expiries: expiries ?? [],
      // The server orders overdue, then due soon, then scheduled.
      upcoming: (schedule ?? []).filter((d) => d.status !== "scheduled").slice(0, 5),
      statusCounts,
      recent,
    };
  }, `${vehicles}${drivers}${mileage}${breakdowns}${approvals}${compliance}${maintenance}`);
}

// ---------- Page ----------

export default function DashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, tx, language } = useT();
  const session = useSession();
  const [booting, setBooting] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  // The server render has no URL, so it starts on the dashboard; the boot
  // loader covers the switch, so the dashboard never flashes first.
  const urlView = useSyncExternalStore(subscribeView, viewFromUrl, () => "dashboard" as ModuleKey);
  const [opening, setOpening] = useState<ModuleKey | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const canOpen = useCanOpen();

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 1100);
    return () => clearTimeout(timer);
  }, []);

  // Guard: no valid session means back to the sign-in page (also fires when
  // the 12h token runs out mid-use and a call comes back 401).
  useEffect(() => {
    restoreSession();
  }, []);
  useEffect(() => {
    if (session.status === "signedOut") router.replace("/login");
  }, [session.status, router]);
  const ready = !booting && session.status === "signedIn";

  // A URL naming a screen this role can't open falls back to the dashboard.
  const blocked = session.status === "signedIn" && urlView !== "dashboard" && !canOpen(urlView);
  const view: ModuleKey = blocked ? "dashboard" : urlView;
  useEffect(() => {
    if (blocked) goToView("dashboard", true);
  }, [blocked]);
  const live = useLiveHome(session.status === "signedIn").data;
  const statusCounts = live?.statusCounts;
  const charts = useMemo(
    () => buildChartOptions(theme === "dark", language, (b) => b[language], statusCounts ?? new Map()),
    [theme, language, statusCounts],
  );

  function openModule(key: ModuleKey) {
    if (key === "dashboard") {
      if (view !== "dashboard") goToView("dashboard");
      return;
    }
    if (opening || key === view) return;
    setOpening(key);
    setTimeout(() => {
      goToView(key);
      setOpening(null);
    }, 900);
  }

  // ---------- Derived dashboard figures ----------
  const spend = EXPENSES.reduce((s, e) => s + e.amount, 0);
  const sarSuffix = language === "ar" ? " ر.س" : "";
  const sarPrefix = language === "ar" ? "" : "SAR ";

  const plate = (p: string | null | undefined) => <span dir="ltr">{p ?? "-"}</span>;
  const status = (code: StatusCode) => <Badge label={tx(STATUS[code].label)} tone={STATUS[code].tone} />;

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar
        active={view}
        onSelect={openModule}
        onLogout={() => {
          signOut();
          router.push("/login");
        }}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleMobileSidebar={() => setMobileOpen((o) => !o)} onNavigate={openModule} />

        <main className="flex-1 px-4 py-6 sm:px-6">
          {!ready ? null : view === "ai-reporting" ? (
            <AiReportingView />
          ) : view !== "dashboard" ? (
            <FleetModule key={view} moduleKey={view} onNavigate={openModule} />
          ) : (
            (
              <motion.div variants={container} initial="hidden" animate="visible" className="mx-auto max-w-7xl space-y-6">
                {/* Header + filters */}
                <motion.div variants={section} className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">
                      {tx({ en: "Fleet", ar: "لوحة تحكم" })}{" "}
                      <span className="text-prime-600">{tx({ en: "Dashboard", ar: "الأسطول" })}</span>
                    </h1>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      {tx({ en: "Vehicles, drivers, compliance and approvals at a glance.", ar: "المركبات والسائقون والامتثال والموافقات في لمحة واحدة." })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="w-40">
                      <DatePicker value={filterFrom} onChange={setFilterFrom} />
                    </div>
                    <div className="w-40">
                      <DatePicker value={filterTo} onChange={setFilterTo} />
                    </div>
                    <button className="rounded-lg bg-prime-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-prime-500">
                      {t("filter")}
                    </button>
                    <button
                      onClick={() => {
                        setFilterFrom("");
                        setFilterTo("");
                      }}
                      className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    >
                      {t("clear")}
                    </button>
                  </div>
                </motion.div>

                {/* KPI cards: each opens the module it summarises */}
                <motion.div variants={section} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard value={live?.total ?? 0} sub={tx({ en: "Total vehicles", ar: "إجمالي المركبات" })} onClick={() => openModule("vehicles")} />
                  <StatCard value={live?.active ?? 0} sub={tx({ en: "Active drivers", ar: "السائقون النشطون" })} onClick={() => openModule("drivers")} />
                  <StatCard value={live?.offRoad ?? 0} sub={tx({ en: "Vehicles off the road", ar: "مركبات خارج الخدمة" })} tone="warn" onClick={() => openModule("maintenance")} />
                  <StatCard value={live?.openBreakdowns ?? 0} sub={tx({ en: "Open breakdowns", ar: "أعطال مفتوحة" })} tone="bad" onClick={() => openModule("breakdowns")} />
                  <StatCard value={live?.pendingApprovals ?? 0} sub={tx({ en: "Pending approvals", ar: "موافقات معلقة" })} tone="warn" onClick={() => openModule("approvals")} />
                  <StatCard value={live?.expiring ?? 0} sub={tx({ en: "Expiring in 30 days", ar: "تنتهي خلال 30 يومًا" })} tone="warn" onClick={() => openModule("compliance")} />
                  <StatCard value={live?.expired ?? 0} sub={tx({ en: "Expired documents", ar: "وثائق منتهية" })} tone="bad" onClick={() => openModule("compliance")} />
                  <StatCard mock value={spend} prefix={sarPrefix} suffix={sarSuffix} sub={tx({ en: "Fleet expenses (30 days)", ar: "مصروفات الأسطول (30 يومًا)" })} onClick={() => openModule("expenses")} />
                </motion.div>

                {/* Quick Actions */}
                <motion.div variants={section}>
                  <h2 className="mb-4 text-lg font-bold text-foreground">{t("quickActions")}</h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {QUICK_ACTIONS.map((a) => (
                      <motion.button
                        key={a.target}
                        onClick={() => openModule(a.target)}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        className="group flex flex-col items-center gap-2.5 rounded-xl border border-neutral-100 bg-white px-3 py-5 text-neutral-700 shadow-sm transition-colors hover:border-prime-200 hover:text-prime-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-prime-800 dark:hover:text-prime-400"
                      >
                        <NavIcon name={a.icon} size={26} />
                        <span className="text-center text-xs font-medium">{tx(a.label)}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Needs attention */}
                <motion.div variants={section} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <DataTable
                    searchable={false}
                    title={tx({ en: "Upcoming & overdue expiries", ar: "الوثائق المنتهية والقريبة من الانتهاء" })}
                    action={<ViewAll onClick={() => openModule("compliance")} />}
                    headers={[tx({ en: "Document", ar: "الوثيقة" }), tx({ en: "Holder", ar: "صاحب الوثيقة" }), tx({ en: "Expiry", ar: "الانتهاء" }), tx({ en: "Status", ar: "الحالة" })]}
                    empty={tx({ en: "Nothing expired or expiring in the next 30 days.", ar: "لا توجد وثائق منتهية أو تنتهي خلال 30 يومًا." })}
                    rows={(live?.expiries ?? []).map((c) => ({
                      key: c.id,
                      cells: [
                        tx(DOCUMENT_LABEL[c.document]),
                        c.subject.name ? tx(c.subject.name) : plate(c.subject.plateNumber),
                        fmtDate(c.expiry, language),
                        status(c.status),
                      ],
                    }))}
                  />
                  <DataTable
                    searchable={false}
                    title={tx({ en: "Pending approvals", ar: "الموافقات المعلقة" })}
                    action={<ViewAll onClick={() => openModule("approvals")} />}
                    headers={[tx({ en: "Request", ar: "الطلب" }), tx({ en: "Driver", ar: "السائق" }), tx({ en: "Amount", ar: "المبلغ" }), tx({ en: "Waiting on", ar: "بانتظار" })]}
                    empty={tx({ en: "No requests waiting for a decision.", ar: "لا توجد طلبات بانتظار قرار." })}
                    rows={(live?.pending ?? []).map((a) => ({
                      key: a.id,
                      cells: [
                        tx(APPROVAL_TYPE_LABEL[a.type]),
                        a.driver ? tx(a.driver.name) : "-",
                        fmtSAR(a.amount, language),
                        a.waitingOn ? (
                          <Badge
                            key="w"
                            label={tx(a.waitingOn === "assistant" ? { en: "Assistant", ar: "المساعد" } : { en: "Fleet Manager", ar: "مدير الأسطول" })}
                            tone="warn"
                          />
                        ) : (
                          "-"
                        ),
                      ],
                    }))}
                  />
                </motion.div>

                {/* Charts */}
                {/* Three charts sit in one row; four fall back to a 2x2 grid. */}
                <motion.div variants={section} className={`grid grid-cols-1 gap-4 ${SHOW_MAINTENANCE_COST_CHART ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
                  <ChartCard mock title={tx({ en: "Kilometers driven (6 months)", ar: "الكيلومترات المقطوعة (6 أشهر)" })} options={charts.mileage} />
                  <ChartCard mock title={tx({ en: "Expenses by category", ar: "المصروفات حسب الفئة" })} options={charts.expenses} />
                  <ChartCard title={tx({ en: "Fleet status", ar: "حالة الأسطول" })} options={charts.status} />
                  {SHOW_MAINTENANCE_COST_CHART && (
                    <ChartCard mock title={tx({ en: "Maintenance cost: scheduled vs emergency", ar: "تكلفة الصيانة: مجدولة مقابل طارئة" })} options={charts.maintenance} />
                  )}
                </motion.div>

                {/* Operations */}
                <motion.div variants={section} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <DataTable
                    searchable={false}
                    title={tx({ en: "Upcoming maintenance", ar: "الصيانة القادمة" })}
                    action={<ViewAll onClick={() => openModule("maintenance")} />}
                    headers={[tx({ en: "Vehicle", ar: "المركبة" }), tx({ en: "Service", ar: "الخدمة" }), tx({ en: "Due", ar: "الاستحقاق" }), tx({ en: "Status", ar: "الحالة" })]}
                    empty={tx({ en: "No service overdue or due soon.", ar: "لا توجد صيانة متأخرة أو قريبة." })}
                    rows={(live?.upcoming ?? []).map((m) => ({
                      key: m.vehicleId,
                      cells: [
                        plate(m.vehicle?.plateNumber),
                        m.task,
                        m.dueDate ? fmtDate(m.dueDate, language) : m.dueKm !== null ? fmtKm(m.dueKm, language) : "-",
                        status(m.status),
                      ],
                    }))}
                  />
                  <DataTable
                    searchable={false}
                    title={tx({ en: "Recent driver submissions", ar: "أحدث قراءات السائقين" })}
                    action={<ViewAll onClick={() => openModule("mileage")} />}
                    headers={[tx({ en: "Driver", ar: "السائق" }), tx({ en: "Vehicle", ar: "المركبة" }), tx({ en: "Reading", ar: "القراءة" }), tx({ en: "Status", ar: "الحالة" })]}
                    empty={tx({ en: "No readings yet.", ar: "لا توجد قراءات بعد." })}
                    rows={(live?.recent ?? []).map((m) => ({
                      key: m.id,
                      cells: [m.driver ? tx(m.driver.name) : "-", plate(m.vehicle?.plateNumber), fmtKm(m.reading, language), status(m.status)],
                    }))}
                  />
                </motion.div>
              </motion.div>
            )
          )}
        </main>
      </div>

      {SHOW_AI_ASSISTANT && <AiAssistant />}

      {/* Boot + module-opening loaders */}
      <AnimatePresence>
        {!ready && <Loader fullScreen label={t("loadingDashboard")} />}
        {opening && <Loader fullScreen label={`${t("opening")} ${tx(MODULE_LABELS[opening])}…`} />}
      </AnimatePresence>
    </div>
  );
}
