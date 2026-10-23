"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DataTable, { Badge, type TableRow } from "@/components/dashboard/DataTable";
import { NavIcon } from "@/components/dashboard/Sidebar";
import { AccidentDetail, PhotoStack } from "@/components/dashboard/AccidentPhotos";
import CustomSelect from "@/components/dashboard/CustomSelect";
import DatePicker from "@/components/dashboard/DatePicker";
import { EditButton, Field, FilterBar, NumberInput, RecordModal, TextArea, TextInput, Toast, Toggle, inRange } from "@/components/dashboard/RecordTools";
import { nextRef, useAccidentStore, useExpenseStore, useSettingsStore, type FleetSettings, type KmFrequency } from "@/lib/fleet-store";
import { NotificationList, PriorityTabs, type CategoryFilter, type PriorityFilter } from "@/components/dashboard/NotificationsPanel";
import { useNotifications } from "@/lib/useNotifications";
import { useT } from "@/lib/translations";
import VehiclesLive from "@/components/dashboard/live/VehiclesLive";
import MileageLive from "@/components/dashboard/live/MileageLive";
import UsersLive from "@/components/dashboard/live/UsersLive";
import DriversLive from "@/components/dashboard/live/DriversLive";
import AssignmentsLive from "@/components/dashboard/live/AssignmentsLive";
import { Block, ExpiryCell, Page, Status, section } from "@/components/dashboard/ModulePage";
import {
  ACCIDENTS,
  APPROVALS,
  ASSIGNMENTS,
  BREAKDOWNS,
  DRIVERS,
  EXPENSES,
  EXPENSE_CATEGORIES,
  FUEL,
  MAINTENANCE_RECORDS,
  MILEAGE,
  MONTHLY_KM,
  NOTIFICATION_CATEGORIES,
  OFFICE_USERS,
  PERMISSIONS,
  REPORTS,
  REPORT_GROUPS,
  ROLES,
  SCHEDULED_MAINTENANCE,
  STATUS,
  VEHICLES,
  VIOLATIONS,
  complianceItems,
  daysUntil,
  driverById,
  dueStatus,
  expiryStatus,
  fmtDate,
  fmtKm,
  fmtSAR,
  todayISO,
  vehicleById,
  vehicleOfDriver,
  type Access,
  type Accident,
  type ReportGroup,
  type ReportId,
  type Expense,
  type ExpenseCategory,
  type ApprovalStep,
  type ModuleKey,
  type NotificationCategory,
  type Priority,
  type StatusCode,
  type Tone,
} from "@/lib/fleet-data";
import type { Bi } from "@/lib/translations";

// ---------- Small shared pieces ----------

function CameraIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx={12} cy={13} r={3.5} />
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6L15 7" />
    </svg>
  );
}


/** Name lookups that never throw on a dangling id. */
function useNames() {
  const { tx } = useT();
  return {
    driver: (id: string | null) => {
      const d = driverById(id);
      return d ? tx(d.name) : "-";
    },
    vehicle: (id: string | null) => vehicleById(id)?.plate ?? "-",
    vehicleFull: (id: string | null) => {
      const v = vehicleById(id);
      return v ? `${v.plate} · ${tx(v.make)} ${v.model}` : "-";
    },
  };
}

// ---------- Fleet ----------

// PARKED: mock version, replaced by live/VehiclesLive.tsx (real API). Kept for offline demos; swap it back in the module switch below to preview.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function VehiclesView() {
  const { tx, language } = useT();
  const names = useNames();
  const count = (s: StatusCode) => String(VEHICLES.filter((v) => v.status === s).length);
  return (
    <Page
      moduleKey="vehicles"
      subtitle={{ en: "Every vehicle with its driver, mileage, status and documents.", ar: "جميع المركبات مع السائق وقراءة العداد والحالة والوثائق." }}
      primaryAction={{ en: "Add vehicle", ar: "إضافة مركبة" }}
      stats={[
        { label: { en: "Total vehicles", ar: "إجمالي المركبات" }, value: String(VEHICLES.length) },
        { label: { en: "Active", ar: "نشطة" }, value: count("active"), tone: "good" },
        { label: { en: "In maintenance", ar: "في الصيانة" }, value: count("inMaintenance"), tone: "warn" },
        { label: { en: "Broken down", ar: "معطلة" }, value: count("brokenDown"), tone: "bad" },
      ]}
    >
      <Block>
        <DataTable
          title={tx({ en: "Vehicle register", ar: "سجل المركبات" })}
          headers={[
            tx({ en: "Plate", ar: "اللوحة" }),
            tx({ en: "Make / model", ar: "الشركة / الطراز" }),
            tx({ en: "Year", ar: "السنة" }),
            tx({ en: "VIN / chassis", ar: "رقم الهيكل" }),
            tx({ en: "Mileage", ar: "العداد" }),
            tx({ en: "Assigned driver", ar: "السائق المسند" }),
            tx({ en: "City", ar: "المدينة" }),
            tx({ en: "Registration", ar: "الاستمارة" }),
            tx({ en: "Status", ar: "الحالة" }),
          ]}
          rows={VEHICLES.map((v) => ({
            key: v.id,
            cells: [
              <span key="p" className="font-semibold text-foreground">{v.plate}</span>,
              `${tx(v.make)} ${v.model}`,
              v.year,
              <span key="vin" className="font-mono text-xs">{v.vin}</span>,
              fmtKm(v.mileage, language),
              names.driver(v.driverId),
              tx(v.city),
              <ExpiryCell key="r" iso={v.registrationExpiry} />,
              <Status key="s" code={v.status} />,
            ],
          }))}
        />
      </Block>
    </Page>
  );
}

// PARKED: mock version, replaced by live/DriversLive.tsx (real API). Kept for offline demos; swap it back in the module switch below to preview.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DriversView() {
  const { tx } = useT();
  const names = useNames();
  const expiringDocs = DRIVERS.filter((d) => expiryStatus(d.idExpiry) !== "valid" || expiryStatus(d.licenseExpiry) !== "valid").length;
  return (
    <Page
      moduleKey="drivers"
      subtitle={{ en: "Driver profiles, identity documents, licenses and assigned vehicles.", ar: "ملفات السائقين ووثائق الهوية والرخص والمركبات المسندة." }}
      primaryAction={{ en: "Add driver", ar: "إضافة سائق" }}
      stats={[
        { label: { en: "Total drivers", ar: "إجمالي السائقين" }, value: String(DRIVERS.length) },
        { label: { en: "Active", ar: "نشطون" }, value: String(DRIVERS.filter((d) => d.status === "active").length), tone: "good" },
        { label: { en: "On leave", ar: "في إجازة" }, value: String(DRIVERS.filter((d) => d.status === "onLeave").length) },
        { label: { en: "Documents needing action", ar: "وثائق تحتاج إجراء" }, value: String(expiringDocs), tone: "bad" },
      ]}
    >
      <Block>
        <DataTable
          title={tx({ en: "Driver register", ar: "سجل السائقين" })}
          headers={[
            tx({ en: "Name", ar: "الاسم" }),
            tx({ en: "Employee no.", ar: "الرقم الوظيفي" }),
            tx({ en: "Phone", ar: "الجوال" }),
            tx({ en: "Nationality", ar: "الجنسية" }),
            tx({ en: "ID / Iqama no.", ar: "رقم الهوية / الإقامة" }),
            tx({ en: "ID / Iqama expiry", ar: "انتهاء الهوية / الإقامة" }),
            tx({ en: "License expiry", ar: "انتهاء الرخصة" }),
            tx({ en: "Vehicle", ar: "المركبة" }),
            tx({ en: "Status", ar: "الحالة" }),
          ]}
          rows={DRIVERS.map((d) => ({
            key: d.id,
            cells: [
              <span key="n" className="font-semibold text-foreground">{tx(d.name)}</span>,
              d.employeeNo,
              <span key="ph" dir="ltr">{d.phone}</span>,
              tx(d.nationality),
              <span key="id" className="font-mono text-xs">{d.idNumber}</span>,
              <ExpiryCell key="ie" iso={d.idExpiry} />,
              <ExpiryCell key="le" iso={d.licenseExpiry} />,
              names.vehicle(VEHICLES.find((v) => v.driverId === d.id)?.id ?? null),
              <Status key="s" code={d.status} />,
            ],
          }))}
        />
      </Block>
    </Page>
  );
}

// PARKED: mock version, replaced by live/AssignmentsLive.tsx (real API). Kept for offline demos; swap it back in the module switch below to preview.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AssignmentsView() {
  const { tx, language } = useT();
  const names = useNames();
  const rows = [...ASSIGNMENTS].sort((a, b) => b.from.localeCompare(a.from));
  return (
    <Page
      moduleKey="assignments"
      subtitle={{ en: "Which driver has which vehicle, with the full assignment history.", ar: "أي سائق يستخدم أي مركبة، مع سجل الإسناد الكامل." }}
      primaryAction={{ en: "New assignment", ar: "إسناد جديد" }}
      stats={[
        { label: { en: "Current assignments", ar: "الإسنادات الحالية" }, value: String(ASSIGNMENTS.filter((a) => !a.to).length) },
        { label: { en: "Unassigned vehicles", ar: "مركبات بدون سائق" }, value: String(VEHICLES.filter((v) => !v.driverId).length), tone: "warn" },
        { label: { en: "Drivers without vehicle", ar: "سائقون بدون مركبة" }, value: String(DRIVERS.filter((d) => !VEHICLES.some((v) => v.driverId === d.id)).length) },
        { label: { en: "Past assignments", ar: "إسنادات سابقة" }, value: String(ASSIGNMENTS.filter((a) => a.to).length) },
      ]}
    >
      <Block>
        <DataTable
          title={tx({ en: "Assignment history", ar: "سجل الإسناد" })}
          headers={[
            tx({ en: "Vehicle", ar: "المركبة" }),
            tx({ en: "Driver", ar: "السائق" }),
            tx({ en: "From", ar: "من" }),
            tx({ en: "To", ar: "إلى" }),
            tx({ en: "Status", ar: "الحالة" }),
          ]}
          rows={rows.map((a, i) => ({
            key: `${a.vehicleId}-${a.driverId}-${i}`,
            cells: [
              names.vehicleFull(a.vehicleId),
              names.driver(a.driverId),
              fmtDate(a.from, language),
              a.to ? fmtDate(a.to, language) : "-",
              a.to ? (
                <Badge key="s" label={tx({ en: "Ended", ar: "منتهي" })} tone="neutral" />
              ) : (
                <Badge key="s" label={tx({ en: "Current", ar: "حالي" })} tone="good" />
              ),
            ],
          }))}
        />
      </Block>
    </Page>
  );
}

