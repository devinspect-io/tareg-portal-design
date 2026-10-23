"use client";

// Drivers register on the real API: paged list with search and filters,
// stats, and create / edit / delete in a modal.

import { useCallback, useMemo, useState } from "react";
import CustomSelect from "@/components/dashboard/CustomSelect";
import DatePicker from "@/components/dashboard/DatePicker";
import DataTable, { Badge } from "@/components/dashboard/DataTable";
import { Block, Page, Status } from "@/components/dashboard/ModulePage";
import { EditButton, Field, FilterBar, RecordModal, TextInput, Toast } from "@/components/dashboard/RecordTools";
import { FormError, LiveState, Pager, Refreshing, useDebounced } from "@/components/dashboard/live/LiveKit";
import { api } from "@/lib/api/client";
import { fieldErrors } from "@/lib/api/errors";
import { useApi, useApiPage } from "@/lib/api/hooks";
import { useCan } from "@/lib/api/session";
import type { ApiDriver, AssignmentBlocker, DriverInput, DriverStatus, Paged } from "@/lib/api/types";
import { fmtDate, type StatusCode } from "@/lib/fleet-data";
import { useT, type Bi } from "@/lib/translations";

const PAGE_SIZE = 20;

const NATIONALITIES: Bi[] = [
  { en: "Saudi", ar: "سعودي" },
  { en: "Pakistani", ar: "باكستاني" },
  { en: "Indian", ar: "هندي" },
  { en: "Bangladeshi", ar: "بنغلاديشي" },
  { en: "Egyptian", ar: "مصري" },
  { en: "Filipino", ar: "فلبيني" },
  { en: "Sudanese", ar: "سوداني" },
  { en: "Yemeni", ar: "يمني" },
  { en: "Nepali", ar: "نيبالي" },
  { en: "Sri Lankan", ar: "سريلانكي" },
  { en: "Jordanian", ar: "أردني" },
  { en: "Syrian", ar: "سوري" },
];

const BLOCKER_TEXT: Record<AssignmentBlocker, Bi> = {
  LICENSE_EXPIRED: { en: "Driving license expired", ar: "رخصة القيادة منتهية" },
  NATIONAL_ID_EXPIRED: { en: "National ID expired", ar: "الهوية الوطنية منتهية" },
  IQAMA_EXPIRED: { en: "Iqama expired", ar: "الإقامة منتهية" },
};

type Form = {
  nameEn: string;
  nameAr: string;
  employeeNo: string;
  phone: string;
  idType: "national" | "iqama";
  idNumber: string;
  idExpiry: string;
  licenseExpiry: string;
  nationality: string; // English name, used as the option value
  status: DriverStatus;
};

const EMPTY: Form = {
  nameEn: "",
  nameAr: "",
  employeeNo: "",
  phone: "",
  idType: "national",
  idNumber: "",
  idExpiry: "",
  licenseExpiry: "",
  nationality: "Saudi",
  status: "active",
};

/** Saudi mobile in any common spelling to canonical +9665XXXXXXXX, or null. */
function normalizeSaudiMobile(raw: string): string | null {
  const s = raw.replace(/[\s-]/g, "");
  const m = /^(?:\+966|00966|966|0)?(5\d{8})$/.exec(s);
  return m ? `+966${m[1]}` : null;
}

