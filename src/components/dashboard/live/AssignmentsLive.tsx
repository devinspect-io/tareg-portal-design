"use client";

// Assignments (vehicle handover to drivers) on the real API.

import { useState } from "react";
import CustomSelect from "@/components/dashboard/CustomSelect";
import DatePicker from "@/components/dashboard/DatePicker";
import DataTable, { Badge } from "@/components/dashboard/DataTable";
import { Block, Page } from "@/components/dashboard/ModulePage";
import { FilterBar, Field, NumberInput, RecordModal, Toast } from "@/components/dashboard/RecordTools";
import { FormError, LiveState, Pager, Refreshing, useDebounced } from "@/components/dashboard/live/LiveKit";
import { ApiError, api } from "@/lib/api/client";
import { useApiPage } from "@/lib/api/hooks";
import { useCan } from "@/lib/api/session";
import type { ApiAssignment, ApiDriver, ApiVehicle, AssignmentBlocker, VehicleSummary } from "@/lib/api/types";
import { fmtDate, fmtKm, todayISO } from "@/lib/fleet-data";
import { useT, type Bi } from "@/lib/translations";

const PAGE_SIZE = 20;

const BLOCKERS: Record<AssignmentBlocker, Bi> = {
  LICENSE_EXPIRED: { en: "license expired", ar: "الرخصة منتهية" },
  NATIONAL_ID_EXPIRED: { en: "ID expired", ar: "الهوية منتهية" },
  IQAMA_EXPIRED: { en: "Iqama expired", ar: "الإقامة منتهية" },
};

const warnBox = "rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:col-span-2 dark:bg-amber-950/40 dark:text-amber-300";
const summaryBox = "rounded-lg bg-neutral-50 px-3 py-2.5 text-sm text-foreground dark:bg-neutral-800/60";

/** The server words VEHICLE_ALREADY_ASSIGNED in English only; map it to a known code. */
function normaliseError(e: unknown): unknown {
  if (e instanceof ApiError && e.code === "VEHICLE_ALREADY_ASSIGNED") return new ApiError(e.status, "VEHICLE_ASSIGNED", e.message, e.details);
  return e;
}

