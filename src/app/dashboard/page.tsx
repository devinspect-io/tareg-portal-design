"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "@/components/dashboard/ChartCard";
import DataTable, { StatusBadge } from "@/components/dashboard/DataTable";
import ComingSoon from "@/components/dashboard/ComingSoon";
import DatePicker from "@/components/dashboard/DatePicker";
import InventoryView from "@/components/dashboard/InventoryView";
import AiReportingView from "@/components/dashboard/AiReportingView";
import AiAssistant from "@/components/dashboard/AiAssistant";
import ModuleView from "@/components/dashboard/ModuleView";
import BillingView from "@/components/dashboard/BillingView";
import { MODULE_VIEWS } from "@/lib/module-data";
import Loader from "@/components/Loader";
import { primeChartOptions, PRIME_BLUE, ACCENT_ORANGE } from "@/lib/chart-theme";
import { useTheme } from "@/lib/useTheme";

import {
  BALANCE_SHEET,
  BRANCH_SALES,
  CASH_IN,
  CASH_OUT,
  EXPENSE_SERIES,
  INVENTORY_STATUS,
  LAST_7_DAYS,
  PAYABLE_TOTAL,
  QUICK_ACTIONS,
  RECEIVABLE_TOTAL,
  REVENUE_SERIES,
  SALES_TREND,
  STATS,
  TERRITORY_SALES,
  TOP_CUSTOMERS,
  TOP_ROUTES,
} from "@/lib/dashboard-data";

// Floating AI assistant (bottom-right) is hidden for now, not removed. Flip to bring it back.
const SHOW_AI_ASSISTANT = false;

// ---------- Chart configs (static demo data; blue = inbound, orange = outbound) ----------

function buildChartOptions(dark: boolean) {
  return {
    salesTrend: primeChartOptions(
      {
        chart: { type: "line", height: 250 },
        xAxis: { categories: LAST_7_DAYS },
        legend: { enabled: false },
        series: [
          {
            type: "line",
            name: "Shipments Delivered",
            data: SALES_TREND,
            marker: { enabled: true, radius: 4 },
          },
        ],
      },
      dark,
    ),
    receivablesPayables: primeChartOptions(
      {
        chart: { type: "pie", height: 250 },
        tooltip: { pointFormat: "<b>AED {point.y:,.0f}</b>" },
        series: [
          {
            type: "pie",
            innerSize: "65%",
            dataLabels: { enabled: false },
            showInLegend: true,
            data: [
              { name: "Receivable", y: RECEIVABLE_TOTAL, color: PRIME_BLUE },
              { name: "Payable", y: PAYABLE_TOTAL, color: ACCENT_ORANGE },
            ],
          },
        ],
      },
      dark,
    ),
    revenueExpenses: primeChartOptions(
      {
        chart: { type: "column", height: 250 },
        xAxis: { categories: LAST_7_DAYS },
        plotOptions: { column: { borderRadius: 3 } },
        series: [
          { type: "column", name: "Revenue", data: REVENUE_SERIES, color: PRIME_BLUE },
          { type: "column", name: "Expenses", data: EXPENSE_SERIES, color: ACCENT_ORANGE },
        ],
      },
      dark,
    ),
    cashFlow: primeChartOptions(
      {
        chart: { type: "areaspline", height: 250 },
        xAxis: { categories: LAST_7_DAYS },
        plotOptions: {
          areaspline: { fillOpacity: 0.12, marker: { enabled: false } },
        },
        series: [
          { type: "areaspline", name: "Cash In", data: CASH_IN, color: PRIME_BLUE },
          { type: "areaspline", name: "Cash Out", data: CASH_OUT, color: ACCENT_ORANGE },
        ],
      },
      dark,
    ),
    branchSales: primeChartOptions(
      {
        chart: { type: "bar", height: 250 },
        xAxis: { categories: BRANCH_SALES.map((b) => b.name) },
        legend: { enabled: false },
        tooltip: { pointFormat: "<b>AED {point.y:,.0f}</b>" },
        plotOptions: { bar: { borderRadius: 3, colorByPoint: true } },
        series: [
          { type: "bar", name: "Sales", data: BRANCH_SALES.map((b) => b.value) },
        ],
      },
      dark,
    ),
    territorySales: primeChartOptions(
      {
        chart: { type: "column", height: 250 },
        xAxis: { categories: TERRITORY_SALES.map((t) => t.name) },
        legend: { enabled: false },
        tooltip: { pointFormat: "<b>AED {point.y:,.0f}</b>" },
        plotOptions: { column: { borderRadius: 3, colorByPoint: true } },
        series: [
          {
            type: "column",
            name: "Sales",
            data: TERRITORY_SALES.map((t) => t.value),
          },
        ],
      },
      dark,
    ),
  };
}

