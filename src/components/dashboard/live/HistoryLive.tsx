"use client";

// Vehicle & Driver History: one timeline per vehicle or driver, merged by the
// server from maintenance (with invoices), breakdowns, accidents, violations,
// kilometer readings and assignments. Live data from
// GET /history/vehicles/:id and GET /history/drivers/:id (permission
// history:view). The portal builds the titles; the API sends `type` and a
// type-specific `detail`. Document expiries are not events: they come from the
// subject's `documents`, shown in the summary at the top.

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/dashboard/DataTable";
import CustomSelect from "@/components/dashboard/CustomSelect";
import DatePicker from "@/components/dashboard/DatePicker";
import { Block, Page, Status } from "@/components/dashboard/ModulePage";
import { Field } from "@/components/dashboard/RecordTools";
import { FileLightbox, FileThumbs } from "@/components/dashboard/live/Evidence";
import { APPROVAL_TYPE_LABEL, DOCUMENT_LABEL, DriverCell, Fact, LiveState, Pager, Refreshing, VehicleCell, useDebounced } from "@/components/dashboard/live/LiveKit";
import { api } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { ApiDriver, ApiVehicle, DocStatus, HistoryEvent, HistoryResponse, HistoryType } from "@/lib/api/types";
import { STATUS, fmtDate, fmtKm, fmtSAR, type StatusCode } from "@/lib/fleet-data";
import { useT, type Bi } from "@/lib/translations";

const PAGE_SIZE = 20;
const OPTIONS_LIMIT = 100;

type Kind = "vehicle" | "driver";
type Subject = ApiVehicle | ApiDriver;

const TYPE_LABEL: Record<HistoryType, Bi> = {
  maintenance: { en: "Maintenance", ar: "صيانة" },
  breakdown: { en: "Breakdown", ar: "عطل" },
  accident: { en: "Accident", ar: "حادث" },
  violation: { en: "Traffic violation", ar: "مخالفة مرورية" },
  mileage: { en: "Kilometer reading", ar: "قراءة عداد" },
  assignment: { en: "Assignment", ar: "إسناد" },
};
const TYPES = Object.keys(TYPE_LABEL) as HistoryType[];

/** Timeline dot per kind of event. */
const DOT: Record<HistoryType, string> = {
  maintenance: "bg-prime-600",
  breakdown: "bg-red-500",
  accident: "bg-red-600",
  violation: "bg-accent-500",
  mileage: "bg-neutral-400",
  assignment: "bg-green-500",
};

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-neutral-400 focus:border-prime-500 focus:ring-4 focus:ring-prime-500/10 dark:border-neutral-700 dark:bg-neutral-800";

// ---------- Small pieces ----------

