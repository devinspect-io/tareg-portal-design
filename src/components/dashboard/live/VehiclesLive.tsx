"use client";

// Vehicles register on the real API: filtered/paged list, MOI-field create and
// edit, delete. Contract: tareg-backend src/modules/vehicles/vehicles.service.ts.

import { useMemo, useState } from "react";
import CustomSelect from "@/components/dashboard/CustomSelect";
import DatePicker from "@/components/dashboard/DatePicker";
import DataTable, { Badge } from "@/components/dashboard/DataTable";
import { Block, Page, Status } from "@/components/dashboard/ModulePage";
import { EditButton, Field, FilterBar, NumberInput, RecordModal, TextInput, Toast } from "@/components/dashboard/RecordTools";
import { FormError, LiveState, Pager, Refreshing, useDebounced } from "@/components/dashboard/live/LiveKit";
import { api } from "@/lib/api/client";
import { fieldErrors } from "@/lib/api/errors";
import { useApi, useApiPage } from "@/lib/api/hooks";
import { useCan } from "@/lib/api/session";
import type { ApiVehicle, DocStatus, MoiStatus, RegistrationType, VehicleStatus } from "@/lib/api/types";
import { fmtDate, fmtKm } from "@/lib/fleet-data";
import { useT, type Bi } from "@/lib/translations";

const PAGE_SIZE = 20;

// ---------- Option lists ----------

const STATUS_OPTIONS: { value: VehicleStatus; label: Bi }[] = [
  { value: "active", label: { en: "Active", ar: "نشطة" } },
  { value: "inMaintenance", label: { en: "In maintenance", ar: "في الصيانة" } },
  { value: "brokenDown", label: { en: "Broken down", ar: "معطلة" } },
  { value: "inactive", label: { en: "Inactive", ar: "غير نشطة" } },
];

const REGISTRATION_TYPES: { value: RegistrationType; label: Bi }[] = [
  { value: "private", label: { en: "Private", ar: "خاص" } },
  { value: "privateTransport", label: { en: "Private transport", ar: "نقل خاص" } },
  { value: "heavyEquipment", label: { en: "Heavy equipment", ar: "معدات ثقيلة" } },
];

const VEHICLE_STATES: { value: "valid" | "invalid"; label: Bi }[] = [
  { value: "valid", label: { en: "Valid", ar: "صالحة" } },
  { value: "invalid", label: { en: "Invalid", ar: "غير صالحة" } },
];

const MOI_STATUSES: { value: MoiStatus; label: Bi }[] = [
  { value: "valid", label: { en: "Valid", ar: "ساري" } },
  { value: "expired", label: { en: "Expired", ar: "منتهي" } },
  { value: "none", label: { en: "None", ar: "لا يوجد" } },
];

const HOLD_STATUSES: { value: "notHeld" | "held"; label: Bi }[] = [
  { value: "notHeld", label: { en: "Not held", ar: "غير متحفظ" } },
  { value: "held", label: { en: "Held", ar: "متحفظ" } },
];

const CITIES: Bi[] = [
  { en: "Riyadh", ar: "الرياض" },
  { en: "Jeddah", ar: "جدة" },
  { en: "Dammam", ar: "الدمام" },
  { en: "Al Khobar", ar: "الخبر" },
  { en: "Makkah", ar: "مكة المكرمة" },
  { en: "Madinah", ar: "المدينة المنورة" },
  { en: "Taif", ar: "الطائف" },
  { en: "Tabuk", ar: "تبوك" },
  { en: "Abha", ar: "أبها" },
  { en: "Khamis Mushait", ar: "خميس مشيط" },
  { en: "Buraydah", ar: "بريدة" },
  { en: "Hail", ar: "حائل" },
  { en: "Jazan", ar: "جازان" },
  { en: "Najran", ar: "نجران" },
  { en: "Yanbu", ar: "ينبع" },
  { en: "Jubail", ar: "الجبيل" },
  { en: "Al Ahsa", ar: "الأحساء" },
];