// PARKED: mock version, replaced by live/MileageLive.tsx (real API). Kept for offline demos; swap it back in the module switch below to preview.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function MileageView() {
  const { tx, language } = useT();
  const names = useNames();
  const thisMonth = MONTHLY_KM[MONTHLY_KM.length - 1];
  return (
    <Page
      moduleKey="mileage"
      subtitle={{ en: "Kilometer readings submitted by drivers from the mobile app, with photo evidence.", ar: "قراءات العداد المرسلة من السائقين عبر تطبيق الجوال مع صور الإثبات." }}
      stats={[
        { label: { en: "Submissions this week", ar: "قراءات هذا الأسبوع" }, value: String(MILEAGE.length) },
        { label: { en: "Awaiting review", ar: "بانتظار المراجعة" }, value: String(MILEAGE.filter((m) => m.status === "pending" || m.status === "inReview").length), tone: "warn" },
        { label: { en: "Km driven this month", ar: "الكيلومترات هذا الشهر" }, value: fmtKm(thisMonth, language) },
        { label: { en: "Average per vehicle", ar: "المتوسط لكل مركبة" }, value: fmtKm(Math.round(thisMonth / VEHICLES.length), language) },
      ]}
    >
      <Block>
        <DataTable
          title={tx({ en: "Driver submissions", ar: "قراءات السائقين" })}
          headers={[
            tx({ en: "Ref.", ar: "المرجع" }),
            tx({ en: "Date", ar: "التاريخ" }),
            tx({ en: "Driver", ar: "السائق" }),
            tx({ en: "Vehicle", ar: "المركبة" }),
            tx({ en: "Previous", ar: "القراءة السابقة" }),
            tx({ en: "New reading", ar: "القراءة الجديدة" }),
            tx({ en: "Distance", ar: "المسافة" }),
            tx({ en: "Photos", ar: "الصور" }),
            tx({ en: "Status", ar: "الحالة" }),
          ]}
          rows={MILEAGE.map((m) => ({
            key: m.id,
            cells: [
              m.id,
              fmtDate(m.date, language),
              names.driver(m.driverId),
              names.vehicle(m.vehicleId),
              fmtKm(m.previous, language),
              <span key="r" className="font-semibold text-foreground">{fmtKm(m.reading, language)}</span>,
              fmtKm(m.reading - m.previous, language),
              <span key="ph" className="inline-flex items-center gap-1 text-prime-600">
                <CameraIcon /> {m.photos}
              </span>,
              <Status key="s" code={m.status} />,
            ],
          }))}
        />
      </Block>
    </Page>
  );
}

// ---------- Operations ----------

function MaintenanceView() {
  const { tx, language } = useT();
  const names = useNames();
  const statuses = SCHEDULED_MAINTENANCE.map((m) => dueStatus(m.dueDate));
  const spend = MAINTENANCE_RECORDS.reduce((sum, r) => sum + r.cost, 0);
  return (
    <Page
      moduleKey="maintenance"
      subtitle={{ en: "Scheduled service, repairs, battery and tire replacements, with workshop costs.", ar: "الصيانة المجدولة والإصلاحات وتغيير البطاريات والإطارات مع تكاليف الورش." }}
      primaryAction={{ en: "Record maintenance", ar: "تسجيل صيانة" }}
      stats={[
        { label: { en: "Due in 14 days", ar: "تستحق خلال 14 يومًا" }, value: String(statuses.filter((s) => s === "dueSoon").length), tone: "warn" },
        { label: { en: "Overdue", ar: "متأخرة" }, value: String(statuses.filter((s) => s === "overdue").length), tone: "bad" },
        { label: { en: "In the workshop", ar: "في الورشة" }, value: String(MAINTENANCE_RECORDS.filter((r) => r.status === "inProgress").length) },
        { label: { en: "Spend (last 30 days)", ar: "الإنفاق (آخر 30 يومًا)" }, value: fmtSAR(spend, language) },
      ]}
    >
      <Block>
        <DataTable
          title={tx({ en: "Upcoming maintenance", ar: "الصيانة القادمة" })}
          headers={[
            tx({ en: "Vehicle", ar: "المركبة" }),
            tx({ en: "Service", ar: "الخدمة" }),
            tx({ en: "Due date", ar: "تاريخ الاستحقاق" }),
            tx({ en: "Due at", ar: "عند العداد" }),
            tx({ en: "Status", ar: "الحالة" }),
          ]}
          rows={SCHEDULED_MAINTENANCE.map((m, i) => ({
            key: `sm-${i}`,
            cells: [names.vehicleFull(m.vehicleId), tx(m.task), fmtDate(m.dueDate, language), fmtKm(m.dueKm, language), <Status key="s" code={dueStatus(m.dueDate)} />],
          }))}
        />
      </Block>
      <Block>
        <DataTable
          title={tx({ en: "Maintenance records", ar: "سجل الصيانة" })}
          headers={[
            tx({ en: "Ref.", ar: "المرجع" }),
            tx({ en: "Date", ar: "التاريخ" }),
            tx({ en: "Vehicle", ar: "المركبة" }),
            tx({ en: "Work done", ar: "العمل المنجز" }),
            tx({ en: "Workshop / vendor", ar: "الورشة / المورد" }),
            tx({ en: "Cost", ar: "التكلفة" }),
            tx({ en: "Type", ar: "النوع" }),
            tx({ en: "Status", ar: "الحالة" }),
          ]}
          rows={MAINTENANCE_RECORDS.map((r) => ({
            key: r.id,
            cells: [
              r.id,
              fmtDate(r.date, language),
              names.vehicle(r.vehicleId),
              tx(r.type),
              tx(r.vendor),
              fmtSAR(r.cost, language),
              r.emergency ? (
                <Badge key="t" label={tx({ en: "Emergency", ar: "طارئة" })} tone="bad" />
              ) : (
                <Badge key="t" label={tx({ en: "Planned", ar: "مخططة" })} tone="info" />
              ),
              <Status key="s" code={r.status} />,
            ],
          }))}
        />
      </Block>
    </Page>
  );
}

function BreakdownsView() {
  const { tx, language } = useT();
  const names = useNames();
  return (
    <Page
      moduleKey="breakdowns"
      subtitle={{ en: "Roadside breakdowns and emergency repairs reported by drivers.", ar: "الأعطال على الطريق والإصلاحات الطارئة المبلغ عنها من السائقين." }}
      primaryAction={{ en: "Record breakdown", ar: "تسجيل عطل" }}
      stats={[
        { label: { en: "Open", ar: "مفتوحة" }, value: String(BREAKDOWNS.filter((b) => b.status === "open").length), tone: "bad" },
        { label: { en: "In progress", ar: "قيد المعالجة" }, value: String(BREAKDOWNS.filter((b) => b.status === "inProgress").length), tone: "warn" },
        { label: { en: "Major breakdowns", ar: "أعطال كبيرة" }, value: String(BREAKDOWNS.filter((b) => b.major).length) },
        { label: { en: "Closed", ar: "مغلقة" }, value: String(BREAKDOWNS.filter((b) => b.status === "closed").length), tone: "good" },
      ]}
    >
      <Block>
        <DataTable
          title={tx({ en: "Breakdown log", ar: "سجل الأعطال" })}
          headers={[
            tx({ en: "Ref.", ar: "المرجع" }),
            tx({ en: "Date", ar: "التاريخ" }),
            tx({ en: "Vehicle", ar: "المركبة" }),
            tx({ en: "Driver", ar: "السائق" }),
            tx({ en: "Location", ar: "الموقع" }),
            tx({ en: "Description", ar: "الوصف" }),
            tx({ en: "Severity", ar: "الخطورة" }),
            tx({ en: "Status", ar: "الحالة" }),
          ]}
          rows={BREAKDOWNS.map((b) => ({
            key: b.id,
            cells: [
              b.id,
              fmtDate(b.date, language),
              names.vehicle(b.vehicleId),
              names.driver(b.driverId),
              tx(b.location),
              <span key="d" className="whitespace-normal">{tx(b.description)}</span>,
              b.major ? <Badge key="m" label={tx({ en: "Major", ar: "كبير" })} tone="bad" /> : <Badge key="m" label={tx({ en: "Minor", ar: "بسيط" })} tone="neutral" />,
              <Status key="s" code={b.status} />,
            ],
          }))}
        />
      </Block>
    </Page>
  );
}

const STEP_STYLE: Record<ApprovalStep["state"], string> = {
  done: "bg-green-500 text-white",
  current: "bg-accent-500 text-white ring-4 ring-accent-500/20",
  waiting: "bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400",
  rejected: "bg-red-500 text-white",
};