export default function AssignmentsLive() {
  const { tx, language } = useT();
  const can = useCan();
  const canManage = can("assignments:manage");

  const [current, setCurrent] = useState("true");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  const list = useApiPage(
    () => api.page<ApiAssignment>("/assignments", { current: current || undefined, vehicleId, driverId, search: q, page, pageSize: PAGE_SIZE }),
    `${current}|${vehicleId}|${driverId}|${q}|${page}`,
  );

  // Lookups for the filters and the forms.
  const allVehicles = useApiPage(() => api.page<ApiVehicle>("/vehicles", { pageSize: 100 }), "all");
  const allDrivers = useApiPage(() => api.page<ApiDriver>("/drivers", { pageSize: 100 }), "all");
  const freeVehicles = useApiPage(() => api.page<ApiVehicle>("/vehicles", { assigned: false, pageSize: 100 }), "free");
  const activeDrivers = useApiPage(() => api.page<ApiDriver>("/drivers", { status: "active", pageSize: 100 }), "active");
  const activeCount = useApiPage(() => api.page<ApiAssignment>("/assignments", { current: true, pageSize: 1 }), "c1");
  const endedCount = useApiPage(() => api.page<ApiAssignment>("/assignments", { current: false, pageSize: 1 }), "c0");

  const freeDrivers = activeDrivers.items.filter((d) => d.currentVehicle === null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [ending, setEnding] = useState<ApiAssignment | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const reloadAll = () => {
    list.reload();
    freeVehicles.reload();
    activeDrivers.reload();
    allDrivers.reload();
    allVehicles.reload();
    activeCount.reload();
    endedCount.reload();
  };

  const vehicleLabel = (v: VehicleSummary) => `${v.plateNumber} · ${tx(v.make)} ${tx(v.model)}`;
  const dash = (n: number, loaded: boolean) => (loaded ? String(n) : "-");

  const setFilter = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    setPage(1);
  };

  const headers = [
    tx({ en: "Ref.", ar: "المرجع" }),
    tx({ en: "Vehicle", ar: "المركبة" }),
    tx({ en: "Driver", ar: "السائق" }),
    tx({ en: "From", ar: "من" }),
    tx({ en: "To", ar: "إلى" }),
    tx({ en: "Start odometer", ar: "عداد البداية" }),
    tx({ en: "End odometer", ar: "عداد النهاية" }),
    tx({ en: "Distance", ar: "المسافة" }),
    ...(canManage ? [tx({ en: "Action", ar: "إجراء" })] : []),
  ];

  return (
    <Page
      moduleKey="assignments"
      subtitle={{ en: "Which driver has which vehicle, with the full assignment history.", ar: "أي سائق يستخدم أي مركبة، مع سجل الإسناد الكامل." }}
      primaryAction={canManage ? { en: "Assign vehicle", ar: "إسناد مركبة" } : undefined}
      onPrimaryAction={() => setAssignOpen(true)}
      stats={[
        { label: { en: "Current assignments", ar: "الإسنادات الحالية" }, value: dash(activeCount.total, !!activeCount.data) },
        { label: { en: "Ended assignments", ar: "إسنادات منتهية" }, value: dash(endedCount.total, !!endedCount.data) },
        { label: { en: "Vehicles without a driver", ar: "مركبات بدون سائق" }, value: dash(freeVehicles.total, !!freeVehicles.data), tone: "warn" },
        { label: { en: "Active drivers without a vehicle", ar: "سائقون نشطون بدون مركبة" }, value: dash(freeDrivers.length, !!activeDrivers.data) },
      ]}
    >
      <Block>
        <FilterBar
          search={search}
          onSearch={setFilter(setSearch)}
          searchPlaceholder={tx({ en: "Search by reference", ar: "بحث بالمرجع" })}
          filters={[
            {
              label: tx({ en: "All assignments", ar: "كل الإسنادات" }),
              value: current,
              onChange: setFilter(setCurrent),
              options: [
                { value: "true", label: tx({ en: "Current", ar: "حالي" }) },
                { value: "false", label: tx({ en: "Ended", ar: "منتهي" }) },
              ],
            },
            {
              label: tx({ en: "All vehicles", ar: "كل المركبات" }),
              value: vehicleId,
              onChange: setFilter(setVehicleId),
              options: allVehicles.items.map((v) => ({ value: v.id, label: `${v.plateNumber} · ${tx(v.make)} ${tx(v.model)}` })),
            },
            {
              label: tx({ en: "All drivers", ar: "كل السائقين" }),
              value: driverId,
              onChange: setFilter(setDriverId),
              options: allDrivers.items.map((d) => ({ value: d.id, label: tx(d.name) })),
            },
          ]}
          shown={list.items.length}
          total={list.total}
          onClear={() => {
            setSearch("");
            setCurrent("true");
            setVehicleId("");
            setDriverId("");
            setPage(1);
          }}
        />
      </Block>

      <Block>
        <LiveState loading={list.loading} error={list.error} onRetry={list.reload}>
          <Refreshing on={list.fetching} />
          <DataTable
            title={tx({ en: "Assignment history", ar: "سجل الإسناد" })}
            headers={headers}
            empty={tx({ en: "No assignments match these filters.", ar: "لا توجد إسنادات مطابقة." })}
            rows={list.items.map((a) => ({
              key: a.id,
              cells: [
                <span key="r" dir="ltr" className="font-medium">
                  {a.ref}
                </span>,
                a.vehicle ? (
                  <span key="v" className="block">
                    <span dir="ltr" className="font-bold text-foreground">
                      {a.vehicle.plateNumber}
                    </span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                      {tx(a.vehicle.make)} {tx(a.vehicle.model)}
                    </span>
                  </span>
                ) : (
                  "-"
                ),
                a.driver ? (
                  <span key="d" className="block">
                    <span className="font-medium text-foreground">{tx(a.driver.name)}</span>
                    <span dir="ltr" className="block text-xs text-neutral-500 dark:text-neutral-400">
                      {a.driver.employeeNo}
                    </span>
                  </span>
                ) : (
                  "-"
                ),
                fmtDate(a.from, language),
                a.to ? fmtDate(a.to, language) : <Badge key="t" label={tx({ en: "Current", ar: "حالي" })} tone="info" />,
                <span key="so">
                  {fmtKm(a.startOdometer, language)}
                </span>,
                a.endOdometer === null ? "-" : (
                  <span key="eo">
                    {fmtKm(a.endOdometer, language)}
                  </span>
                ),
                a.distance === null ? (
                  "-"
                ) : (
                  <span key="di">
                    {fmtKm(a.distance, language)}
                  </span>
                ),
                ...(canManage
                  ? [
                      a.current ? (
                        <button
                          key="end"
                          onClick={() => setEnding(a)}
                          className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                        >
                          {tx({ en: "End", ar: "إنهاء" })}
                        </button>
                      ) : (
                        ""
                      ),
                    ]
                  : []),
              ],
            }))}
          />
          <Pager page={page} pageSize={PAGE_SIZE} total={list.total} onPage={setPage} />
        </LiveState>
      </Block>

      <AssignModal
        key={assignOpen ? "open" : "closed"}
        open={assignOpen}
        vehicles={freeVehicles.items}
        drivers={freeDrivers}
        onClose={() => setAssignOpen(false)}
        onDone={() => {
          setAssignOpen(false);
          setToast(tx({ en: "Vehicle assigned", ar: "تم إسناد المركبة" }));
          reloadAll();
        }}
      />
      <EndModal
        key={ending?.id ?? "none"}
        assignment={ending}
        onClose={() => setEnding(null)}
        onDone={() => {
          setEnding(null);
          setToast(tx({ en: "Assignment ended", ar: "تم إنهاء الإسناد" }));
          reloadAll();
        }}
        vehicleLabel={vehicleLabel}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </Page>
  );
}