const SORTS: { value: string; label: Bi }[] = [
  { value: "plateNumber", label: { en: "Plate (A to Z)", ar: "اللوحة (أ إلى ي)" } },
  { value: "-plateNumber", label: { en: "Plate (Z to A)", ar: "اللوحة (ي إلى أ)" } },
  { value: "-manufactureYear", label: { en: "Newest model", ar: "الأحدث موديلًا" } },
  { value: "manufactureYear", label: { en: "Oldest model", ar: "الأقدم موديلًا" } },
  { value: "-mileage", label: { en: "Highest mileage", ar: "الأعلى عدادًا" } },
  { value: "mileage", label: { en: "Lowest mileage", ar: "الأقل عدادًا" } },
  { value: "registrationExpiry", label: { en: "Registration expiring first", ar: "الاستمارة الأقرب انتهاءً" } },
  { value: "insuranceExpiry", label: { en: "Insurance expiring first", ar: "التأمين الأقرب انتهاءً" } },
  { value: "inspectionExpiry", label: { en: "Inspection expiring first", ar: "الفحص الأقرب انتهاءً" } },
  { value: "-createdAt", label: { en: "Recently added", ar: "المضافة حديثًا" } },
];

// ---------- Form model ----------

type BiForm = { en: string; ar: string };
type Form = {
  plateNumber: string;
  registrationType: RegistrationType;
  make: BiForm;
  model: BiForm;
  manufactureYear: string;
  sequenceNumber: string;
  vin: string;
  primaryColor: BiForm;
  bodyType: BiForm;
  vehicleState: "valid" | "invalid";
  ownershipDate: string;
  registrationIssueDate: string;
  registrationExpiry: string;
  inspectionExpiry: string;
  inspectionStatus: MoiStatus;
  insuranceStatus: MoiStatus;
  insuranceExpiry: string;
  holdStatus: "notHeld" | "held";
  actualUserIdNumber: string;
  actualUserName: string;
  cityEn: string;
  status: VehicleStatus;
  mileage: number;
};

const emptyBi = (): BiForm => ({ en: "", ar: "" });

const emptyForm = (): Form => ({
  plateNumber: "",
  registrationType: "private",
  make: emptyBi(),
  model: emptyBi(),
  manufactureYear: "",
  sequenceNumber: "",
  vin: "",
  primaryColor: emptyBi(),
  bodyType: emptyBi(),
  vehicleState: "valid",
  ownershipDate: "",
  registrationIssueDate: "",
  registrationExpiry: "",
  inspectionExpiry: "",
  inspectionStatus: "none",
  insuranceStatus: "none",
  insuranceExpiry: "",
  holdStatus: "notHeld",
  actualUserIdNumber: "",
  actualUserName: "",
  cityEn: "",
  status: "active",
  mileage: 0,
});

function toForm(v: ApiVehicle): Form {
  return {
    plateNumber: v.plateNumber,
    registrationType: v.registrationType,
    make: { ...v.make },
    model: { ...v.model },
    manufactureYear: String(v.manufactureYear),
    sequenceNumber: v.sequenceNumber,
    vin: v.vin,
    primaryColor: { ...v.primaryColor },
    bodyType: v.bodyType ? { ...v.bodyType } : emptyBi(),
    vehicleState: v.vehicleState,
    ownershipDate: v.ownershipDate ?? "",
    registrationIssueDate: v.registrationIssueDate,
    registrationExpiry: v.registrationExpiry,
    inspectionExpiry: v.inspectionExpiry ?? "",
    inspectionStatus: v.inspectionStatus,
    insuranceStatus: v.insuranceStatus,
    insuranceExpiry: v.insuranceExpiry ?? "",
    holdStatus: v.holdStatus,
    actualUserIdNumber: v.actualUserIdNumber ?? "",
    actualUserName: v.actualUserName ?? "",
    cityEn: v.city.en,
    status: v.status,
    mileage: v.mileage,
  };
}