function ApprovalChain({ steps }: { steps: ApprovalStep[] }) {
  const { tx } = useT();
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${STEP_STYLE[s.state]}`}>
              {s.state === "done" ? "✓" : s.state === "rejected" ? "✕" : i + 1}
            </span>
            <span className={`text-xs font-medium ${s.state === "current" ? "text-accent-700 dark:text-accent-400" : "text-neutral-600 dark:text-neutral-300"}`}>
              {tx(s.role)}
            </span>
          </span>
          {i < steps.length - 1 && <span className="h-px w-6 bg-neutral-300 dark:bg-neutral-700" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

function ApprovalsView() {
  const { tx, language } = useT();
  const names = useNames();
  const pending = APPROVALS.filter((a) => a.status === "pending");
  const decided = APPROVALS.filter((a) => a.status !== "pending");
  return (
    <Page
      moduleKey="approvals"
      subtitle={{ en: "Driver requests move through Driver → Assistant → Fleet Manager before work proceeds.", ar: "تمر طلبات السائقين عبر السائق ← المساعد ← مدير الأسطول قبل تنفيذ العمل." }}
      stats={[
        { label: { en: "Pending", ar: "قيد الانتظار" }, value: String(pending.length), tone: "warn" },
        { label: { en: "Waiting on Fleet Manager", ar: "بانتظار مدير الأسطول" }, value: String(pending.filter((a) => a.steps[2]?.state === "current").length), tone: "warn" },
        { label: { en: "Approved", ar: "معتمدة" }, value: String(APPROVALS.filter((a) => a.status === "approved").length), tone: "good" },
        { label: { en: "Rejected", ar: "مرفوضة" }, value: String(APPROVALS.filter((a) => a.status === "rejected").length), tone: "bad" },
      ]}
    >
      <motion.div variants={section} className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{tx({ en: "Waiting for a decision", ar: "بانتظار القرار" })}</h2>
        {pending.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-0 space-y-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                {tx(a.type)} <span className="font-normal text-neutral-400">{a.id}</span>
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {names.driver(a.driverId)} · {names.vehicle(a.vehicleId)} · {fmtDate(a.date, language)}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{tx(a.note)}</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <ApprovalChain steps={a.steps} />
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">{fmtSAR(a.amount, language)}</span>
                <button className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40">
                  {tx({ en: "Reject", ar: "رفض" })}
                </button>
                <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-500">
                  {tx({ en: "Approve", ar: "اعتماد" })}
                </button>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
      <Block>
        <DataTable
          title={tx({ en: "Decided requests", ar: "الطلبات المحسومة" })}
          headers={[
            tx({ en: "Ref.", ar: "المرجع" }),
            tx({ en: "Request", ar: "الطلب" }),
            tx({ en: "Driver", ar: "السائق" }),
            tx({ en: "Vehicle", ar: "المركبة" }),
            tx({ en: "Amount", ar: "المبلغ" }),
            tx({ en: "Approval chain", ar: "مسار الموافقة" }),
            tx({ en: "Status", ar: "الحالة" }),
          ]}
          rows={decided.map((a) => ({
            key: a.id,
            cells: [a.id, tx(a.type), names.driver(a.driverId), names.vehicle(a.vehicleId), fmtSAR(a.amount, language), <ApprovalChain key="c" steps={a.steps} />, <Status key="s" code={a.status} />],
          }))}
        />
      </Block>
    </Page>
  );
}

/** Keeps the original pair when text is unchanged, else stores what was typed for both languages. */
function toBi(text: string, original: Bi | undefined, lang: "en" | "ar"): Bi {
  if (original && original[lang] === text) return original;
  return { en: text, ar: text };
}

type AccidentDraft = {
  id: string;
  date: string;
  vehicleId: string;
  driverId: string;
  location: string;
  description: string;
  reference: string;
  cost: number;
  status: StatusCode;
};

function AccidentsView() {
  const { tx, language } = useT();
  const names = useNames();
  const { items, upsert, remove } = useAccidentStore();
  const [selected, setSelected] = useState<Accident | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [draft, setDraft] = useState<AccidentDraft | null>(null);
  const original = draft ? items.find((a) => a.id === draft.id) : undefined;

  const q = search.trim().toLowerCase();
  const filtered = items.filter((a) => {
    const haystack = [a.id, a.reference, names.vehicle(a.vehicleId), names.driver(a.driverId), a.location.en, a.location.ar, a.description.en, a.description.ar]
      .join(" ")
      .toLowerCase();
    return (
      (!q || haystack.includes(q)) &&
      (!status || a.status === status) &&
      (!vehicle || a.vehicleId === vehicle) &&
      (!driver || a.driverId === driver) &&
      inRange(a.date, from, to)
    );
  });

  const accidentStatuses: StatusCode[] = ["open", "inReview", "closed"];
  const statusOptions = accidentStatuses.map((c) => ({ value: c, label: tx(STATUS[c].label) }));
  const vehicleOptions = VEHICLES.map((v) => ({ value: v.id, label: `${v.plate} · ${tx(v.make)} ${v.model}` }));
  const driverOptions = DRIVERS.map((d) => ({ value: d.id, label: tx(d.name) }));

  const openNew = () =>
    setDraft({ id: nextRef("ACC", items), date: todayISO(), vehicleId: "", driverId: "", location: "", description: "", reference: "", cost: 0, status: "open" });
  const openEdit = (a: Accident) =>
    setDraft({ id: a.id, date: a.date, vehicleId: a.vehicleId, driverId: a.driverId, location: tx(a.location), description: tx(a.description), reference: a.reference, cost: a.cost, status: a.status });
  const save = () => {
    if (!draft) return;
    upsert({
      id: draft.id,
      date: draft.date,
      vehicleId: draft.vehicleId,
      driverId: draft.driverId,
      location: toBi(draft.location, original?.location, language),
      description: toBi(draft.description, original?.description, language),
      reference: draft.reference,
      cost: draft.cost,
      status: draft.status,
      photos: original?.photos ?? [],
    });
    setDraft(null);
  };
  const set = (patch: Partial<AccidentDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <Page
      moduleKey="accidents"
      subtitle={{ en: "Accidents with location, Najm/police reference, costs and photos.", ar: "الحوادث مع الموقع ومرجع نجم أو الشرطة والتكاليف والصور." }}
      primaryAction={{ en: "Record accident", ar: "تسجيل حادث" }}
      onPrimaryAction={openNew}
      stats={[
        { label: { en: "Open", ar: "مفتوحة" }, value: String(items.filter((a) => a.status === "open").length), tone: "bad" },
        { label: { en: "In review", ar: "قيد المراجعة" }, value: String(items.filter((a) => a.status === "inReview").length), tone: "warn" },
        { label: { en: "This year", ar: "هذا العام" }, value: String(items.length) },
        { label: { en: "Repair costs", ar: "تكاليف الإصلاح" }, value: fmtSAR(items.reduce((s, a) => s + a.cost, 0), language) },
      ]}
    >
      <Block>
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder={tx({ en: "Search ref, plate, driver, location, Najm no.", ar: "ابحث بالمرجع أو اللوحة أو السائق أو الموقع أو رقم نجم" })}
          filters={[
            { label: tx({ en: "All statuses", ar: "كل الحالات" }), value: status, onChange: setStatus, options: statusOptions },
            { label: tx({ en: "All vehicles", ar: "كل المركبات" }), value: vehicle, onChange: setVehicle, options: vehicleOptions },
            { label: tx({ en: "All drivers", ar: "كل السائقين" }), value: driver, onChange: setDriver, options: driverOptions },
          ]}
          from={from}
          to={to}
          onFrom={setFrom}
          onTo={setTo}
          shown={filtered.length}
          total={items.length}
          onClear={() => {
            setSearch("");
            setStatus("");
            setVehicle("");
            setDriver("");
            setFrom("");
            setTo("");
          }}
        />
      </Block>
      <Block>
        <DataTable
          title={tx({ en: "Accident log", ar: "سجل الحوادث" })}
          empty={tx({ en: "No accidents match these filters.", ar: "لا توجد حوادث مطابقة لعوامل التصفية." })}
          headers={[
            tx({ en: "Ref.", ar: "المرجع" }),
            tx({ en: "Date", ar: "التاريخ" }),
            tx({ en: "Vehicle", ar: "المركبة" }),
            tx({ en: "Driver", ar: "السائق" }),
            tx({ en: "Location", ar: "الموقع" }),
            tx({ en: "Description", ar: "الوصف" }),
            tx({ en: "Photos", ar: "الصور" }),
            tx({ en: "Najm report", ar: "تقرير نجم" }),
            tx({ en: "Cost", ar: "التكلفة" }),
            tx({ en: "Status", ar: "الحالة" }),
            "",
          ]}
          rows={filtered.map((a) => ({
            key: a.id,
            cells: [
              <button key="id" onClick={() => setSelected(a)} className="font-semibold text-prime-600 hover:underline dark:text-prime-400">
                {a.id}
              </button>,
              fmtDate(a.date, language),
              names.vehicle(a.vehicleId),
              names.driver(a.driverId),
              tx(a.location),
              <span key="d" className="whitespace-normal">{tx(a.description)}</span>,
              a.photos.length > 0 ? (
                <PhotoStack key="ph" accident={a} onOpen={() => setSelected(a)} />
              ) : (
                <span key="ph" className="text-xs text-neutral-400">{tx({ en: "No photos yet", ar: "لا توجد صور بعد" })}</span>
              ),
              <span key="r" className="font-mono text-xs">{a.reference || "-"}</span>,
              fmtSAR(a.cost, language),
              <Status key="s" code={a.status} />,
              <EditButton key="e" onClick={() => openEdit(a)} label={tx({ en: `Edit ${a.id}`, ar: `تعديل ${a.id}` })} />,
            ],
          }))}
        />
      </Block>
      <AccidentDetail accident={selected} onClose={() => setSelected(null)} />
      <RecordModal
        open={draft !== null}
        title={original ? tx({ en: `Edit ${draft?.id}`, ar: `تعديل ${draft?.id}` }) : tx({ en: "Record accident", ar: "تسجيل حادث" })}
        onClose={() => setDraft(null)}
        onSave={save}
        onDelete={original ? () => { remove(original.id); setDraft(null); } : undefined}
        canSave={Boolean(draft?.date && draft.vehicleId && draft.driverId && draft.location.trim())}
      >
        {draft && (
          <>
            <Field label={tx({ en: "Date", ar: "التاريخ" })}>
              <DatePicker value={draft.date} onChange={(v) => set({ date: v })} />
            </Field>
            <Field label={tx({ en: "Status", ar: "الحالة" })}>
              <CustomSelect value={draft.status} onChange={(v) => set({ status: v as StatusCode })} options={statusOptions} />
            </Field>
            <Field label={tx({ en: "Vehicle", ar: "المركبة" })}>
              <CustomSelect value={draft.vehicleId} onChange={(v) => set({ vehicleId: v })} options={vehicleOptions} placeholder={tx({ en: "Select a vehicle", ar: "اختر مركبة" })} />
            </Field>
            <Field label={tx({ en: "Driver", ar: "السائق" })}>
              <CustomSelect value={draft.driverId} onChange={(v) => set({ driverId: v })} options={driverOptions} placeholder={tx({ en: "Select a driver", ar: "اختر سائقًا" })} />
            </Field>
            <Field label={tx({ en: "Location", ar: "الموقع" })} wide>
              <TextInput value={draft.location} onChange={(v) => set({ location: v })} />
            </Field>
            <Field label={tx({ en: "Description", ar: "الوصف" })} wide>
              <TextArea value={draft.description} onChange={(v) => set({ description: v })} />
            </Field>
            <Field label={tx({ en: "Najm / police report no.", ar: "رقم تقرير نجم / الشرطة" })}>
              <TextInput value={draft.reference} onChange={(v) => set({ reference: v })} placeholder="NJM-2026-000000" dir="ltr" />
            </Field>
            <Field label={tx({ en: "Repair cost", ar: "تكلفة الإصلاح" })}>
              <NumberInput value={draft.cost} onChange={(v) => set({ cost: v })} suffix={language === "ar" ? "ر.س" : "SAR"} />
            </Field>
            <p className="text-xs text-neutral-500 sm:col-span-2 dark:text-neutral-400">
              {tx({ en: "Photos are uploaded by the driver from the mobile app and appear here automatically.", ar: "يرفع السائق الصور من تطبيق الجوال وتظهر هنا تلقائيًا." })}
            </p>
          </>
        )}
      </RecordModal>
    </Page>
  );
}

function ViolationsView() {
  const { tx, language } = useT();
  const names = useNames();
  const unpaid = VIOLATIONS.filter((v) => v.status === "unpaid");
  return (
    <Page
      moduleKey="violations"
      subtitle={{ en: "Traffic fines recorded against the responsible driver and vehicle.", ar: "المخالفات المرورية المسجلة على السائق والمركبة المسؤولين." }}
      primaryAction={{ en: "Record violation", ar: "تسجيل مخالفة" }}
      stats={[
        { label: { en: "Unpaid fines", ar: "مخالفات غير مدفوعة" }, value: String(unpaid.length), tone: "bad" },
        { label: { en: "Unpaid amount", ar: "المبلغ غير المدفوع" }, value: fmtSAR(unpaid.reduce((s, v) => s + v.fine, 0), language), tone: "bad" },
        { label: { en: "This month", ar: "هذا الشهر" }, value: String(VIOLATIONS.length) },
        { label: { en: "Paid", ar: "مدفوعة" }, value: String(VIOLATIONS.filter((v) => v.status === "paid").length), tone: "good" },
      ]}
    >
      <Block>
        <DataTable
          title={tx({ en: "Violation log", ar: "سجل المخالفات" })}
          headers={[
            tx({ en: "Ref.", ar: "المرجع" }),
            tx({ en: "Date", ar: "التاريخ" }),
            tx({ en: "Violation", ar: "المخالفة" }),
            tx({ en: "Driver", ar: "السائق" }),
            tx({ en: "Vehicle", ar: "المركبة" }),
            tx({ en: "Location", ar: "الموقع" }),
            tx({ en: "Fine", ar: "الغرامة" }),
            tx({ en: "Status", ar: "الحالة" }),
          ]}
          rows={VIOLATIONS.map((v) => ({
            key: v.id,
            cells: [v.id, fmtDate(v.date, language), tx(v.type), names.driver(v.driverId), names.vehicle(v.vehicleId), tx(v.location), fmtSAR(v.fine, language), <Status key="s" code={v.status} />],
          }))}
        />
      </Block>
    </Page>
  );
}

// ---------- Compliance & finance ----------

function ComplianceView() {
  const { tx, language } = useT();
  const items = complianceItems();
  const count = (s: StatusCode) => items.filter((i) => expiryStatus(i.expiry) === s).length;
  const needsAction = items.filter((i) => expiryStatus(i.expiry) !== "valid");
  const toRow = (i: (typeof items)[number], k: number): TableRow => {
    const left = daysUntil(i.expiry);
    return {
      key: `c-${k}`,
      cells: [
        tx(i.document),
        <span key="h" className="font-medium text-foreground">{tx(i.subject)}</span>,
        i.kind === "driver" ? tx({ en: "Driver", ar: "سائق" }) : tx({ en: "Vehicle", ar: "مركبة" }),
        fmtDate(i.expiry, language),
        left < 0
          ? tx({ en: `${-left} days ago`, ar: `منذ ${-left} يوم` })
          : tx({ en: `${left} days`, ar: `${left} يوم` }),
        <Status key="s" code={expiryStatus(i.expiry)} />,
      ],
    };
  };
  const headers = [
    tx({ en: "Document", ar: "الوثيقة" }),
    tx({ en: "Holder", ar: "صاحب الوثيقة" }),
    tx({ en: "Type", ar: "النوع" }),
    tx({ en: "Expiry", ar: "تاريخ الانتهاء" }),
    tx({ en: "Remaining", ar: "المتبقي" }),
    tx({ en: "Status", ar: "الحالة" }),
  ];
  return (
    <Page
      moduleKey="compliance"
      subtitle={{ en: "Licenses, Iqamas, registrations, insurance and inspections, with expiry alerts.", ar: "الرخص والإقامات والاستمارات والتأمين والفحص الدوري مع تنبيهات الانتهاء." }}
      stats={[
        { label: { en: "Expired", ar: "منتهية" }, value: String(count("expired")), tone: "bad" },
        { label: { en: "Expiring in 30 days", ar: "تنتهي خلال 30 يومًا" }, value: String(count("expiringSoon")), tone: "warn" },
        { label: { en: "Valid", ar: "سارية" }, value: String(count("valid")), tone: "good" },
        { label: { en: "Documents tracked", ar: "الوثائق المتابعة" }, value: String(items.length) },
      ]}
    >
      <Block>
        <DataTable title={tx({ en: "Needs action", ar: "تحتاج إجراء" })} headers={headers} rows={needsAction.map(toRow)} />
      </Block>
      <Block>
        <DataTable
          title={tx({ en: "All tracked documents", ar: "جميع الوثائق المتابعة" })}
          headers={headers}
          rows={items.filter((i) => expiryStatus(i.expiry) === "valid").map((i, k) => toRow(i, k + 1000))}
        />
      </Block>
    </Page>
  );
}

function FuelView() {
  const { tx, language } = useT();
  const names = useNames();
  const allocation = FUEL.reduce((s, f) => s + f.allocation, 0);
  const used = FUEL.reduce((s, f) => s + f.used, 0);
  return (
    <Page
      moduleKey="fuel"
      subtitle={{ en: "Monthly fuel allocations per vehicle and driver, and how much has been used.", ar: "مخصصات الوقود الشهرية لكل مركبة وسائق والكمية المستهلكة." }}
      primaryAction={{ en: "Set allocation", ar: "تحديد مخصص" }}
      stats={[
        { label: { en: "Monthly allocation", ar: "المخصص الشهري" }, value: fmtSAR(allocation, language) },
        { label: { en: "Used so far", ar: "المستهلك حتى الآن" }, value: fmtSAR(used, language), tone: "warn" },
        { label: { en: "Remaining", ar: "المتبقي" }, value: fmtSAR(allocation - used, language), tone: "good" },
        { label: { en: "Liters this month", ar: "اللترات هذا الشهر" }, value: FUEL.reduce((s, f) => s + f.liters, 0).toLocaleString("en-US") },
      ]}
    >
      <Block>
        <DataTable
          title={tx({ en: "Fuel benefits", ar: "مخصصات الوقود" })}
          headers={[
            tx({ en: "Vehicle", ar: "المركبة" }),
            tx({ en: "Driver", ar: "السائق" }),
            tx({ en: "Allocation", ar: "المخصص" }),
            tx({ en: "Used", ar: "المستهلك" }),
            tx({ en: "Usage", ar: "نسبة الاستهلاك" }),
            tx({ en: "Liters", ar: "اللترات" }),
          ]}
          rows={FUEL.map((f) => {
            const pct = Math.round((f.used / f.allocation) * 100);
            const bar = pct > 100 ? "bg-red-500" : pct >= 90 ? "bg-accent-500" : "bg-prime-600";
            return {
              key: f.vehicleId,
              cells: [
                names.vehicleFull(f.vehicleId),
                names.driver(f.driverId),
                fmtSAR(f.allocation, language),
                fmtSAR(f.used, language),
                <span key="u" className="flex items-center gap-2">
                  <span className="h-2 w-28 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <span className={`block h-full rounded-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </span>
                  <span className={pct > 100 ? "font-semibold text-red-600" : ""}>{pct}%</span>
                </span>,
                f.liters,
              ],
            };
          })}
        />
      </Block>
    </Page>
  );
}