function SubjectTabs({ value, onChange }: { value: Kind; onChange: (k: Kind) => void }) {
  const { tx } = useT();
  const tabs: { key: Kind; label: string }[] = [
    { key: "vehicle", label: tx({ en: "Vehicle", ar: "مركبة" }) },
    { key: "driver", label: tx({ en: "Driver", ar: "سائق" }) },
  ];
  return (
    <div role="tablist" className="inline-flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={`relative rounded-lg px-5 py-1.5 text-sm font-semibold transition-colors ${
              active ? "text-foreground" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {active && <motion.span layoutId="history-subject-tab" className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-neutral-700" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function TypeChips({ value, onToggle, onAll }: { value: HistoryType[]; onToggle: (t: HistoryType) => void; onAll: () => void }) {
  const { tx } = useT();
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
      on ? "border-prime-600 bg-prime-600 text-white" : "border-neutral-200 bg-white text-neutral-600 hover:border-prime-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
    }`;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={tx({ en: "Event types", ar: "أنواع الأحداث" })}>
      <button type="button" aria-pressed={value.length === 0} onClick={onAll} className={chip(value.length === 0)}>
        {tx({ en: "All events", ar: "كل الأحداث" })}
      </button>
      {TYPES.map((t) => (
        <button key={t} type="button" aria-pressed={value.includes(t)} onClick={() => onToggle(t)} className={chip(value.includes(t))}>
          {tx(TYPE_LABEL[t])}
        </button>
      ))}
    </div>
  );
}

function DocRow({ label, doc }: { label: string; doc: DocStatus }) {
  const { language } = useT();
  const code = doc.status && doc.status in STATUS ? (doc.status as StatusCode) : null;
  return (
    <Fact label={label}>
      <span className="flex flex-wrap items-center gap-2">
        <span>{doc.expiry ? fmtDate(doc.expiry, language) : "-"}</span>
        {code && code !== "valid" && <Status code={code} />}
        {code === "valid" && <Status code="valid" />}
      </span>
    </Fact>
  );
}

/** The vehicle or driver the timeline belongs to, with its document expiries. */
function SubjectSummary({ kind, subject }: { kind: Kind; subject: Subject }) {
  const { tx, language } = useT();
  if (kind === "vehicle") {
    const v = subject as ApiVehicle;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p dir="ltr" className="text-lg font-bold text-foreground">{v.plateNumber}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {tx(v.make)} {tx(v.model)} ({v.manufactureYear})
            </p>
          </div>
          <Status code={v.status} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label={tx({ en: "Odometer", ar: "العداد" })}>{fmtKm(v.mileage, language)}</Fact>
          <Fact label={tx({ en: "City", ar: "المدينة" })}>{tx(v.city)}</Fact>
          <Fact label={tx({ en: "Current driver", ar: "السائق الحالي" })}>
            <DriverCell driver={v.currentDriver} />
          </Fact>
          <Fact label={tx({ en: "VIN", ar: "رقم الهيكل" })}>
            <span dir="ltr" className="font-mono text-xs">{v.vin}</span>
          </Fact>
          <DocRow label={tx(DOCUMENT_LABEL.registration)} doc={v.documents.registration} />
          <DocRow label={tx(DOCUMENT_LABEL.insurance)} doc={v.documents.insurance} />
          <DocRow label={tx(DOCUMENT_LABEL.inspection)} doc={v.documents.inspection} />
        </div>
      </div>
    );
  }
  const d = subject as ApiDriver;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-foreground">{tx(d.name)}</p>
          <p dir="ltr" className="text-sm text-neutral-500 dark:text-neutral-400">{d.employeeNo}</p>
        </div>
        <Status code={d.status} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label={tx({ en: "Phone", ar: "الجوال" })}>
          <span dir="ltr">{d.phone}</span>
        </Fact>
        <Fact label={tx({ en: "Nationality", ar: "الجنسية" })}>{tx(d.nationality)}</Fact>
        <Fact label={tx({ en: "Current vehicle", ar: "المركبة الحالية" })}>
          <VehicleCell vehicle={d.currentVehicle} />
        </Fact>
        <Fact label={d.idType === "iqama" ? tx({ en: "Iqama no.", ar: "رقم الإقامة" }) : tx({ en: "National ID no.", ar: "رقم الهوية" })}>
          <span dir="ltr">{d.idNumber}</span>
        </Fact>
        <DocRow label={tx(DOCUMENT_LABEL.license)} doc={d.documents.license} />
        <DocRow label={d.idType === "iqama" ? tx(DOCUMENT_LABEL.iqama) : tx(DOCUMENT_LABEL.nationalId)} doc={d.documents.id} />
      </div>
    </div>
  );
}

/** A labelled value inside an event card. */
function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <div className="mt-0.5 text-sm font-medium break-words text-foreground">{children}</div>
    </div>
  );
}

const dash = <span className="text-neutral-400">-</span>;

/** Localized headline, built from the event's type and detail. */
function titleOf(e: HistoryEvent, tx: (b: Bi) => string, language: "en" | "ar"): string {
  switch (e.type) {
    case "maintenance":
      // "Maintenance: Maintenance" says nothing twice; only name other categories.
      return e.detail.category === "maintenance"
        ? tx(TYPE_LABEL.maintenance)
        : `${tx(TYPE_LABEL.maintenance)}: ${tx(APPROVAL_TYPE_LABEL[e.detail.category])}`;
    case "breakdown":
      return e.detail.major ? tx({ en: "Major breakdown", ar: "عطل كبير" }) : tx(TYPE_LABEL.breakdown);
    case "accident":
      return tx(TYPE_LABEL.accident);
    case "violation":
      return `${tx(TYPE_LABEL.violation)}: ${e.detail.violationType}`;
    case "mileage":
      return `${tx(TYPE_LABEL.mileage)}: ${fmtKm(e.detail.reading, language)}`;
    case "assignment":
      return e.detail.to ? tx({ en: "Vehicle assignment (ended)", ar: "إسناد مركبة (منتهٍ)" }) : tx({ en: "Vehicle assigned", ar: "إسناد مركبة" });
  }
}

function EventDetail({ e, onPhotos }: { e: HistoryEvent; onPhotos: (ids: string[]) => void }) {
  const { tx, language } = useT();
  const photos = (ids: string[]) => <FileThumbs ids={ids} onOpen={() => onPhotos(ids)} />;
  const grid = "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4";
  const wide = "col-span-2 sm:col-span-4";
  switch (e.type) {
    case "maintenance": {
      const d = e.detail;
      return (
        <div className={grid}>
          <Item label={tx({ en: "Workshop / vendor", ar: "الورشة / المورد" })}>{d.vendor}</Item>
          <Item label={tx({ en: "Cost", ar: "التكلفة" })}>
            <span className="font-semibold">{fmtSAR(d.cost, language)}</span>
          </Item>
          <Item label={tx({ en: "Type", ar: "النوع" })}>
            {d.emergency ? <Badge label={tx({ en: "Emergency", ar: "طارئة" })} tone="bad" /> : <Badge label={tx({ en: "Planned", ar: "مخططة" })} tone="info" />}
          </Item>
          <Item label={tx({ en: "Invoice", ar: "الفاتورة" })}>{photos(d.invoicePhotos)}</Item>
          <div className={wide}>
            <Item label={tx({ en: "Work done", ar: "العمل المنجز" })}>
              <span className="font-normal whitespace-pre-line">{d.description}</span>
            </Item>
          </div>
          <Item label={tx({ en: "Next service date", ar: "موعد الصيانة القادمة" })}>{d.nextServiceDate ? fmtDate(d.nextServiceDate, language) : dash}</Item>
          <Item label={tx({ en: "Next service at", ar: "الصيانة القادمة عند" })}>{d.nextServiceKm === null ? dash : fmtKm(d.nextServiceKm, language)}</Item>
        </div>
      );
    }
    case "breakdown": {
      const d = e.detail;
      return (
        <div className={grid}>
          <Item label={tx({ en: "Location", ar: "الموقع" })}>{d.location}</Item>
          <Item label={tx({ en: "Severity", ar: "الخطورة" })}>
            {d.major ? <Badge label={tx({ en: "Major", ar: "كبير" })} tone="bad" /> : <Badge label={tx({ en: "Minor", ar: "بسيط" })} tone="neutral" />}
          </Item>
          <Item label={tx({ en: "Photos", ar: "الصور" })}>{photos(d.photos)}</Item>
          <div className={wide}>
            <Item label={tx({ en: "Description", ar: "الوصف" })}>
              <span className="font-normal whitespace-pre-line">{d.description}</span>
            </Item>
          </div>
          {d.resolution && (
            <div className={wide}>
              <Item label={tx({ en: "Resolution", ar: "الحل" })}>
                <span className="font-normal whitespace-pre-line">{d.resolution}</span>
              </Item>
            </div>
          )}
        </div>
      );
    }
    case "accident": {
      const d = e.detail;
      return (
        <div className={grid}>
          <Item label={tx({ en: "Location", ar: "الموقع" })}>{d.location}</Item>
          <Item label={tx({ en: "Najm / police ref.", ar: "مرجع نجم / الشرطة" })}>{d.reference ? <span dir="ltr">{d.reference}</span> : dash}</Item>
          <Item label={tx({ en: "Cost", ar: "التكلفة" })}>{d.cost === null ? dash : <span className="font-semibold">{fmtSAR(d.cost, language)}</span>}</Item>
          <Item label={tx({ en: "Photos", ar: "الصور" })}>{photos(d.photos)}</Item>
          <div className={wide}>
            <Item label={tx({ en: "Description", ar: "الوصف" })}>
              <span className="font-normal whitespace-pre-line">{d.description}</span>
            </Item>
          </div>
          {d.notes && (
            <div className={wide}>
              <Item label={tx({ en: "Staff notes", ar: "ملاحظات الموظفين" })}>
                <span className="font-normal whitespace-pre-line">{d.notes}</span>
              </Item>
            </div>
          )}
        </div>
      );
    }
    case "violation": {
      const d = e.detail;
      return (
        <div className={grid}>
          <Item label={tx({ en: "Violation", ar: "المخالفة" })}>{d.violationType}</Item>
          <Item label={tx({ en: "Location", ar: "الموقع" })}>{d.location}</Item>
          <Item label={tx({ en: "Fine", ar: "الغرامة" })}>
            <span className="font-semibold">{fmtSAR(d.fine, language)}</span>
          </Item>
          <Item label={tx({ en: "Ticket photo", ar: "صورة المخالفة" })}>{photos(d.photos)}</Item>
        </div>
      );
    }
    case "mileage": {
      const d = e.detail;
      const down = d.distance < 0;
      return (
        <div className={grid}>
          <Item label={tx({ en: "Reading", ar: "القراءة" })}>
            <span className="font-semibold">{fmtKm(d.reading, language)}</span>
          </Item>
          <Item label={tx({ en: "Previous", ar: "السابقة" })}>{fmtKm(d.previous, language)}</Item>
          <Item label={tx({ en: "Distance", ar: "المسافة" })}>
            <span className={down ? "font-semibold text-red-600 dark:text-red-400" : ""}>
              <bdi dir="ltr">{`${d.distance > 0 ? "+" : ""}${d.distance.toLocaleString("en-US")}`}</bdi> {language === "ar" ? "كم" : "km"}
            </span>
          </Item>
          <Item label={tx({ en: "Odometer photos", ar: "صور العداد" })}>{photos(d.photos)}</Item>
        </div>
      );
    }
    case "assignment": {
      const d = e.detail;
      return (
        <div className={grid}>
          <Item label={tx({ en: "From", ar: "من" })}>{fmtDate(d.from, language)}</Item>
          <Item label={tx({ en: "To", ar: "إلى" })}>{d.to ? fmtDate(d.to, language) : tx({ en: "Still assigned", ar: "ما زال مسندًا" })}</Item>
          <Item label={tx({ en: "Start odometer", ar: "عداد البداية" })}>{fmtKm(d.startOdometer, language)}</Item>
          <Item label={tx({ en: "End odometer", ar: "عداد النهاية" })}>{d.endOdometer === null ? dash : fmtKm(d.endOdometer, language)}</Item>
        </div>
      );
    }
  }
}

function EventCard({ e, kind, onPhotos }: { e: HistoryEvent; kind: Kind; onPhotos: (ids: string[]) => void }) {
  const { tx, language } = useT();
  const code = e.status && e.status in STATUS ? (e.status as StatusCode) : null;
  return (
    <motion.li initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="relative">
      <span className={`absolute top-5 -start-[26px] h-3 w-3 rounded-full ring-4 ring-white dark:ring-neutral-900 ${DOT[e.type]}`} aria-hidden="true" />
      <div className="space-y-3 rounded-xl border border-neutral-100 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{titleOf(e, tx, language)}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span dir="ltr" className="font-semibold text-prime-600 dark:text-prime-400">{e.ref}</span>
              <span aria-hidden="true">·</span>
              <span>{fmtDate(e.date, language)}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={tx(TYPE_LABEL[e.type])} tone="neutral" />
            {code && <Status code={code} />}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {kind === "driver" && e.vehicle && (
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{tx({ en: "Vehicle", ar: "المركبة" })}</p>
              <VehicleCell vehicle={e.vehicle} />
            </div>
          )}
          {kind === "vehicle" && e.driver && (
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{tx({ en: "Driver", ar: "السائق" })}</p>
              <DriverCell driver={e.driver} />
            </div>
          )}
        </div>
        <EventDetail e={e} onPhotos={onPhotos} />
      </div>
    </motion.li>
  );
}

// ---------- Screen ----------

export default function HistoryLive() {
  const { tx } = useT();
  const [kind, setKind] = useState<Kind>("vehicle");
  const [subjectId, setSubjectId] = useState("");
  const [pickerSearch, setPickerSearch] = useState("");
  const [types, setTypes] = useState<HistoryType[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [lightbox, setLightbox] = useState<{ ids: string[]; start: number } | null>(null);
  const q = useDebounced(pickerSearch.trim());

  // Picker options: the first 100 matches of the search, from the module's own list.
  // The result carries its kind: a reload keeps the old data on screen, which must never be read as the new kind's.
  const options = useApi(async () => {
    if (kind === "vehicle") {
      const res = await api.page<ApiVehicle>("/vehicles", { search: q, pageSize: OPTIONS_LIMIT });
      return { kind, list: res.items.map((v) => ({ value: v.id, label: `${v.plateNumber} - ${tx(v.make)} ${tx(v.model)}` })) };
    }
    const res = await api.page<ApiDriver>("/drivers", { search: q, pageSize: OPTIONS_LIMIT });
    return { kind, list: res.items.map((d) => ({ value: d.id, label: `${tx(d.name)} (${d.employeeNo})` })) };
  }, `${kind}|${q}`);
  const optionList = options.data?.kind === kind ? options.data.list : [];
  // Nothing chosen yet: show the first match straight away.
  const activeId = subjectId || optionList[0]?.value || "";

  const typesParam = types.length > 0 ? types.join(",") : "";
  const history = useApi(
    async () => {
      if (!activeId) return null;
      const res = await api.getWithMeta<HistoryResponse<Subject>>(`/history/${kind === "vehicle" ? "vehicles" : "drivers"}/${encodeURIComponent(activeId)}`, {
        types: typesParam,
        from,
        to,
        page,
        pageSize: PAGE_SIZE,
      });
      return { ...res, kind, id: activeId };
    },
    JSON.stringify([kind, activeId, typesParam, from, to, page]),
  );

  const closeLightbox = useCallback(() => setLightbox(null), []);
  const resetPaging = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const switchKind = (k: Kind) => {
    if (k === kind) return;
    setKind(k);
    setSubjectId("");
    setPickerSearch("");
    setPage(1);
  };
  const toggleType = (t: HistoryType) => {
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
    setPage(1);
  };
  const filtered = Boolean(types.length || from || to);

  const res = history.data;
  const fresh = res?.kind === kind;
  const noSubjects = !options.loading && !options.error && options.data?.kind === kind && optionList.length === 0 && !q;

  return (
    <Page
      moduleKey="history"
      subtitle={{
        en: "The complete record of each vehicle or driver: maintenance, invoices, incidents, readings and assignments.",
        ar: "السجل الكامل لكل مركبة أو سائق: الصيانة والفواتير والحوادث والقراءات والإسنادات.",
      }}
    >
      <Block>
        <div className="space-y-4 rounded-xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="grid items-end gap-3 lg:grid-cols-[auto_1fr_1fr]">
            <SubjectTabs value={kind} onChange={switchKind} />
            <Field label={kind === "vehicle" ? tx({ en: "Find a vehicle", ar: "ابحث عن مركبة" }) : tx({ en: "Find a driver", ar: "ابحث عن سائق" })}>
              <input
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder={kind === "vehicle" ? tx({ en: "Plate, VIN or model…", ar: "اللوحة أو رقم الهيكل أو الطراز…" }) : tx({ en: "Name, employee no. or ID…", ar: "الاسم أو الرقم الوظيفي أو الهوية…" })}
                className={inputClass}
              />
            </Field>
            <Field label={kind === "vehicle" ? tx({ en: "Vehicle", ar: "المركبة" }) : tx({ en: "Driver", ar: "السائق" })}>
              <CustomSelect
                value={activeId}
                onChange={(v) => {
                  setSubjectId(v);
                  setPage(1);
                }}
                options={optionList}
                placeholder={options.loading ? tx({ en: "Loading…", ar: "جارٍ التحميل…" }) : tx({ en: "No match", ar: "لا توجد نتيجة" })}
              />
            </Field>
          </div>
          <TypeChips value={types} onToggle={toggleType} onAll={() => resetPaging(setTypes)([])} />
          <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={tx({ en: "From", ar: "من" })}>
              <DatePicker value={from} onChange={resetPaging(setFrom)} />
            </Field>
            <Field label={tx({ en: "To", ar: "إلى" })}>
              <DatePicker value={to} onChange={resetPaging(setTo)} />
            </Field>
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setTypes([]);
                  setFrom("");
                  setTo("");
                  setPage(1);
                }}
                className="justify-self-start pb-2.5 text-xs font-semibold text-prime-600 transition-colors hover:text-prime-700 dark:text-prime-400"
              >
                {tx({ en: "Clear filters", ar: "مسح عوامل التصفية" })}
              </button>
            )}
          </div>
        </div>
      </Block>

      {options.error ? (
        <Block>
          <LiveState loading={false} error={options.error} onRetry={options.reload}>
            {null}
          </LiveState>
        </Block>
      ) : noSubjects ? (
        <Block>
          <p className="rounded-xl border border-neutral-100 bg-white px-6 py-14 text-center text-sm text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            {kind === "vehicle" ? tx({ en: "No vehicles yet.", ar: "لا توجد مركبات بعد." }) : tx({ en: "No drivers yet.", ar: "لا يوجد سائقون بعد." })}
          </p>
        </Block>
      ) : !activeId && !options.loading ? (
        <Block>
          <p className="rounded-xl border border-neutral-100 bg-white px-6 py-14 text-center text-sm text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            {tx({ en: "Nothing matches this search. Try a different plate, name or number.", ar: "لا توجد نتائج لهذا البحث. جرّب لوحة أو اسمًا أو رقمًا آخر." })}
          </p>
        </Block>
      ) : (
        <LiveState loading={options.loading || (Boolean(activeId) && (history.loading || !fresh))} error={history.error} onRetry={history.reload}>
          {res && fresh && (
            <>
              <Block>
                <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <SubjectSummary kind={kind} subject={res.data.subject} />
                </div>
              </Block>
              <Block>
                <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <Refreshing on={history.fetching} />
                  <div className="mb-4 mt-1 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">{tx({ en: "Timeline", ar: "الخط الزمني" })}</h3>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{tx({ en: `${res.total} ${res.total === 1 ? "event" : "events"}`, ar: `${res.total} حدث` })}</span>
                  </div>
                  {res.data.events.length === 0 ? (
                    <p className="py-10 text-center text-sm text-neutral-400">
                      {filtered
                        ? tx({ en: "No events match these filters.", ar: "لا توجد أحداث مطابقة لعوامل التصفية." })
                        : tx({ en: "No recorded events yet.", ar: "لا توجد أحداث مسجلة بعد." })}
                    </p>
                  ) : (
                    <ol className="relative space-y-4 border-s border-neutral-200 ps-5 dark:border-neutral-700">
                      {res.data.events.map((e) => (
                        <EventCard key={`${e.type}-${e.id}`} e={e} kind={kind} onPhotos={(ids) => setLightbox({ ids, start: 0 })} />
                      ))}
                    </ol>
                  )}
                  <Pager page={page} pageSize={PAGE_SIZE} total={res.total} onPage={setPage} />
                </div>
              </Block>
            </>
          )}
        </LiveState>
      )}

      <AnimatePresence>{lightbox && <FileLightbox key="lb" ids={lightbox.ids} start={lightbox.start} onClose={closeLightbox} />}</AnimatePresence>
    </Page>
  );
}