/** Editable fields as the API expects them. `mileage` is create-only. */
function toBody(f: Form, cities: Bi[], withMileage: boolean) {
  const city = cities.find((c) => c.en === f.cityEn)!;
  const bodyType = f.bodyType.en.trim() || f.bodyType.ar.trim() ? { en: f.bodyType.en.trim(), ar: f.bodyType.ar.trim() } : null;
  const trimBi = (b: BiForm) => ({ en: b.en.trim(), ar: b.ar.trim() });
  return {
    plateNumber: f.plateNumber.trim(),
    registrationType: f.registrationType,
    make: trimBi(f.make),
    model: trimBi(f.model),
    manufactureYear: Number(f.manufactureYear),
    sequenceNumber: f.sequenceNumber.trim(),
    vin: f.vin.trim(),
    primaryColor: trimBi(f.primaryColor),
    bodyType,
    vehicleState: f.vehicleState,
    ownershipDate: f.ownershipDate || null,
    registrationIssueDate: f.registrationIssueDate,
    registrationExpiry: f.registrationExpiry,
    inspectionExpiry: f.inspectionExpiry || null,
    inspectionStatus: f.inspectionStatus,
    insuranceStatus: f.insuranceStatus,
    insuranceExpiry: f.insuranceExpiry || null,
    holdStatus: f.holdStatus,
    actualUserIdNumber: f.actualUserIdNumber.trim() || null,
    actualUserName: f.actualUserName.trim() || null,
    city,
    status: f.status,
    ...(withMileage ? { mileage: Math.max(0, Math.round(f.mileage || 0)) } : {}),
  };
}

// ---------- Small pieces ----------

const opts = (list: { value: string; label: Bi }[], tx: (b: Bi) => string) => list.map((o) => ({ value: o.value, label: tx(o.label) }));

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{msg}</p> : null;
}

function Section({ title }: { title: string }) {
  return (
    <h3 className="border-b border-neutral-100 pb-1.5 pt-2 text-sm font-bold text-prime-700 sm:col-span-2 dark:border-neutral-800 dark:text-prime-400">{title}</h3>
  );
}

function DocCell({ doc }: { doc: DocStatus }) {
  const { tx, language } = useT();
  if (!doc.expiry || !doc.status) return <span className="text-neutral-400">{tx({ en: "None", ar: "لا يوجد" })}</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="whitespace-nowrap">{fmtDate(doc.expiry, language)}</span>
      {doc.status !== "valid" && <Status code={doc.status} />}
    </span>
  );
}

/** Two side-by-side inputs: English and Arabic. */
function BiInput({ label, value, onChange, error }: { label: Bi; value: BiForm; onChange: (v: BiForm) => void; error?: string }) {
  const { tx } = useT();
  return (
    <Field label={tx(label)} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput value={value.en} onChange={(en) => onChange({ ...value, en })} placeholder="English" dir="ltr" />
        <TextInput value={value.ar} onChange={(ar) => onChange({ ...value, ar })} placeholder="العربية" dir="rtl" />
      </div>
      <Err msg={error} />
    </Field>
  );
}

// ---------- Screen ----------

type Modal = { mode: "create" } | { mode: "edit"; vehicle: ApiVehicle } | null;