function AssignModal({
  open,
  vehicles,
  drivers,
  onClose,
  onDone,
}: {
  open: boolean;
  vehicles: ApiVehicle[];
  drivers: ApiDriver[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { tx } = useT();
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [odometer, setOdometer] = useState(0);
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const driver = drivers.find((d) => d.id === driverId);
  const blockers = driver?.assignmentBlockers ?? [];
  const lowOdometer = !!vehicle && odometer < vehicle.mileage;
  const badDate = !!date && date > todayISO();
  const canSave = !!vehicle && !!driver && blockers.length === 0 && Number.isInteger(odometer) && odometer >= 0 && !badDate && !saving;

  const pickVehicle = (id: string) => {
    setVehicleId(id);
    const v = vehicles.find((x) => x.id === id);
    if (v) setOdometer(v.mileage);
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/assignments", { vehicleId, driverId, odometer, date: date || undefined });
      onDone();
    } catch (e) {
      setError(normaliseError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RecordModal open={open} title={tx({ en: "Assign vehicle", ar: "إسناد مركبة" })} onClose={onClose} onSave={save} canSave={canSave}>
      <Field label={tx({ en: "Vehicle", ar: "المركبة" })}>
        <CustomSelect
          value={vehicleId}
          onChange={pickVehicle}
          placeholder={tx({ en: "Select a vehicle", ar: "اختر مركبة" })}
          options={vehicles.map((v) => ({ value: v.id, label: `${v.plateNumber} · ${tx(v.make)} ${tx(v.model)}` }))}
        />
      </Field>
      <Field label={tx({ en: "Driver", ar: "السائق" })}>
        <CustomSelect
          value={driverId}
          onChange={setDriverId}
          placeholder={tx({ en: "Select a driver", ar: "اختر سائقًا" })}
          options={drivers.map((d) => ({
            value: d.id,
            label: d.assignmentBlockers.length
              ? `${tx(d.name)} (${d.assignmentBlockers.map((b) => tx(BLOCKERS[b])).join("، ")})`
              : tx(d.name),
          }))}
        />
      </Field>
      {blockers.length > 0 && (
        <p role="alert" className={warnBox}>
          {tx({
            en: `This driver cannot be assigned: ${blockers.map((b) => BLOCKERS[b].en).join(", ")}. Renew the documents first.`,
            ar: `لا يمكن إسناد مركبة لهذا السائق: ${blockers.map((b) => BLOCKERS[b].ar).join("، ")}. جدد المستندات أولًا.`,
          })}
        </p>
      )}
      <Field label={tx({ en: "Odometer at handover", ar: "العداد عند التسليم" })}>
        <NumberInput value={odometer} onChange={setOdometer} suffix={tx({ en: "km", ar: "كم" })} />
      </Field>
      <Field label={tx({ en: "Handover date", ar: "تاريخ التسليم" })}>
        <DatePicker value={date} onChange={setDate} />
      </Field>
      {lowOdometer && vehicle && (
        <p className={warnBox}>
          {tx({
            en: `The vehicle's last known reading is ${vehicle.mileage.toLocaleString("en-US")} km. Check this value.`,
            ar: `آخر قراءة معروفة للمركبة هي ${vehicle.mileage.toLocaleString("en-US")} كم. تحقق من هذه القيمة.`,
          })}
        </p>
      )}
      {badDate && <p className={warnBox}>{tx({ en: "The date cannot be in the future.", ar: "لا يمكن أن يكون التاريخ في المستقبل." })}</p>}
      <FormError error={error} />
    </RecordModal>
  );
}

function EndModal({
  assignment,
  onClose,
  onDone,
  vehicleLabel,
}: {
  assignment: ApiAssignment | null;
  onClose: () => void;
  onDone: () => void;
  vehicleLabel: (v: VehicleSummary) => string;
}) {
  const { tx, language } = useT();
  const [odometer, setOdometer] = useState(assignment?.startOdometer ?? 0);
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const start = assignment?.startOdometer ?? 0;
  const badOdometer = !Number.isInteger(odometer) || odometer < start;
  const effectiveDate = date || todayISO();
  const badDate = !!assignment && (effectiveDate < assignment.from || effectiveDate > todayISO());
  const canSave = !!assignment && !badOdometer && !badDate && !saving;

  const save = async () => {
    if (!assignment || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/assignments/${assignment.id}/end`, { odometer, date: date || undefined });
      onDone();
    } catch (e) {
      setError(normaliseError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RecordModal open={!!assignment} title={tx({ en: "End assignment", ar: "إنهاء الإسناد" })} onClose={onClose} onSave={save} canSave={canSave}>
      {assignment && (
        <>
          <Field label={tx({ en: "Vehicle", ar: "المركبة" })}>
            <div className={summaryBox}>{assignment.vehicle ? vehicleLabel(assignment.vehicle) : "-"}</div>
          </Field>
          <Field label={tx({ en: "Driver", ar: "السائق" })}>
            <div className={summaryBox}>{assignment.driver ? tx(assignment.driver.name) : "-"}</div>
          </Field>
          <Field label={tx({ en: "Started", ar: "بدأ في" })}>
            <div className={summaryBox}>
              {fmtDate(assignment.from, language)} ·{" "}
              <span>{fmtKm(assignment.startOdometer, language)}</span>
            </div>
          </Field>
          <Field label={tx({ en: "Reference", ar: "المرجع" })}>
            <div dir="ltr" className={summaryBox}>
              {assignment.ref}
            </div>
          </Field>
          <Field label={tx({ en: "Odometer at return", ar: "العداد عند الإرجاع" })}>
            <NumberInput value={odometer} onChange={setOdometer} suffix={tx({ en: "km", ar: "كم" })} />
          </Field>
          <Field label={tx({ en: "Return date", ar: "تاريخ الإرجاع" })}>
            <DatePicker value={date} onChange={setDate} />
          </Field>
          {badOdometer ? (
            <p role="alert" className={warnBox}>
              {tx({
                en: `The odometer cannot be below the starting reading (${start.toLocaleString("en-US")} km).`,
                ar: `لا يمكن أن يقل العداد عن قراءة البداية (${start.toLocaleString("en-US")} كم).`,
              })}
            </p>
          ) : (
            <p className="rounded-lg bg-prime-50 px-3 py-2 text-sm text-prime-700 sm:col-span-2 dark:bg-prime-950/50 dark:text-prime-300">
              {tx({ en: "Distance driven", ar: "المسافة المقطوعة" })}: <span className="font-semibold">{fmtKm(odometer - start, language)}</span>
            </p>
          )}
          {badDate && (
            <p role="alert" className={warnBox}>
              {tx({
                en: "The return date must be between the start date and today.",
                ar: "يجب أن يكون تاريخ الإرجاع بين تاريخ البداية واليوم.",
              })}
            </p>
          )}
          <FormError error={error} />
        </>
      )}
    </RecordModal>
  );
}