type ExpenseDraft = {
  id: string;
  date: string;
  category: ExpenseCategory;
  vehicleId: string;
  vendor: string;
  amount: number;
  attachment: boolean;
  status: StatusCode;
};

function ExpensesView() {
  const { tx, language } = useT();
  const names = useNames();
  const { items, upsert, remove } = useExpenseStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [draft, setDraft] = useState<ExpenseDraft | null>(null);
  const original = draft ? items.find((e) => e.id === draft.id) : undefined;

  const q = search.trim().toLowerCase();
  const filtered = items.filter((e) => {
    const haystack = [e.id, e.vendor.en, e.vendor.ar, names.vehicle(e.vehicleId)].join(" ").toLowerCase();
    return (
      (!q || haystack.includes(q)) &&
      (!category || e.category === category) &&
      (!status || e.status === status) &&
      (!vehicle || e.vehicleId === vehicle) &&
      inRange(e.date, from, to)
    );
  });

  const total = items.reduce((sum, e) => sum + e.amount, 0);
  const unpaid = items.filter((e) => e.status === "unpaid");
  const categoryOptions = (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((c) => ({ value: c, label: tx(EXPENSE_CATEGORIES[c]) }));
  const statusOptions = (["paid", "unpaid"] as StatusCode[]).map((c) => ({ value: c, label: tx(STATUS[c].label) }));
  const vehicleOptions = VEHICLES.map((v) => ({ value: v.id, label: `${v.plate} · ${tx(v.make)} ${v.model}` }));

  const openNew = () =>
    setDraft({ id: nextRef("INV", items), date: todayISO(), category: "maintenance", vehicleId: "", vendor: "", amount: 0, attachment: false, status: "unpaid" });
  const openEdit = (e: Expense) =>
    setDraft({ id: e.id, date: e.date, category: e.category, vehicleId: e.vehicleId, vendor: tx(e.vendor), amount: e.amount, attachment: e.attachment, status: e.status });
  const save = () => {
    if (!draft) return;
    upsert({ ...draft, vendor: toBi(draft.vendor, original?.vendor, language) });
    setDraft(null);
  };
  const set = (patch: Partial<ExpenseDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <Page
      moduleKey="expenses"
      subtitle={{ en: "Fleet expense invoices linked to vehicles, maintenance and incidents.", ar: "فواتير مصروفات الأسطول المرتبطة بالمركبات والصيانة والحوادث." }}
      primaryAction={{ en: "Add expense", ar: "إضافة مصروف" }}
      onPrimaryAction={openNew}
      stats={[
        { label: { en: "Spend (last 30 days)", ar: "الإنفاق (آخر 30 يومًا)" }, value: fmtSAR(total, language) },
        { label: { en: "Unpaid invoices", ar: "فواتير غير مدفوعة" }, value: String(unpaid.length), tone: "bad" },
        { label: { en: "Unpaid amount", ar: "المبلغ غير المدفوع" }, value: fmtSAR(unpaid.reduce((s, e) => s + e.amount, 0), language), tone: "bad" },
        { label: { en: "Missing attachment", ar: "بدون مرفق" }, value: String(items.filter((e) => !e.attachment).length), tone: "warn" },
      ]}
    >
      <Block>
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder={tx({ en: "Search invoice no., vendor or plate", ar: "ابحث برقم الفاتورة أو المورد أو اللوحة" })}
          filters={[
            { label: tx({ en: "All categories", ar: "كل الفئات" }), value: category, onChange: setCategory, options: categoryOptions },
            { label: tx({ en: "All statuses", ar: "كل الحالات" }), value: status, onChange: setStatus, options: statusOptions },
            { label: tx({ en: "All vehicles", ar: "كل المركبات" }), value: vehicle, onChange: setVehicle, options: vehicleOptions },
          ]}
          from={from}
          to={to}
          onFrom={setFrom}
          onTo={setTo}
          shown={filtered.length}
          total={items.length}
          onClear={() => {
            setSearch("");
            setCategory("");
            setStatus("");
            setVehicle("");
            setFrom("");
            setTo("");
          }}
        />
      </Block>
      <Block>
        <DataTable
          title={tx({ en: "Invoices", ar: "الفواتير" })}
          empty={tx({ en: "No invoices match these filters.", ar: "لا توجد فواتير مطابقة لعوامل التصفية." })}
          headers={[
            tx({ en: "Invoice", ar: "الفاتورة" }),
            tx({ en: "Date", ar: "التاريخ" }),
            tx({ en: "Category", ar: "الفئة" }),
            tx({ en: "Vehicle", ar: "المركبة" }),
            tx({ en: "Vendor", ar: "المورد" }),
            tx({ en: "Amount", ar: "المبلغ" }),
            tx({ en: "Attachment", ar: "المرفق" }),
            tx({ en: "Status", ar: "الحالة" }),
            "",
          ]}
          rows={filtered.map((e) => ({
            key: e.id,
            cells: [
              e.id,
              fmtDate(e.date, language),
              tx(EXPENSE_CATEGORIES[e.category]),
              names.vehicle(e.vehicleId),
              tx(e.vendor),
              <span key="a" className="font-semibold text-foreground">{fmtSAR(e.amount, language)}</span>,
              e.attachment ? <span key="at" className="text-prime-600"><ClipIcon /></span> : <Badge key="at" label={tx({ en: "Missing", ar: "غير مرفق" })} tone="warn" />,
              <Status key="s" code={e.status} />,
              <EditButton key="ed" onClick={() => openEdit(e)} label={tx({ en: `Edit ${e.id}`, ar: `تعديل ${e.id}` })} />,
            ],
          }))}
        />
      </Block>
      <RecordModal
        open={draft !== null}
        title={original ? tx({ en: `Edit ${draft?.id}`, ar: `تعديل ${draft?.id}` }) : tx({ en: `New invoice ${draft?.id ?? ""}`, ar: `فاتورة جديدة ${draft?.id ?? ""}` })}
        onClose={() => setDraft(null)}
        onSave={save}
        onDelete={original ? () => { remove(original.id); setDraft(null); } : undefined}
        canSave={Boolean(draft?.date && draft.vehicleId && draft.vendor.trim() && draft.amount > 0)}
      >
        {draft && (
          <>
            <Field label={tx({ en: "Date", ar: "التاريخ" })}>
              <DatePicker value={draft.date} onChange={(v) => set({ date: v })} />
            </Field>
            <Field label={tx({ en: "Category", ar: "الفئة" })}>
              <CustomSelect value={draft.category} onChange={(v) => set({ category: v as ExpenseCategory })} options={categoryOptions} />
            </Field>
            <Field label={tx({ en: "Vehicle", ar: "المركبة" })}>
              <CustomSelect value={draft.vehicleId} onChange={(v) => set({ vehicleId: v })} options={vehicleOptions} placeholder={tx({ en: "Select a vehicle", ar: "اختر مركبة" })} />
            </Field>
            <Field label={tx({ en: "Vendor", ar: "المورد" })}>
              <TextInput value={draft.vendor} onChange={(v) => set({ vendor: v })} />
            </Field>
            <Field label={tx({ en: "Amount", ar: "المبلغ" })}>
              <NumberInput value={draft.amount} onChange={(v) => set({ amount: v })} suffix={language === "ar" ? "ر.س" : "SAR"} />
            </Field>
            <Field label={tx({ en: "Status", ar: "الحالة" })}>
              <CustomSelect value={draft.status} onChange={(v) => set({ status: v as StatusCode })} options={statusOptions} />
            </Field>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-foreground sm:col-span-2 dark:border-neutral-700">
              <input type="checkbox" checked={draft.attachment} onChange={(ev) => set({ attachment: ev.target.checked })} className="h-4 w-4 accent-prime-600" />
              <ClipIcon />
              {tx({ en: "Invoice document attached", ar: "تم إرفاق مستند الفاتورة" })}
            </label>
          </>
        )}
      </RecordModal>
    </Page>
  );
}

// ---------- Records ----------

type TimelineEvent = { date: string; title: Bi; detail: string; tone: Tone };

function HistoryView() {
  const { tx, language } = useT();
  const names = useNames();
  const [vehicleId, setVehicleId] = useState(VEHICLES[0].id);
  const vehicle = vehicleById(vehicleId)!;

  const events: TimelineEvent[] = [
    ...MAINTENANCE_RECORDS.filter((r) => r.vehicleId === vehicleId).map((r) => ({
      date: r.date,
      title: r.type,
      detail: `${tx(r.vendor)} · ${fmtSAR(r.cost, language)}`,
      tone: (r.emergency ? "bad" : "info") as Tone,
    })),
    ...BREAKDOWNS.filter((b) => b.vehicleId === vehicleId).map((b) => ({
      date: b.date,
      title: { en: "Breakdown", ar: "عطل" },
      detail: tx(b.description),
      tone: "bad" as Tone,
    })),
    ...ACCIDENTS.filter((a) => a.vehicleId === vehicleId).map((a) => ({
      date: a.date,
      title: { en: "Accident", ar: "حادث" },
      detail: `${tx(a.description)} · ${a.reference}`,
      tone: "bad" as Tone,
    })),
    ...VIOLATIONS.filter((v) => v.vehicleId === vehicleId).map((v) => ({
      date: v.date,
      title: { en: "Traffic violation", ar: "مخالفة مرورية" },
      detail: `${tx(v.type)} · ${fmtSAR(v.fine, language)}`,
      tone: "warn" as Tone,
    })),
    ...MILEAGE.filter((m) => m.vehicleId === vehicleId).map((m) => ({
      date: m.date,
      title: { en: "Kilometer reading", ar: "قراءة عداد" },
      detail: `${fmtKm(m.reading, language)} · ${names.driver(m.driverId)}`,
      tone: "neutral" as Tone,
    })),
    ...EXPENSES.filter((e) => e.vehicleId === vehicleId).map((e) => ({
      date: e.date,
      title: { en: "Expense", ar: "مصروف" },
      detail: `${tx(EXPENSE_CATEGORIES[e.category])} · ${fmtSAR(e.amount, language)}`,
      tone: "neutral" as Tone,
    })),
    ...ASSIGNMENTS.filter((a) => a.vehicleId === vehicleId).map((a) => ({
      date: a.from,
      title: { en: "Driver assigned", ar: "إسناد سائق" },
      detail: names.driver(a.driverId),
      tone: "good" as Tone,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const DOT: Record<Tone, string> = {
    good: "bg-green-500",
    warn: "bg-accent-500",
    bad: "bg-red-500",
    info: "bg-prime-600",
    neutral: "bg-neutral-400",
  };

  return (
    <Page moduleKey="history" subtitle={{ en: "The complete record of each vehicle: maintenance, incidents, readings, expenses and drivers.", ar: "السجل الكامل لكل مركبة: الصيانة والحوادث والقراءات والمصروفات والسائقين." }}>
      <motion.div variants={section} className="flex flex-wrap gap-2">
        {VEHICLES.map((v) => (
          <button
            key={v.id}
            onClick={() => setVehicleId(v.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              v.id === vehicleId
                ? "border-prime-600 bg-prime-600 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-prime-300 hover:text-prime-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            {v.plate}
          </button>
        ))}
      </motion.div>

      <motion.div variants={section} className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-lg font-bold text-foreground">{vehicle.plate}</p>
          <dl className="space-y-2 text-sm">
            {[
              [{ en: "Make / model", ar: "الشركة / الطراز" }, `${tx(vehicle.make)} ${vehicle.model} (${vehicle.year})`],
              [{ en: "Current driver", ar: "السائق الحالي" }, names.driver(vehicle.driverId)],
              [{ en: "Mileage", ar: "العداد" }, fmtKm(vehicle.mileage, language)],
              [{ en: "City", ar: "المدينة" }, tx(vehicle.city)],
              [{ en: "Insurance", ar: "التأمين" }, fmtDate(vehicle.insuranceExpiry, language)],
            ].map(([label, value]) => (
              <div key={(label as Bi).en} className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">{tx(label as Bi)}</dt>
                <dd className="text-end font-medium text-foreground">{value as string}</dd>
              </div>
            ))}
          </dl>
          <Status code={vehicle.status} />
        </div>

        <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-4 text-sm font-semibold text-foreground">{tx({ en: "Timeline", ar: "الخط الزمني" })}</h3>
          {events.length === 0 ? (
            <p className="text-sm text-neutral-400">{tx({ en: "No recorded events yet.", ar: "لا توجد أحداث مسجلة بعد." })}</p>
          ) : (
            <ol className="relative space-y-4 border-s border-neutral-200 ps-5 dark:border-neutral-700">
              {events.map((e, i) => (
                <li key={i} className="relative">
                  <span className={`absolute top-1.5 -start-[26px] h-3 w-3 rounded-full ring-4 ring-white dark:ring-neutral-900 ${DOT[e.tone]}`} />
                  <p className="text-sm font-semibold text-foreground">{tx(e.title)}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">{e.detail}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">{fmtDate(e.date, language)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </motion.div>
    </Page>
  );
}

type Period = "all" | "month" | "30d" | "90d" | "year" | "custom";

function periodRange(p: Period): { from: string; to: string } {
  const today = todayISO();
  const d = new Date();
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  if (p === "month") return { from: iso(new Date(d.getFullYear(), d.getMonth(), 1)), to: today };
  if (p === "30d") return { from: iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 30)), to: today };
  if (p === "90d") return { from: iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 90)), to: today };
  if (p === "year") return { from: iso(new Date(d.getFullYear(), 0, 1)), to: today };
  return { from: "", to: "" };
}

function ReportsView() {
  const { tx, language } = useT();
  const { items: accidents } = useAccidentStore();
  const { items: expenses } = useExpenseStore();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<ReportGroup | "all">("all");
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const [city, setCity] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const choosePeriod = (p: Period) => {
    setPeriod(p);
    const r = periodRange(p);
    setFrom(r.from);
    setTo(r.to);
  };

  // A record passes when its vehicle, driver (or the vehicle's assigned driver), city and date all match.
  const matches = (vehicleId: string, date: string | null, driverId?: string) => {
    const v = vehicleById(vehicleId);
    const effectiveDriver = driverId ?? v?.driverId ?? null;
    return (
      (!vehicle || vehicleId === vehicle) &&
      (!driver || effectiveDriver === driver) &&
      (!city || v?.city.en === city) &&
      (!date || inRange(date, from, to))
    );
  };

  const driverDocs = DRIVERS.filter((d) => (!driver || d.id === driver) && (!city || vehicleOfDriver(d.id)?.city.en === city)).flatMap((d) => [d.idExpiry, d.licenseExpiry]);
  const expiryDocs = from || to ? driverDocs.filter((e) => inRange(e, from, to)) : driverDocs.filter((e) => expiryStatus(e) !== "valid");
  const mileage = MILEAGE.filter((m) => matches(m.vehicleId, m.date, m.driverId));
  const maintenance = [
    ...MAINTENANCE_RECORDS.filter((r) => matches(r.vehicleId, r.date)),
    ...BREAKDOWNS.filter((b) => matches(b.vehicleId, b.date, b.driverId)),
  ];
  const acc = accidents.filter((a) => matches(a.vehicleId, a.date, a.driverId));
  const vio = VIOLATIONS.filter((v) => matches(v.vehicleId, v.date, v.driverId));
  const exp = expenses.filter((e) => matches(e.vehicleId, e.date));
  const vehiclesCovered = VEHICLES.filter((v) => matches(v.id, null));

  // Unit word only (the count is rendered separately), singular/plural in English.
  const unit = (n: number, one: string, many: string, ar: string) => tx({ en: n === 1 ? one : many, ar });
  const RESULTS: Record<ReportId, { count: number; unit: string; extra?: string }> = {
    expiry: { count: expiryDocs.length, unit: unit(expiryDocs.length, "document", "documents", "وثيقة") },
    maintenance: { count: maintenance.length, unit: unit(maintenance.length, "record", "records", "سجل"), extra: fmtSAR(MAINTENANCE_RECORDS.filter((r) => matches(r.vehicleId, r.date)).reduce((s, r) => s + r.cost, 0), language) },
    mileage: { count: mileage.length, unit: unit(mileage.length, "reading", "readings", "قراءة"), extra: fmtKm(mileage.reduce((s, m) => s + (m.reading - m.previous), 0), language) },
    accidents: { count: acc.length, unit: unit(acc.length, "record", "records", "سجل"), extra: fmtSAR(acc.reduce((s, a) => s + a.cost, 0), language) },
    violations: { count: vio.length, unit: unit(vio.length, "record", "records", "سجل"), extra: fmtSAR(vio.reduce((s, v) => s + v.fine, 0), language) },
    expenses: { count: exp.length, unit: unit(exp.length, "invoice", "invoices", "فاتورة"), extra: fmtSAR(exp.reduce((s, e) => s + e.amount, 0), language) },
    history: { count: vehiclesCovered.length, unit: unit(vehiclesCovered.length, "vehicle", "vehicles", "مركبة") },
  };


  const q = search.trim().toLowerCase();
  const visible = REPORTS.filter(
    (r) => (group === "all" || r.group === group) && (!q || `${r.title.en} ${r.title.ar} ${r.description.en} ${r.description.ar}`.toLowerCase().includes(q)),
  );

  const cities = [...new Map(VEHICLES.map((v) => [v.city.en, v.city])).values()];
  const periods: { key: Period; label: Bi }[] = [
    { key: "all", label: { en: "All time", ar: "كل الفترات" } },
    { key: "month", label: { en: "This month", ar: "هذا الشهر" } },
    { key: "30d", label: { en: "Last 30 days", ar: "آخر 30 يومًا" } },
    { key: "90d", label: { en: "Last 3 months", ar: "آخر 3 أشهر" } },
    { key: "year", label: { en: "This year", ar: "هذا العام" } },
  ];

  const clearAll = () => {
    setSearch("");
    setGroup("all");
    setVehicle("");
    setDriver("");
    setCity("");
    choosePeriod("all");
  };

  const exportReport = (title: Bi, format: string, count: number) =>
    setToast(tx({ en: `${title.en} exported as ${format} (${count} matching)`, ar: `تم تصدير ${title.ar} بصيغة ${format} (${count} مطابقة)` }));

  return (
    <Page moduleKey="reports" subtitle={{ en: "Operational reports for management review. Filter, then export to PDF or Excel.", ar: "تقارير تشغيلية لمراجعة الإدارة. صفِّ النتائج ثم صدّرها إلى PDF أو Excel." }}>
      <motion.div variants={section} className="flex flex-wrap gap-2">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => choosePeriod(p.key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              period === p.key
                ? "border-prime-600 bg-prime-600 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-prime-300 hover:text-prime-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            {tx(p.label)}
          </button>
        ))}
        {period === "custom" && (
          <span className="rounded-full border border-prime-600 bg-prime-50 px-3.5 py-1.5 text-xs font-semibold text-prime-700 dark:bg-prime-950/40 dark:text-prime-300">
            {tx({ en: "Custom range", ar: "فترة مخصصة" })}
          </span>
        )}
      </motion.div>

      <Block>
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder={tx({ en: "Search reports", ar: "ابحث في التقارير" })}
          filters={[
            { label: tx({ en: "All vehicles", ar: "كل المركبات" }), value: vehicle, onChange: setVehicle, options: VEHICLES.map((v) => ({ value: v.id, label: `${v.plate} · ${tx(v.make)} ${v.model}` })) },
            { label: tx({ en: "All drivers", ar: "كل السائقين" }), value: driver, onChange: setDriver, options: DRIVERS.map((d) => ({ value: d.id, label: tx(d.name) })) },
            { label: tx({ en: "All cities", ar: "كل المدن" }), value: city, onChange: setCity, options: cities.map((c) => ({ value: c.en, label: tx(c) })) },
          ]}
          from={from}
          to={to}
          onFrom={(v) => {
            setFrom(v);
            setPeriod("custom");
          }}
          onTo={(v) => {
            setTo(v);
            setPeriod("custom");
          }}
          shown={visible.length}
          total={REPORTS.length}
          onClear={clearAll}
        />
      </Block>

      <motion.div variants={section} className="flex flex-wrap gap-2">
        {(["all", ...Object.keys(REPORT_GROUPS)] as (ReportGroup | "all")[]).map((g) => {
          const active = group === g;
          const count = g === "all" ? REPORTS.length : REPORTS.filter((r) => r.group === g).length;
          return (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-prime-600 bg-prime-600 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-prime-300 hover:text-prime-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {g === "all" ? tx({ en: "All reports", ar: "كل التقارير" }) : tx(REPORT_GROUPS[g])}
              <span className={active ? "text-white/80" : "text-neutral-400"}>{count}</span>
            </button>
          );
        })}
      </motion.div>

      {visible.length === 0 ? (
        <motion.p variants={section} className="rounded-xl border border-dashed border-neutral-200 py-12 text-center text-sm text-neutral-400 dark:border-neutral-700">
          {tx({ en: "No reports match these filters.", ar: "لا توجد تقارير مطابقة لعوامل التصفية." })}
        </motion.p>
      ) : (
        <motion.div variants={section} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((r) => {
            const result = RESULTS[r.id];
            return (
              <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-prime-50 text-prime-600 dark:bg-prime-950/50 dark:text-prime-300">
                    <NavIcon name={r.icon} size={20} />
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    {tx(REPORT_GROUPS[r.group])}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{tx(r.title)}</p>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{tx(r.description)}</p>
                </div>
                <div className="flex items-end justify-between rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-800/60">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    <span className={`text-xl font-bold ${result.count ? "text-foreground" : "text-neutral-400"}`}>{result.count}</span> {result.unit}
                  </p>
                  {result.extra && <p className="text-sm font-semibold text-prime-600 dark:text-prime-400">{result.extra}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportReport(r.title, "PDF", result.count)}
                    disabled={result.count === 0}
                    className="rounded-lg bg-prime-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-prime-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => exportReport(r.title, "Excel", result.count)}
                    disabled={result.count === 0}
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Excel
                  </button>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </Page>
  );
}

function NotificationsView({ onNavigate }: { onNavigate: (key: ModuleKey) => void }) {
  const { tx } = useT();
  const { items, unread, markAllRead } = useNotifications();
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const inPriority = items.filter((n) => priority === "all" || n.priority === priority);
  const categoryChips: { key: CategoryFilter; label: string; count: number }[] = [
    { key: "all", label: tx({ en: "All categories", ar: "كل الفئات" }), count: inPriority.length },
    ...(Object.keys(NOTIFICATION_CATEGORIES) as NotificationCategory[]).map((c) => ({
      key: c,
      label: tx(NOTIFICATION_CATEGORIES[c].label),
      count: inPriority.filter((n) => n.category === c).length,
    })),
  ];
  const perPriority = (p: Priority) => {
    const all = items.filter((n) => n.priority === p);
    return `${all.filter((n) => !n.read).length} / ${all.length}`;
  };

  return (
    <Page
      moduleKey="notifications"
      subtitle={{ en: "Alerts by priority and category: incidents, approvals, expiries, submissions and expenses.", ar: "التنبيهات حسب الأولوية والفئة: الحوادث والموافقات والصلاحيات والقراءات والمصروفات." }}
      stats={[
        { label: { en: "High priority (unread / total)", ar: "أولوية عالية (غير مقروءة / الإجمالي)" }, value: perPriority("high"), tone: "bad" },
        { label: { en: "Medium priority (unread / total)", ar: "أولوية متوسطة (غير مقروءة / الإجمالي)" }, value: perPriority("medium"), tone: "warn" },
        { label: { en: "Low priority (unread / total)", ar: "أولوية منخفضة (غير مقروءة / الإجمالي)" }, value: perPriority("low"), tone: "info" },
        { label: { en: "Total unread", ar: "إجمالي غير المقروءة" }, value: String(unread) },
      ]}
    >
      <motion.div variants={section} className="overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="space-y-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-full sm:w-96">
              <PriorityTabs value={priority} onChange={setPriority} layoutId="page-priority" />
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-sm font-semibold text-prime-600 transition-colors hover:text-prime-700 dark:text-prime-400">
                {tx({ en: "Mark all as read", ar: "تحديد الكل كمقروء" })}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryChips.map((chip) => {
              const active = category === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setCategory(chip.key)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-prime-600 bg-prime-600 text-white"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-prime-300 hover:text-prime-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {chip.key !== "all" && <NavIcon name={NOTIFICATION_CATEGORIES[chip.key].icon} size={13} />}
                  {chip.label}
                  <span className={active ? "text-white/80" : "text-neutral-400"}>{chip.count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <NotificationList onNavigate={onNavigate} priority={priority} category={category} />
      </motion.div>
    </Page>
  );
}

// ---------- Administration ----------

const ACCESS_STYLE: Record<Access, { tone: "good" | "info" | "neutral"; label: Bi }> = {
  full: { tone: "good", label: { en: "Full", ar: "كامل" } },
  view: { tone: "info", label: { en: "View", ar: "عرض" } },
  none: { tone: "neutral", label: { en: "None", ar: "لا يوجد" } },
};

// PARKED: mock version, replaced by live/UsersLive.tsx (real API). Kept for offline demos; swap it back in the module switch below to preview.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function UsersView() {
  const { tx } = useT();
  const officeRoles = ["superAdmin", "hr", "fleetManager", "assistant"] as const;
  return (
    <Page
      moduleKey="users"
      subtitle={{ en: "Office users of the web portal and what each role can access. Drivers sign in through the mobile app.", ar: "مستخدمو البوابة وصلاحيات كل دور. يسجل السائقون الدخول عبر تطبيق الجوال." }}
      primaryAction={{ en: "Invite user", ar: "دعوة مستخدم" }}
      stats={[
        { label: { en: "Office users", ar: "مستخدمو المكتب" }, value: String(OFFICE_USERS.length) },
        { label: { en: "Active", ar: "نشطون" }, value: String(OFFICE_USERS.filter((u) => u.status === "active").length), tone: "good" },
        { label: { en: "Roles", ar: "الأدوار" }, value: String(Object.keys(ROLES).length) },
        { label: { en: "Driver app users", ar: "مستخدمو تطبيق السائق" }, value: String(DRIVERS.length) },
      ]}
    >
      <Block>
        <DataTable
          title={tx({ en: "Office users", ar: "مستخدمو المكتب" })}
          headers={[tx({ en: "Name", ar: "الاسم" }), tx({ en: "Email", ar: "البريد الإلكتروني" }), tx({ en: "Role", ar: "الدور" }), tx({ en: "Last active", ar: "آخر نشاط" }), tx({ en: "Status", ar: "الحالة" })]}
          rows={OFFICE_USERS.map((u) => ({
            key: u.email,
            cells: [<span key="n" className="font-semibold text-foreground">{tx(u.name)}</span>, <span key="e" dir="ltr">{u.email}</span>, tx(ROLES[u.role].name), tx(u.lastActive), <Status key="s" code={u.status} />],
          }))}
        />
      </Block>
      <Block>
        <DataTable
          title={tx({ en: "Role permissions", ar: "صلاحيات الأدوار" })}
          headers={[tx({ en: "Area", ar: "القسم" }), ...officeRoles.map((r) => tx(ROLES[r].name))]}
          rows={PERMISSIONS.map((p) => ({
            key: p.area.en,
            cells: [
              <span key="a" className="font-medium text-foreground">{tx(p.area)}</span>,
              ...officeRoles.map((r) => <Badge key={r} label={tx(ACCESS_STYLE[p.access[r]].label)} tone={ACCESS_STYLE[p.access[r]].tone} />),
            ],
          }))}
        />
      </Block>
      <motion.div variants={section} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Object.values(ROLES).map((r) => (
          <div key={r.name.en} className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm font-semibold text-foreground">{tx(r.name)}</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{tx(r.description)}</p>
          </div>
        ))}
      </motion.div>
    </Page>
  );
}

function SettingsCard({ title, description, children }: { title: Bi; description: Bi; children: React.ReactNode }) {
  const { tx } = useT();
  return (
    <motion.section variants={section} className="rounded-xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
        <h2 className="text-sm font-bold text-foreground">{tx(title)}</h2>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{tx(description)}</p>
      </div>
      <div className="space-y-4 px-5 py-4">{children}</div>
    </motion.section>
  );
}

/** One switch row: label + hint on the start side, toggle on the end. */
function SwitchRow({ label, hint, checked, onChange }: { label: Bi; hint?: Bi; checked: boolean; onChange: (v: boolean) => void }) {
  const { tx } = useT();
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{tx(label)}</p>
        {hint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{tx(hint)}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={tx(label)} />
    </div>
  );
}

function SettingsView() {
  const { tx, language } = useT();
  const { settings, save, defaults } = useSettingsStore();
  const [draft, setDraft] = useState<FleetSettings>(settings);
  const [toast, setToast] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const set = (patch: Partial<FleetSettings>) => setDraft((d) => ({ ...d, ...patch }));
  const sar = language === "ar" ? "ر.س" : "SAR";

  const chain: Bi[] = [
    { en: "Driver", ar: "السائق" },
    ...(draft.requireAssistant ? [{ en: "Assistant", ar: "المساعد" }] : []),
    ...(draft.requireFleetManager ? [{ en: "Fleet Manager", ar: "مدير الأسطول" }] : []),
  ];

  const REMINDER_OPTIONS = [60, 30, 14, 7, 1];
  const toggleReminder = (n: number) =>
    set({
      expiryReminderDays: draft.expiryReminderDays.includes(n)
        ? draft.expiryReminderDays.filter((d) => d !== n)
        : [...draft.expiryReminderDays, n].sort((a, b) => b - a),
    });

  const frequencyOptions: { value: KmFrequency; label: string }[] = [
    { value: "daily", label: tx({ en: "Daily", ar: "يوميًا" }) },
    { value: "weekly", label: tx({ en: "Weekly", ar: "أسبوعيًا" }) },
    { value: "biweekly", label: tx({ en: "Every 2 weeks", ar: "كل أسبوعين" }) },
    { value: "monthly", label: tx({ en: "Monthly", ar: "شهريًا" }) },
  ];

  return (
    <Page moduleKey="settings" subtitle={{ en: "Company details, approval rules, alerts and driver app behaviour.", ar: "بيانات الشركة وقواعد الموافقة والتنبيهات وسلوك تطبيق السائق." }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard title={{ en: "Company profile", ar: "ملف الشركة" }} description={{ en: "Shown on reports and exported invoices.", ar: "تظهر في التقارير والفواتير المصدّرة." }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tx({ en: "Company name", ar: "اسم الشركة" })}>
              <TextInput value={draft.companyName} onChange={(v) => set({ companyName: v })} />
            </Field>
            <Field label={tx({ en: "Commercial Registration (CR) no.", ar: "رقم السجل التجاري" })}>
              <TextInput value={draft.crNumber} onChange={(v) => set({ crNumber: v })} dir="ltr" />
            </Field>
            <Field label={tx({ en: "Fleet contact email", ar: "البريد الإلكتروني للأسطول" })}>
              <TextInput value={draft.contactEmail} onChange={(v) => set({ contactEmail: v })} dir="ltr" />
            </Field>
            <Field label={tx({ en: "Fleet contact phone", ar: "هاتف الأسطول" })}>
              <TextInput value={draft.contactPhone} onChange={(v) => set({ contactPhone: v })} dir="ltr" />
            </Field>
          </div>
        </SettingsCard>

        <SettingsCard title={{ en: "Approval workflow", ar: "مسار الموافقات" }} description={{ en: "Who signs off driver maintenance requests before work starts.", ar: "من يعتمد طلبات الصيانة من السائقين قبل بدء العمل." }}>
          <SwitchRow label={{ en: "Assistant review", ar: "مراجعة المساعد" }} hint={{ en: "First check of every request", ar: "التحقق الأول من كل طلب" }} checked={draft.requireAssistant} onChange={(v) => set({ requireAssistant: v })} />
          <SwitchRow label={{ en: "Fleet Manager approval", ar: "اعتماد مدير الأسطول" }} hint={{ en: "Final operational approval", ar: "الاعتماد التشغيلي النهائي" }} checked={draft.requireFleetManager} onChange={(v) => set({ requireFleetManager: v })} />
          <SwitchRow label={{ en: "Super Admin for large amounts", ar: "المسؤول العام للمبالغ الكبيرة" }} checked={draft.superAdminAbove} onChange={(v) => set({ superAdminAbove: v })} />
          {draft.superAdminAbove && (
            <Field label={tx({ en: "Require Super Admin above", ar: "يتطلب المسؤول العام فوق" })}>
              <NumberInput value={draft.superAdminThreshold} onChange={(v) => set({ superAdminThreshold: v })} suffix={sar} />
            </Field>
          )}
          <div className="rounded-lg bg-neutral-50 px-3 py-2.5 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
            <span className="font-semibold">{tx({ en: "Resulting chain:", ar: "المسار الناتج:" })}</span>{" "}
            {chain.map((c) => tx(c)).join(language === "ar" ? " ← " : " → ")}
            {draft.superAdminAbove &&
              tx({
                en: ` → Super Admin (over ${fmtSAR(draft.superAdminThreshold, "en")})`,
                ar: ` ← المسؤول العام (فوق ${fmtSAR(draft.superAdminThreshold, "ar")})`,
              })}
          </div>
        </SettingsCard>

        <SettingsCard title={{ en: "Alerts & reminders", ar: "التنبيهات والتذكيرات" }} description={{ en: "When the system warns about expiries and upcoming maintenance.", ar: "متى ينبه النظام بانتهاء الوثائق والصيانة القادمة." }}>
          <div>
            <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">{tx({ en: "Remind before a document expires", ar: "التذكير قبل انتهاء الوثيقة" })}</p>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((n) => {
                const on = draft.expiryReminderDays.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleReminder(n)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      on ? "border-prime-600 bg-prime-600 text-white" : "border-neutral-200 bg-white text-neutral-600 hover:border-prime-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    }`}
                  >
                    {tx({ en: `${n} day${n === 1 ? "" : "s"}`, ar: `${n} يوم` })}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tx({ en: "Maintenance reminder (days before)", ar: "تذكير الصيانة (أيام قبل)" })}>
              <NumberInput value={draft.maintenanceDaysBefore} onChange={(v) => set({ maintenanceDaysBefore: v })} suffix={tx({ en: "days", ar: "يوم" })} />
            </Field>
            <Field label={tx({ en: "Maintenance reminder (km before)", ar: "تذكير الصيانة (كم قبل)" })}>
              <NumberInput value={draft.maintenanceKmBefore} onChange={(v) => set({ maintenanceKmBefore: v })} suffix={language === "ar" ? "كم" : "km"} />
            </Field>
          </div>
          <div className="space-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{tx({ en: "Notification categories", ar: "فئات الإشعارات" })}</p>
            {(Object.keys(NOTIFICATION_CATEGORIES) as NotificationCategory[]).map((c) => (
              <SwitchRow
                key={c}
                label={NOTIFICATION_CATEGORIES[c].label}
                checked={draft.notificationCategories[c]}
                onChange={(v) => set({ notificationCategories: { ...draft.notificationCategories, [c]: v } })}
              />
            ))}
          </div>
        </SettingsCard>

        <div className="space-y-6">
          <SettingsCard title={{ en: "Driver mobile app", ar: "تطبيق السائق" }} description={{ en: "What drivers must submit from the Android and iOS app.", ar: "ما يجب على السائقين إرساله من تطبيق أندرويد وiOS." }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tx({ en: "Kilometer reading frequency", ar: "تكرار قراءة العداد" })}>
                <CustomSelect value={draft.kmFrequency} onChange={(v) => set({ kmFrequency: v as KmFrequency })} options={frequencyOptions} />
              </Field>
              <Field label={tx({ en: "Minimum photos per reading", ar: "الحد الأدنى للصور لكل قراءة" })}>
                <NumberInput value={draft.minPhotos} onChange={(v) => set({ minPhotos: v })} />
              </Field>
            </div>
            <SwitchRow label={{ en: "Drivers can request maintenance", ar: "يمكن للسائقين طلب صيانة" }} checked={draft.driversCanRequestMaintenance} onChange={(v) => set({ driversCanRequestMaintenance: v })} />
            <SwitchRow label={{ en: "Photo required for breakdowns", ar: "الصورة إلزامية عند الإبلاغ عن عطل" }} checked={draft.breakdownPhotoRequired} onChange={(v) => set({ breakdownPhotoRequired: v })} />
          </SettingsCard>

          <SettingsCard title={{ en: "Regional & system", ar: "الإعدادات الإقليمية والنظام" }} description={{ en: "Language for new users; hosting is fixed by the agreement.", ar: "لغة المستخدمين الجدد؛ الاستضافة محددة في الاتفاقية." }}>
            <Field label={tx({ en: "Default interface language", ar: "لغة الواجهة الافتراضية" })}>
              <CustomSelect
                value={draft.defaultLanguage}
                onChange={(v) => set({ defaultLanguage: v as "ar" | "en" })}
                options={[
                  { value: "ar", label: "العربية" },
                  { value: "en", label: "English" },
                ]}
              />
            </Field>
            <dl className="divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
              {[
                [{ en: "Currency", ar: "العملة" }, { en: "Saudi Riyal (SAR)", ar: "الريال السعودي (ر.س)" }],
                [{ en: "Time zone", ar: "المنطقة الزمنية" }, { en: "Asia/Riyadh (UTC+3)", ar: "آسيا/الرياض (UTC+3)" }],
                [{ en: "Hosting", ar: "الاستضافة" }, { en: "On-premise server", ar: "خادم داخلي" }],
                [{ en: "Version", ar: "الإصدار" }, { en: "1.0", ar: "1.0" }],
              ].map(([label, value]) => (
                <div key={label.en} className="flex justify-between gap-4 py-2">
                  <dt className="text-neutral-500 dark:text-neutral-400">{tx(label)}</dt>
                  <dd className="font-medium text-foreground">{tx(value)}</dd>
                </div>
              ))}
            </dl>
          </SettingsCard>
        </div>
      </div>

      {/* Save bar appears only with unsaved changes */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-prime-200 bg-white px-5 py-3 shadow-xl dark:border-prime-900 dark:bg-neutral-900"
          >
            <p className="text-sm font-medium text-foreground">{tx({ en: "You have unsaved changes", ar: "لديك تغييرات غير محفوظة" })}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDraft(settings)}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {tx({ en: "Discard", ar: "تجاهل" })}
              </button>
              <button
                onClick={() => {
                  save(draft);
                  setToast(tx({ en: "Settings saved", ar: "تم حفظ الإعدادات" }));
                }}
                className="rounded-lg bg-prime-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-prime-500"
              >
                {tx({ en: "Save changes", ar: "حفظ التغييرات" })}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!dirty && JSON.stringify(settings) !== JSON.stringify(defaults) && (
        <motion.div variants={section} className="text-end">
          <button onClick={() => setDraft(defaults)} className="text-xs font-semibold text-neutral-500 hover:text-prime-600">
            {tx({ en: "Restore default settings", ar: "استعادة الإعدادات الافتراضية" })}
          </button>
        </motion.div>
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </Page>
  );
}

// ---------- Router ----------

/** Renders the screen for a sidebar module (everything except the dashboard home). */
export default function FleetModule({ moduleKey, onNavigate }: { moduleKey: ModuleKey; onNavigate: (key: ModuleKey) => void }) {
  switch (moduleKey) {
    case "vehicles": return <VehiclesLive />;
    case "drivers": return <DriversLive />;
    case "assignments": return <AssignmentsLive />;
    case "mileage": return <MileageLive />;
    case "maintenance": return <MaintenanceView />;
    case "breakdowns": return <BreakdownsView />;
    case "approvals": return <ApprovalsView />;
    case "accidents": return <AccidentsView />;
    case "violations": return <ViolationsView />;
    case "compliance": return <ComplianceView />;
    case "fuel": return <FuelView />;
    case "expenses": return <ExpensesView />;
    case "history": return <HistoryView />;
    case "reports": return <ReportsView />;
    case "notifications": return <NotificationsView onNavigate={onNavigate} />;
    case "users": return <UsersLive />;
    case "settings": return <SettingsView />;
    default: return null;
  }
}