export default function VehiclesLive() {
  const { tx, language } = useT();
  const can = useCan();
  const canManage = can("vehicles:manage");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [assigned, setAssigned] = useState("");
  const [sort, setSort] = useState("");
  const q = useDebounced(search, 300);

  const key = JSON.stringify({ page, q, status, city, assigned, sort });
  const list = useApiPage(() => api.page<ApiVehicle>("/vehicles", { page, pageSize: PAGE_SIZE, search: q, status, city, assigned, sort }), key);

  const stats = useApi(async () => {
    const count = (query: Record<string, string>) => api.page<ApiVehicle>("/vehicles", { pageSize: 1, ...query }).then((r) => r.total);
    const [total, active, maintenance, broken, unassigned] = await Promise.all([
      count({}),
      count({ status: "active" }),
      count({ status: "inMaintenance" }),
      count({ status: "brokenDown" }),
      count({ assigned: "false" }),
    ]);
    return { total, active, maintenance, broken, unassigned };
  }, "stats");

  const [modal, setModal] = useState<Modal>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const editing = modal?.mode === "edit" ? modal.vehicle : null;

  // Common cities, plus the vehicle's own city if it is not on the list.
  const cities = useMemo(() => {
    const extra = editing && !CITIES.some((c) => c.en === editing.city.en) ? [editing.city] : [];
    return [...CITIES, ...extra];
  }, [editing]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // ----- Validation (mirrors the backend rules) -----
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const req = tx({ en: "Required", ar: "مطلوب" });
    const both = tx({ en: "Fill in English and Arabic", ar: "أدخل الاسم بالإنجليزية والعربية" });
    const biReq = (k: "make" | "model" | "primaryColor") => {
      if (!form[k].en.trim() || !form[k].ar.trim()) e[k] = both;
    };
    const plate = form.plateNumber.trim();
    if (!plate) e.plateNumber = req;
    else if (plate.length > 20) e.plateNumber = tx({ en: "At most 20 characters", ar: "20 خانة كحد أقصى" });
    biReq("make");
    biReq("model");
    biReq("primaryColor");
    const year = Number(form.manufactureYear);
    const maxYear = new Date().getFullYear() + 1;
    if (!form.manufactureYear.trim()) e.manufactureYear = req;
    else if (!Number.isInteger(year) || year < 1950 || year > maxYear) e.manufactureYear = tx({ en: `Between 1950 and ${maxYear}`, ar: `بين 1950 و${maxYear}` });
    if (!/^\d{5,12}$/.test(form.sequenceNumber.trim())) e.sequenceNumber = tx({ en: "5 to 12 digits", ar: "من 5 إلى 12 رقمًا" });
    const vin = form.vin.trim();
    if (!vin) e.vin = req;
    else if (form.registrationType === "heavyEquipment") {
      if (vin.length < 5 || vin.length > 17) e.vin = tx({ en: "5 to 17 characters", ar: "من 5 إلى 17 خانة" });
    } else if (vin.length !== 17) e.vin = tx({ en: "Must be exactly 17 characters", ar: "يجب أن يكون 17 خانة بالضبط" });
    if (!form.registrationIssueDate) e.registrationIssueDate = req;
    if (!form.registrationExpiry) e.registrationExpiry = req;
    const hasEn = form.bodyType.en.trim() !== "";
    const hasAr = form.bodyType.ar.trim() !== "";
    if (hasEn !== hasAr) e.bodyType = both;
    const uid = form.actualUserIdNumber.trim();
    if (uid && !/^[12]\d{9}$/.test(uid)) e.actualUserIdNumber = tx({ en: "10 digits starting with 1 or 2", ar: "10 أرقام تبدأ بـ 1 أو 2" });
    if (!form.cityEn) e.city = req;
    return e;
  }, [form, tx]);

  const shown = (k: string, serverKeys: string[] = [k]) => {
    if (tried && errors[k]) return errors[k];
    for (const s of serverKeys) if (serverErrors[s]) return serverErrors[s];
    return undefined;
  };
  const serverBi = (k: string) => [k, `${k}.en`, `${k}.ar`];

  const reloadAll = () => {
    list.reload();
    stats.reload();
  };

  const openCreate = () => {
    setForm(emptyForm());
    setTried(false);
    setSaveError(null);
    setServerErrors({});
    setModal({ mode: "create" });
  };
  const openEdit = (v: ApiVehicle) => {
    setForm(toForm(v));
    setTried(false);
    setSaveError(null);
    setServerErrors({});
    setModal({ mode: "edit", vehicle: v });
  };
  const close = () => {
    if (!saving) setModal(null);
  };

  const onFail = (e: unknown) => {
    setServerErrors(fieldErrors(e));
    setSaveError(e);
  };

  const save = async () => {
    setTried(true);
    setSaveError(null);
    setServerErrors({});
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/vehicles/${editing.id}`, toBody(form, cities, false));
        setToast(tx({ en: "Vehicle updated", ar: "تم تحديث المركبة" }));
      } else {
        await api.post("/vehicles", toBody(form, cities, true));
        setToast(tx({ en: "Vehicle added", ar: "تمت إضافة المركبة" }));
      }
      setModal(null);
      setPage(1);
      reloadAll();
    } catch (e) {
      onFail(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.delete(`/vehicles/${editing.id}`);
      setToast(tx({ en: "Vehicle deleted", ar: "تم حذف المركبة" }));
      setModal(null);
      reloadAll();
    } catch (e) {
      onFail(e);
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setCity("");
    setAssigned("");
    setSort("");
    setPage(1);
  };
  const withReset = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    setPage(1);
  };

  const n = (v: number | undefined) => (v === undefined ? "-" : String(v));

  return (
    <>
      <Page
        moduleKey="vehicles"
        subtitle={{ en: "Every vehicle with its driver, mileage, status and documents.", ar: "جميع المركبات مع السائق وقراءة العداد والحالة والوثائق." }}
        primaryAction={canManage ? { en: "Add vehicle", ar: "إضافة مركبة" } : undefined}
        onPrimaryAction={openCreate}
        stats={[
          { label: { en: "Total vehicles", ar: "إجمالي المركبات" }, value: n(stats.data?.total) },
          { label: { en: "Active", ar: "نشطة" }, value: n(stats.data?.active), tone: "good" },
          {
            label: { en: "Maintenance / broken down", ar: "صيانة / معطلة" },
            value: stats.data ? String(stats.data.maintenance + stats.data.broken) : "-",
            tone: "warn",
          },
          { label: { en: "Unassigned", ar: "بدون سائق" }, value: n(stats.data?.unassigned), tone: "info" },
        ]}
      >
        <Block>
          <FilterBar
            search={search}
            onSearch={withReset(setSearch)}
            searchPlaceholder={tx({ en: "Search plate, VIN, sequence, make, model or user", ar: "ابحث بالوحة أو الهيكل أو التسلسلي أو الشركة أو المستخدم" })}
            filters={[
              {
                label: tx({ en: "All statuses", ar: "كل الحالات" }),
                value: status,
                onChange: withReset(setStatus),
                options: opts(STATUS_OPTIONS, tx),
              },
              {
                label: tx({ en: "All cities", ar: "كل المدن" }),
                value: city,
                onChange: withReset(setCity),
                options: CITIES.map((c) => ({ value: c.en, label: tx(c) })),
              },
              {
                label: tx({ en: "Any assignment", ar: "أي إسناد" }),
                value: assigned,
                onChange: withReset(setAssigned),
                options: [
                  { value: "true", label: tx({ en: "Assigned", ar: "مسندة" }) },
                  { value: "false", label: tx({ en: "Unassigned", ar: "بدون سائق" }) },
                ],
              },
              {
                label: tx({ en: "Default order", ar: "الترتيب الافتراضي" }),
                value: sort,
                onChange: withReset(setSort),
                options: opts(SORTS, tx),
              },
            ]}
            shown={list.items.length}
            total={list.total}
            onClear={clearFilters}
          />
        </Block>

        <Block>
          <LiveState loading={list.loading} error={list.error && list.items.length === 0 ? list.error : null} onRetry={list.reload}>
            <Refreshing on={list.fetching} />
            <DataTable
              title={tx({ en: "Vehicle register", ar: "سجل المركبات" })}
              empty={tx({ en: "No vehicles match these filters.", ar: "لا توجد مركبات مطابقة." })}
              headers={[
                tx({ en: "Plate", ar: "اللوحة" }),
                tx({ en: "Make / model", ar: "الشركة / الطراز" }),
                tx({ en: "Year", ar: "السنة" }),
                tx({ en: "City", ar: "المدينة" }),
                tx({ en: "Driver", ar: "السائق" }),
                tx({ en: "Odometer", ar: "العداد" }),
                tx({ en: "Registration", ar: "الاستمارة" }),
                tx({ en: "Insurance", ar: "التأمين" }),
                tx({ en: "Inspection", ar: "الفحص" }),
                tx({ en: "Status", ar: "الحالة" }),
                ...(canManage ? [""] : []),
              ]}
              rows={list.items.map((v) => ({
                key: v.id,
                cells: [
                  <span key="p" dir="ltr" className="inline-block font-semibold text-foreground">
                    {v.plateNumber}
                  </span>,
                  `${tx(v.make)} ${tx(v.model)}`,
                  v.manufactureYear,
                  tx(v.city),
                  v.currentDriver ? tx(v.currentDriver.name) : <span key="u" className="text-neutral-400">{tx({ en: "Unassigned", ar: "بدون سائق" })}</span>,
                  <span key="m" className="whitespace-nowrap">{fmtKm(v.mileage, language)}</span>,
                  <DocCell key="r" doc={v.documents.registration} />,
                  <DocCell key="i" doc={v.documents.insurance} />,
                  <DocCell key="n" doc={v.documents.inspection} />,
                  <Status key="s" code={v.status} />,
                  ...(canManage ? [<EditButton key="e" onClick={() => openEdit(v)} label={tx({ en: "Edit vehicle", ar: "تعديل المركبة" })} />] : []),
                ],
              }))}
            />
            <Pager page={page} pageSize={PAGE_SIZE} total={list.total} onPage={setPage} />
          </LiveState>
        </Block>
      </Page>

      <RecordModal
        open={modal !== null}
        title={editing ? tx({ en: "Edit vehicle", ar: "تعديل المركبة" }) : tx({ en: "Add vehicle", ar: "إضافة مركبة" })}
        onClose={close}
        onSave={save}
        onDelete={editing ? remove : undefined}
        canSave={!saving && canManage}
      >
        <FormError error={saveError} />

        <Section title={tx({ en: "Registration", ar: "التسجيل" })} />
        <Field label={tx({ en: "Plate number", ar: "رقم اللوحة" })}>
          <TextInput value={form.plateNumber} onChange={(v) => set("plateNumber", v)} dir="ltr" />
          <Err msg={shown("plateNumber")} />
        </Field>
        <Field label={tx({ en: "Registration type", ar: "نوع التسجيل" })}>
          <CustomSelect value={form.registrationType} onChange={(v) => set("registrationType", v as RegistrationType)} options={opts(REGISTRATION_TYPES, tx)} />
        </Field>
        <Field label={tx({ en: "Sequence number", ar: "الرقم التسلسلي" })}>
          <TextInput value={form.sequenceNumber} onChange={(v) => set("sequenceNumber", v.replace(/\D/g, ""))} dir="ltr" />
          <Err msg={shown("sequenceNumber")} />
        </Field>
        <Field label={tx({ en: "VIN / chassis number", ar: "رقم الهيكل" })}>
          <TextInput value={form.vin} onChange={(v) => set("vin", v.toUpperCase())} dir="ltr" />
          <Err msg={shown("vin")} />
        </Field>
        <Field label={tx({ en: "Registration issue date", ar: "تاريخ إصدار الاستمارة" })}>
          <DatePicker value={form.registrationIssueDate} onChange={(v) => set("registrationIssueDate", v)} />
          <Err msg={shown("registrationIssueDate")} />
        </Field>
        <Field label={tx({ en: "Registration expiry", ar: "انتهاء الاستمارة" })}>
          <DatePicker value={form.registrationExpiry} onChange={(v) => set("registrationExpiry", v)} />
          <Err msg={shown("registrationExpiry")} />
        </Field>
        <Field label={tx({ en: "Ownership date (optional)", ar: "تاريخ الملكية (اختياري)" })}>
          <DatePicker value={form.ownershipDate} onChange={(v) => set("ownershipDate", v)} />
        </Field>
        <Field label={tx({ en: "Vehicle state", ar: "حالة المركبة" })}>
          <CustomSelect value={form.vehicleState} onChange={(v) => set("vehicleState", v as Form["vehicleState"])} options={opts(VEHICLE_STATES, tx)} />
        </Field>

        <Section title={tx({ en: "Vehicle", ar: "المركبة" })} />
        <BiInput label={{ en: "Make", ar: "الشركة المصنعة" }} value={form.make} onChange={(v) => set("make", v)} error={shown("make", serverBi("make"))} />
        <BiInput label={{ en: "Model", ar: "الطراز" }} value={form.model} onChange={(v) => set("model", v)} error={shown("model", serverBi("model"))} />
        <Field label={tx({ en: "Model year", ar: "سنة الصنع" })}>
          <TextInput value={form.manufactureYear} onChange={(v) => set("manufactureYear", v.replace(/\D/g, "").slice(0, 4))} dir="ltr" />
          <Err msg={shown("manufactureYear")} />
        </Field>
        <Field label={tx({ en: "City", ar: "المدينة" })}>
          <CustomSelect
            value={form.cityEn}
            onChange={(v) => set("cityEn", v)}
            options={cities.map((c) => ({ value: c.en, label: tx(c) }))}
            placeholder={tx({ en: "Select city", ar: "اختر المدينة" })}
            error={Boolean(shown("city", serverBi("city")))}
          />
          <Err msg={shown("city", serverBi("city"))} />
        </Field>
        <BiInput label={{ en: "Primary color", ar: "اللون الأساسي" }} value={form.primaryColor} onChange={(v) => set("primaryColor", v)} error={shown("primaryColor", serverBi("primaryColor"))} />
        <BiInput label={{ en: "Body type (optional)", ar: "نوع الهيكل (اختياري)" }} value={form.bodyType} onChange={(v) => set("bodyType", v)} error={shown("bodyType", serverBi("bodyType"))} />
        {editing ? (
          <Field label={tx({ en: "Odometer", ar: "العداد" })} wide>
            <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-200">
              {fmtKm(editing.mileage, language)}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {tx({ en: "The odometer only moves when a driver's reading is approved.", ar: "لا يتغير العداد إلا عند اعتماد قراءة السائق." })}
            </p>
          </Field>
        ) : (
          <Field label={tx({ en: "Starting odometer", ar: "العداد الابتدائي" })} wide>
            <NumberInput value={form.mileage} onChange={(v) => set("mileage", v)} suffix={tx({ en: "km", ar: "كم" })} />
          </Field>
        )}

        <Section title={tx({ en: "Documents", ar: "الوثائق" })} />
        <Field label={tx({ en: "Insurance status", ar: "حالة التأمين" })}>
          <CustomSelect value={form.insuranceStatus} onChange={(v) => set("insuranceStatus", v as MoiStatus)} options={opts(MOI_STATUSES, tx)} />
        </Field>
        <Field label={tx({ en: "Insurance expiry (optional)", ar: "انتهاء التأمين (اختياري)" })}>
          <DatePicker value={form.insuranceExpiry} onChange={(v) => set("insuranceExpiry", v)} />
        </Field>
        <Field label={tx({ en: "Inspection status", ar: "حالة الفحص" })}>
          <CustomSelect value={form.inspectionStatus} onChange={(v) => set("inspectionStatus", v as MoiStatus)} options={opts(MOI_STATUSES, tx)} />
        </Field>
        <Field label={tx({ en: "Inspection expiry (optional)", ar: "انتهاء الفحص (اختياري)" })}>
          <DatePicker value={form.inspectionExpiry} onChange={(v) => set("inspectionExpiry", v)} />
        </Field>

        <Section title={tx({ en: "Assignment & status", ar: "الإسناد والحالة" })} />
        <Field label={tx({ en: "Actual user ID (optional)", ar: "رقم هوية المستخدم الفعلي (اختياري)" })}>
          <TextInput value={form.actualUserIdNumber} onChange={(v) => set("actualUserIdNumber", v.replace(/\D/g, "").slice(0, 10))} dir="ltr" />
          <Err msg={shown("actualUserIdNumber")} />
        </Field>
        <Field label={tx({ en: "Actual user name (optional)", ar: "اسم المستخدم الفعلي (اختياري)" })}>
          <TextInput value={form.actualUserName} onChange={(v) => set("actualUserName", v)} />
          <Err msg={shown("actualUserName")} />
        </Field>
        <Field label={tx({ en: "Hold status", ar: "حالة التحفظ" })}>
          <CustomSelect value={form.holdStatus} onChange={(v) => set("holdStatus", v as Form["holdStatus"])} options={opts(HOLD_STATUSES, tx)} />
        </Field>
        <Field label={tx({ en: "Status", ar: "الحالة" })}>
          <CustomSelect value={form.status} onChange={(v) => set("status", v as VehicleStatus)} options={opts(STATUS_OPTIONS, tx)} />
        </Field>
        {editing && (
          <Field label={tx({ en: "Current driver", ar: "السائق الحالي" })} wide>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {editing.currentDriver ? (
                <Badge label={tx(editing.currentDriver.name)} tone="info" />
              ) : (
                <span className="text-neutral-400">{tx({ en: "Unassigned. Drivers are assigned from the Assignments page.", ar: "بدون سائق. يتم الإسناد من صفحة الإسناد." })}</span>
              )}
            </p>
          </Field>
        )}
      </RecordModal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