function toForm(d: ApiDriver): Form {
  return {
    nameEn: d.name.en,
    nameAr: d.name.ar,
    employeeNo: d.employeeNo,
    phone: d.phone,
    idType: d.idType,
    idNumber: d.idNumber,
    idExpiry: d.idExpiry,
    licenseExpiry: d.licenseExpiry,
    nationality: d.nationality.en,
    status: d.status,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

export default function DriversLive() {
  const { tx, language } = useT();
  const can = useCan();
  const canManage = can("drivers:manage");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [idType, setIdType] = useState("");
  const [sort, setSort] = useState("");
  const q = useDebounced(search.trim(), 300);

  const key = JSON.stringify({ page, q, status, idType, sort });
  const list = useApiPage<ApiDriver>(() => api.page<ApiDriver>("/drivers", { page, pageSize: PAGE_SIZE, search: q, status, idType, sort }), key);

  // Stats: cheap counts via pageSize 1, plus an expired-documents count when the whole fleet fits one fetch.
  const stats = useApi(async () => {
    const count = (query: Record<string, string | number>) => api.page<ApiDriver>("/drivers", { pageSize: 1, ...query });
    const [all, active, onLeave] = await Promise.all([count({}), count({ status: "active" }), count({ status: "onLeave" })]);
    let blocked: number | null = null;
    if (all.total <= 100) {
      const full: Paged<ApiDriver> = await api.page<ApiDriver>("/drivers", { pageSize: 100 });
      blocked = full.items.filter((d) => d.assignmentBlockers.length > 0).length;
    }
    return { total: all.total, active: active.total, onLeave: onLeave.total, blocked };
  }, "stats");

  const [modal, setModal] = useState<ApiDriver | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      if (!(k in e) && !(k === "nameEn" && "name.en" in e) && !(k === "nameAr" && "name.ar" in e)) return e;
      const { [k]: _a, "name.en": _b, "name.ar": _c, ...rest } = e;
      void _a;
      void _b;
      void _c;
      return rest;
    });
  };

  const nationalityOptions = useMemo(() => {
    const known = [...NATIONALITIES];
    if (modal && modal !== "new" && !known.some((n) => n.en === modal.nationality.en)) known.push(modal.nationality);
    return known;
  }, [modal]);

  const openModal = (d: ApiDriver | "new") => {
    setForm(d === "new" ? EMPTY : toForm(d));
    setErrors({});
    setFormError(null);
    setModal(d);
  };
  const closeModal = useCallback(() => setModal(null), []);

  const refreshAll = () => {
    list.reload();
    stats.reload();
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    const req = tx({ en: "Required", ar: "مطلوب" });
    if (!form.nameEn.trim()) e["name.en"] = req;
    if (!form.nameAr.trim()) e["name.ar"] = req;
    if (!form.employeeNo.trim()) e.employeeNo = req;
    if (!form.phone.trim()) e.phone = req;
    else if (!normalizeSaudiMobile(form.phone)) e.phone = tx({ en: "Enter a Saudi mobile, e.g. +966 5X XXX XXXX", ar: "أدخل رقم جوال سعودي، مثل 5XXXXXXXX 966+" });
    if (!form.idNumber.trim()) e.idNumber = req;
    else if (!/^\d{10}$/.test(form.idNumber)) e.idNumber = tx({ en: "Must be 10 digits", ar: "يجب أن يكون 10 أرقام" });
    else if (!form.idNumber.startsWith(form.idType === "national" ? "1" : "2")) {
      e.idNumber = form.idType === "national" ? tx({ en: "A national ID starts with 1", ar: "تبدأ الهوية الوطنية بالرقم 1" }) : tx({ en: "An Iqama number starts with 2", ar: "يبدأ رقم الإقامة بالرقم 2" });
    }
    if (!form.idExpiry) e.idExpiry = req;
    if (!form.licenseExpiry) e.licenseExpiry = req;
    return e;
  };

  const save = async () => {
    const e = validate();
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    const nat = nationalityOptions.find((n) => n.en === form.nationality) ?? NATIONALITIES[0];
    const body: DriverInput = {
      name: { en: form.nameEn.trim(), ar: form.nameAr.trim() },
      employeeNo: form.employeeNo.trim(),
      phone: normalizeSaudiMobile(form.phone) ?? form.phone.trim(),
      idType: form.idType,
      idNumber: form.idNumber.trim(),
      idExpiry: form.idExpiry,
      licenseExpiry: form.licenseExpiry,
      nationality: nat,
      status: form.status,
    };
    setSaving(true);
    try {
      const adding = modal === "new";
      if (adding) await api.post("/drivers", body);
      else await api.patch(`/drivers/${(modal as ApiDriver).id}`, body);
      setModal(null);
      setToast(adding ? tx({ en: "Driver added", ar: "تمت إضافة السائق" }) : tx({ en: "Driver updated", ar: "تم تحديث السائق" }));
      refreshAll();
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      // Keep the whole-form message unless every problem is shown under a field.
      setFormError(Object.keys(fe).length ? null : err);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!modal || modal === "new") return;
    setSaving(true);
    setFormError(null);
    try {
      await api.delete(`/drivers/${modal.id}`);
      setModal(null);
      setToast(tx({ en: "Driver deleted", ar: "تم حذف السائق" }));
      // Deleting the last row of a page would leave an empty page.
      if (list.items.length === 1 && page > 1) setPage(page - 1);
      refreshAll();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  };

  const clear = () => {
    setSearch("");
    setStatus("");
    setIdType("");
    setSort("");
    setPage(1);
  };

  const s = stats.data;
  const statList = [
    { label: { en: "Total drivers", ar: "إجمالي السائقين" }, value: s ? String(s.total) : "-" },
    { label: { en: "Active", ar: "نشطون" }, value: s ? String(s.active) : "-", tone: "good" as const },
    { label: { en: "On leave", ar: "في إجازة" }, value: s ? String(s.onLeave) : "-" },
    ...(s && s.blocked !== null ? [{ label: { en: "Documents needing action", ar: "وثائق تحتاج إجراء" }, value: String(s.blocked), tone: "bad" as const }] : []),
  ];

  const rows = list.items.map((d) => {
    const blockers = d.assignmentBlockers.map((b) => tx(BLOCKER_TEXT[b])).join("، ");
    const idLabel = d.idType === "national" ? tx({ en: "National ID", ar: "هوية وطنية" }) : tx({ en: "Iqama", ar: "إقامة" });
    return {
      key: d.id,
      cells: [
        <div key="n">
          <div className="font-semibold text-foreground">{tx(d.name)}</div>
          <div dir="ltr" className="text-xs text-neutral-500 dark:text-neutral-400 text-start">
            {d.employeeNo}
          </div>
        </div>,
        <span key="ph" dir="ltr" className="inline-block">
          {d.phone}
        </span>,
        <div key="id">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">{idLabel}</div>
          <div dir="ltr" className="font-mono text-xs text-start">
            {d.idNumber}
          </div>
        </div>,
        tx(d.nationality),
        <DocCell key="le" doc={d.documents.license} language={language} />,
        <DocCell key="ie" doc={d.documents.id} language={language} />,
        d.currentVehicle ? (
          <div key="v">
            <div dir="ltr" className="font-semibold text-start">
              {d.currentVehicle.plateNumber}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">{tx(d.currentVehicle.make)}</div>
          </div>
        ) : (
          <span key="v" className="text-neutral-400">
            {tx({ en: "No vehicle", ar: "بدون مركبة" })}
          </span>
        ),
        <span key="s" className="flex flex-wrap items-center gap-1.5">
          <Status code={d.status} />
          {blockers && (
            <span title={blockers}>
              <Badge label={tx({ en: "Can't be assigned", ar: "لا يمكن إسناده" })} tone="warn" />
            </span>
          )}
        </span>,
        canManage ? <EditButton key="e" onClick={() => openModal(d)} label={tx({ en: "Edit driver", ar: "تعديل السائق" })} /> : null,
      ],
    };
  });

  const headers = [
    tx({ en: "Name", ar: "الاسم" }),
    tx({ en: "Phone", ar: "الجوال" }),
    tx({ en: "ID / Iqama", ar: "الهوية / الإقامة" }),
    tx({ en: "Nationality", ar: "الجنسية" }),
    tx({ en: "License expiry", ar: "انتهاء الرخصة" }),
    tx({ en: "ID / Iqama expiry", ar: "انتهاء الهوية / الإقامة" }),
    tx({ en: "Vehicle", ar: "المركبة" }),
    tx({ en: "Status", ar: "الحالة" }),
    "",
  ];

  const idPrefixHint = form.idType === "national" ? tx({ en: "Starts with 1", ar: "يبدأ بالرقم 1" }) : tx({ en: "Starts with 2", ar: "يبدأ بالرقم 2" });

  return (
    <>
      <Page
        moduleKey="drivers"
        subtitle={{ en: "Driver profiles, identity documents, licenses and assigned vehicles.", ar: "ملفات السائقين ووثائق الهوية والرخص والمركبات المسندة." }}
        primaryAction={canManage ? { en: "Add driver", ar: "إضافة سائق" } : undefined}
        onPrimaryAction={canManage ? () => openModal("new") : undefined}
        stats={statList}
      >
        <Block>
          <div className="space-y-4">
            <FilterBar
              search={search}
              onSearch={(v) => {
                setSearch(v);
                setPage(1);
              }}
              searchPlaceholder={tx({ en: "Search name, employee no., phone or ID", ar: "ابحث بالاسم أو الرقم الوظيفي أو الجوال أو الهوية" })}
              filters={[
                {
                  label: tx({ en: "All statuses", ar: "كل الحالات" }),
                  value: status,
                  onChange: (v) => {
                    setStatus(v);
                    setPage(1);
                  },
                  options: [
                    { value: "active", label: tx({ en: "Active", ar: "نشط" }) },
                    { value: "inactive", label: tx({ en: "Inactive", ar: "غير نشط" }) },
                    { value: "onLeave", label: tx({ en: "On leave", ar: "في إجازة" }) },
                  ],
                },
                {
                  label: tx({ en: "All ID types", ar: "كل أنواع الهوية" }),
                  value: idType,
                  onChange: (v) => {
                    setIdType(v);
                    setPage(1);
                  },
                  options: [
                    { value: "national", label: tx({ en: "National ID", ar: "هوية وطنية" }) },
                    { value: "iqama", label: tx({ en: "Iqama", ar: "إقامة" }) },
                  ],
                },
                {
                  label: tx({ en: "Sort: employee no.", ar: "الترتيب: الرقم الوظيفي" }),
                  value: sort,
                  onChange: (v) => {
                    setSort(v);
                    setPage(1);
                  },
                  options: [
                    { value: "-createdAt", label: tx({ en: "Newest first", ar: "الأحدث أولًا" }) },
                    { value: "licenseExpiry", label: tx({ en: "License expiring first", ar: "الرخصة الأقرب انتهاءً" }) },
                    { value: "idExpiry", label: tx({ en: "ID expiring first", ar: "الهوية الأقرب انتهاءً" }) },
                  ],
                },
              ]}
              shown={list.items.length}
              total={list.total}
              onClear={clear}
            />
            <LiveState loading={list.loading} error={list.error} onRetry={list.reload}>
              <Refreshing on={list.fetching} />
              <DataTable
                title={tx({ en: "Driver register", ar: "سجل السائقين" })}
                headers={headers}
                rows={rows}
                empty={tx({ en: "No drivers match these filters.", ar: "لا يوجد سائقون مطابقون لعوامل التصفية." })}
              />
              <Pager page={page} pageSize={PAGE_SIZE} total={list.total} onPage={setPage} />
            </LiveState>
          </div>
        </Block>
      </Page>

      <RecordModal
        open={modal !== null}
        title={modal === "new" ? tx({ en: "Add driver", ar: "إضافة سائق" }) : tx({ en: "Edit driver", ar: "تعديل السائق" })}
        onClose={closeModal}
        onSave={save}
        onDelete={modal && modal !== "new" ? remove : undefined}
        canSave={!saving}
      >
        <Field label={tx({ en: "Name (English)", ar: "الاسم (English)" })}>
          <TextInput value={form.nameEn} onChange={(v) => set("nameEn", v)} placeholder="English" dir="ltr" />
          <FieldError message={errors["name.en"] ?? errors.name} />
        </Field>
        <Field label={tx({ en: "Name (Arabic)", ar: "الاسم (العربية)" })}>
          <TextInput value={form.nameAr} onChange={(v) => set("nameAr", v)} placeholder="العربية" dir="rtl" />
          <FieldError message={errors["name.ar"]} />
        </Field>
        <Field label={tx({ en: "Employee no.", ar: "الرقم الوظيفي" })}>
          <TextInput value={form.employeeNo} onChange={(v) => set("employeeNo", v)} placeholder="EMP-1000" dir="ltr" />
          <FieldError message={errors.employeeNo} />
        </Field>
        <Field label={tx({ en: "Phone", ar: "الجوال" })}>
          <TextInput value={form.phone} onChange={(v) => set("phone", v)} placeholder="+966 5X XXX XXXX" dir="ltr" />
          <FieldError message={errors.phone} />
        </Field>
        <Field label={tx({ en: "ID type", ar: "نوع الهوية" })}>
          <CustomSelect
            value={form.idType}
            onChange={(v) => set("idType", v as Form["idType"])}
            options={[
              { value: "national", label: tx({ en: "National ID", ar: "هوية وطنية" }) },
              { value: "iqama", label: tx({ en: "Iqama", ar: "إقامة" }) },
            ]}
          />
        </Field>
        <Field label={`${tx({ en: "ID / Iqama number", ar: "رقم الهوية / الإقامة" })} (${idPrefixHint})`}>
          <TextInput value={form.idNumber} onChange={(v) => set("idNumber", v.replace(/\D/g, "").slice(0, 10))} placeholder={form.idType === "national" ? "1XXXXXXXXX" : "2XXXXXXXXX"} dir="ltr" />
          <FieldError message={errors.idNumber} />
        </Field>
        <Field label={tx({ en: "ID / Iqama expiry", ar: "انتهاء الهوية / الإقامة" })}>
          <DatePicker value={form.idExpiry} onChange={(v) => set("idExpiry", v)} />
          <FieldError message={errors.idExpiry} />
        </Field>
        <Field label={tx({ en: "License expiry", ar: "انتهاء الرخصة" })}>
          <DatePicker value={form.licenseExpiry} onChange={(v) => set("licenseExpiry", v)} />
          <FieldError message={errors.licenseExpiry} />
        </Field>
        <Field label={tx({ en: "Nationality", ar: "الجنسية" })}>
          <CustomSelect value={form.nationality} onChange={(v) => set("nationality", v)} options={nationalityOptions.map((n) => ({ value: n.en, label: tx(n) }))} />
        </Field>
        <Field label={tx({ en: "Status", ar: "الحالة" })}>
          <CustomSelect
            value={form.status}
            onChange={(v) => set("status", v as DriverStatus)}
            options={[
              { value: "active", label: tx({ en: "Active", ar: "نشط" }) },
              { value: "inactive", label: tx({ en: "Inactive", ar: "غير نشط" }) },
              { value: "onLeave", label: tx({ en: "On leave", ar: "في إجازة" }) },
            ]}
          />
        </Field>
        <FormError error={formError} />
      </RecordModal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

/** Expiry date plus the server-computed status pill. */
function DocCell({ doc, language }: { doc: ApiDriver["documents"]["license"]; language: "en" | "ar" }) {
  if (!doc.expiry) return <span className="text-neutral-400">-</span>;
  const code: StatusCode | null = doc.status && doc.status !== "valid" ? doc.status : null;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span dir="ltr">{fmtDate(doc.expiry, language)}</span>
      {code && <Status code={code} />}
    </span>
  );
}