// ---------- Entrance animation variants ----------

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const section = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ---------- Quick-action icons ----------

function ActionIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    pos: (
      <>
        <rect x={4} y={3} width={16} height={8} rx={1.5} />
        <path d="M4 15h16v6H4zM8 7h.01M12 7h.01M16 7h.01M8 18h8" />
      </>
    ),
    cart: (
      <>
        <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.3h7.7a1.5 1.5 0 0 0 1.5-1.2L20 8H6" />
        <circle cx={10} cy={20} r={1.5} />
        <circle cx={16.5} cy={20} r={1.5} />
      </>
    ),
    voucher: (
      <>
        <rect x={3} y={6} width={18} height={12} rx={2} />
        <path d="M3 10h18M8 15h4" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 2h12v20l-2-1.5L14 22l-2-1.5L10 22l-2-1.5L6 22z" />
        <path d="M9.5 7h5M9.5 11h5M9.5 15h3" />
      </>
    ),
    flow: (
      <>
        <path d="M4 7h13M14 3l4 4-4 4M20 17H7M10 13l-4 4 4 4" />
      </>
    ),
    bank: (
      <path d="M3 9l9-6 9 6M4 9v9M8 10v8M12 10v8M16 10v8M20 9v9M2.5 21h19" />
    ),
  };
  return (
    <svg
      width={26}
      height={26}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

// ---------- Page ----------

export default function DashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [booting, setBooting] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState("Home");
  const [opening, setOpening] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [ledgerDate, setLedgerDate] = useState("");

  const charts = useMemo(() => buildChartOptions(theme === "dark"), [theme]);

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 1100);
    return () => clearTimeout(t);
  }, []);

  function openModule(label: string) {
    if (label === "Home") {
      setView("Home");
      return;
    }
    if (opening) return;
    setOpening(label);
    setTimeout(() => {
      setView(label);
      setOpening(null);
    }, 900);
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar
        active={view}
        onSelect={openModule}
        onLogout={() => router.push("/login")}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleMobileSidebar={() => setMobileOpen((o) => !o)} />

        <main className="flex-1 px-4 py-6 sm:px-6">
          {view === "Warehouse Stock" ? (
            <InventoryView />
          ) : view === "AI Reporting" ? (
            <AiReportingView />
          ) : view === "Billing & Invoices" ? (
            <BillingView />
          ) : MODULE_VIEWS[view] ? (
            <ModuleView config={MODULE_VIEWS[view]} />
          ) : view !== "Home" ? (
            <ComingSoon module={view} onBack={() => setView("Home")} />
          ) : (
            !booting && (
              <motion.div
                variants={container}
                initial="hidden"
                animate="visible"
                className="mx-auto max-w-7xl space-y-6"
              >
                {/* Header + filters */}
                <motion.div
                  variants={section}
                  className="flex flex-wrap items-end justify-between gap-4"
                >
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">
                      Tareg <span className="text-prime-600">Dashboard</span>
                    </h1>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      Welcome back! Here&apos;s your business overview.
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
                      Filter
                    </button>
                    <button
                      onClick={() => {
                        setFilterFrom("");
                        setFilterTo("");
                      }}
                      className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    >
                      Clear
                    </button>
                  </div>
                </motion.div>

                {/* Stat cards */}
                <motion.div
                  variants={section}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {STATS.map((s) => (
                    <StatCard
                      key={s.sub}
                      value={s.value}
                      sub={s.sub}
                      prefix={s.prefix}
                    />
                  ))}
                </motion.div>

                {/* Quick Ledger Access */}
                <motion.div
                  variants={section}
                  className="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <h2 className="mb-4 text-lg font-bold text-foreground">
                    Quick Ledger Access
                  </h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      placeholder="Enter Customer/Supplier/Account Name"
                      className="min-w-56 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-neutral-400 focus:border-prime-500 dark:border-neutral-700 dark:bg-neutral-800 dark:placeholder:text-neutral-500"
                    />
                    <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-300">
                      {["Customer", "Supplier", "Account (GL)"].map((r, i) => (
                        <label
                          key={r}
                          className="flex cursor-pointer items-center gap-1.5"
                        >
                          <input
                            type="radio"
                            name="ledger-type"
                            defaultChecked={i === 0}
                            className="accent-prime-600"
                          />
                          {r}
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["7D", "14D", "30D", "Quarter", "Year", "All"].map(
                        (chip) => (
                          <button
                            key={chip}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                              chip === "All"
                                ? "border-prime-600 bg-prime-600 text-white"
                                : "border-neutral-200 bg-white text-neutral-600 hover:border-prime-300 hover:text-prime-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-prime-500 dark:hover:text-prime-400"
                            }`}
                          >
                            {chip}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="w-40">
                      <DatePicker value={ledgerDate} onChange={setLedgerDate} />
                    </div>
                    <button
                      onClick={() => openModule("Ledger")}
                      className="rounded-lg bg-prime-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-prime-500"
                    >
                      Open Ledger
                    </button>
                  </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div variants={section}>
                  <h2 className="mb-4 text-lg font-bold text-foreground">
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {QUICK_ACTIONS.map((a) => (
                      <motion.button
                        key={a.label}
                        onClick={() => openModule(a.label)}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        className="group flex flex-col items-center gap-2.5 rounded-xl border border-neutral-100 bg-white px-3 py-5 text-neutral-700 shadow-sm transition-colors hover:border-prime-200 hover:text-prime-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-prime-800 dark:hover:text-prime-400"
                      >
                        <ActionIcon name={a.icon} />
                        <span className="text-center text-xs font-medium">
                          {a.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Charts */}
                <motion.div
                  variants={section}
                  className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                >
                  <ChartCard title="Shipment Trend" options={charts.salesTrend} />
                  <ChartCard
                    title="Receivables vs Payables"
                    options={charts.receivablesPayables}
                  />
                  <ChartCard
                    title="Revenue vs Expenses"
                    options={charts.revenueExpenses}
                  />
                  <ChartCard
                    title="Cash Flow (Last 7 Days)"
                    options={charts.cashFlow}
                  />
                  <ChartCard title="Branch Sales" options={charts.branchSales} />
                  <ChartCard
                    title="Territory Sales"
                    options={charts.territorySales}
                  />
                </motion.div>

                {/* Tables */}
                <motion.div
                  variants={section}
                  className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                >
                  <DataTable
                    title="Top Routes"
                    headers={["Route", "Shipments", "Revenue"]}
                    rows={TOP_ROUTES.map((r) => ({
                      cells: [r.route, r.shipments, r.revenue],
                    }))}
                  />
                  <DataTable
                    title="Top Customers"
                    headers={["Customer", "Shipments", "Sales"]}
                    rows={TOP_CUSTOMERS.map((c) => ({
                      cells: [c.customer, c.orders, c.sales],
                    }))}
                  />
                  <DataTable
                    title="Warehouse Stock Status"
                    headers={["Item", "Stock", "Status"]}
                    rows={INVENTORY_STATUS.map((i) => ({
                      cells: [
                        i.item,
                        i.stock,
                        <StatusBadge key="s" status={i.status} />,
                      ],
                    }))}
                  />
                  <DataTable
                    title="Balance Sheet"
                    headers={["Item", "Amount"]}
                    rows={[
                      ...BALANCE_SHEET.assets.map((a) => ({
                        cells: [a.item, a.amount],
                      })),
                      {
                        cells: ["Total Assets", BALANCE_SHEET.totalAssets],
                        tint: "blue" as const,
                      },
                      {
                        cells: [
                          "Total Liabilities",
                          BALANCE_SHEET.totalLiabilities,
                        ],
                        tint: "red" as const,
                      },
                      {
                        cells: ["Total Equity", BALANCE_SHEET.totalEquity],
                        tint: "green" as const,
                      },
                    ]}
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
        {booting && (
          <Loader fullScreen label="Loading your dashboard…" />
        )}
        {opening && <Loader fullScreen label={`Opening ${opening}…`} />}
      </AnimatePresence>
    </div>
  );
}
