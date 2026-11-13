"use client";

// Maintenance: work records drivers submit from the mobile app against an
// approved request, with the invoice. Live data from GET /maintenance and the
// next-service table from GET /maintenance/schedule. With
// "maintenance:manage" staff correct a record while it is in progress, then
// complete it (which locks it). No create here.

import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import DataTable, { Badge } from "@/components/dashboard/DataTable";
import DatePicker from "@/components/dashboard/DatePicker";
import { Block, Page, Status, toggleCard } from "@/components/dashboard/ModulePage";
import { EditButton, Field, FilterBar, NumberInput, RecordModal, TextArea, TextInput, Toast } from "@/components/dashboard/RecordTools";
import { FileGallery, FileLightbox, FileThumbs } from "@/components/dashboard/live/Evidence";
import {
  APPROVAL_TYPE_LABEL,
  ActionButton,
  ActionDialog,
  Dialog,
  DriverCell,
  Fact,
  FormError,
  LiveState,
  Pager,
  Refreshing,
  VehicleCell,
  countText,
  useDebounced,
  useFleetOptions,
} from "@/components/dashboard/live/LiveKit";
import { api } from "@/lib/api/client";
import { useApi, useApiPage } from "@/lib/api/hooks";
import { useCan } from "@/lib/api/session";
import type { ApiMaintenance, ApiServiceDue, MaintenancePatch } from "@/lib/api/types";
import { downloadCsv, fetchAllPages, type ExportColumn } from "@/lib/export";
import { STATUS, fmtDate, fmtKm, fmtSAR } from "@/lib/fleet-data";
import { useT } from "@/lib/translations";

const PAGE_SIZE = 20;
const DESCRIPTION_MAX = 500;
const VENDOR_MAX = 200;

type Draft = { description: string; vendor: string; cost: number; nextServiceDate: string; nextServiceKm: number | null };

function Kind({ emergency }: { emergency: boolean }) {
  const { tx } = useT();
  return emergency ? <Badge label={tx({ en: "Emergency", ar: "طارئة" })} tone="bad" /> : <Badge label={tx({ en: "Planned", ar: "مخططة" })} tone="info" />;
}

/** "12 days" / "3 days late", and / or km left, whichever the service is due by. */
function Remaining({ s }: { s: ApiServiceDue }) {
  const { tx, language } = useT();
  const parts: string[] = [];
  if (s.daysLeft !== null) parts.push(s.daysLeft < 0 ? tx({ en: `${-s.daysLeft} days late`, ar: `متأخرة ${-s.daysLeft} يوم` }) : tx({ en: `${s.daysLeft} days`, ar: `${s.daysLeft} يوم` }));
  if (s.kmLeft !== null) parts.push(s.kmLeft <= 0 ? tx({ en: `${fmtKm(-s.kmLeft, language)} over`, ar: `تجاوز ${fmtKm(-s.kmLeft, language)}` }) : fmtKm(s.kmLeft, language));
  return <span className={s.status === "overdue" ? "font-semibold text-red-600 dark:text-red-400" : ""}>{parts.join(" · ") || "-"}</span>;
}

function Detail({
  m,
  canManage,
  onClose,
  onEdit,
  onComplete,
  onZoom,
}: {
  m: ApiMaintenance;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onZoom: (i: number) => void;
}) {
  const { tx, language } = useT();
  return (
    <Dialog wide title={`${tx({ en: "Maintenance", ar: "صيانة" })} ${m.ref}`} onClose={onClose}>
      <div className="space-y-5 overflow-y-auto px-5 py-5">
        <FileGallery ids={m.invoicePhotos} empty={tx({ en: "No invoice attached", ar: "لا توجد فاتورة مرفقة" })} onZoom={onZoom} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label={tx({ en: "Status", ar: "الحالة" })}>
            <Status code={m.status} />
          </Fact>
          <Fact label={tx({ en: "Request type", ar: "نوع الطلب" })}>
            <span className="flex flex-wrap items-center gap-1.5">
              {tx(APPROVAL_TYPE_LABEL[m.category])}
              <Kind emergency={m.emergency} />
            </span>
          </Fact>
          <Fact label={tx({ en: "Cost", ar: "التكلفة" })}>
            <span className="text-base">{fmtSAR(m.cost, language)}</span>
          </Fact>
          <Fact label={tx({ en: "Date", ar: "التاريخ" })}>{fmtDate(m.date, language)}</Fact>
          <Fact label={tx({ en: "Driver", ar: "السائق" })}>
            <DriverCell driver={m.driver} />
          </Fact>
          <Fact label={tx({ en: "Vehicle", ar: "المركبة" })}>
            <VehicleCell vehicle={m.vehicle} />
          </Fact>
          <Fact label={tx({ en: "Next service date", ar: "موعد الصيانة القادمة" })}>{m.nextServiceDate ? fmtDate(m.nextServiceDate, language) : "-"}</Fact>
          <Fact label={tx({ en: "Next service at", ar: "الصيانة القادمة عند" })}>{m.nextServiceKm === null ? "-" : fmtKm(m.nextServiceKm, language)}</Fact>
          <Fact label={tx({ en: "Workshop / vendor", ar: "الورشة / المورد" })} wide>
            {m.vendor}
          </Fact>
          <Fact label={tx({ en: "Work done", ar: "العمل المنجز" })} wide>
            <span className="font-normal whitespace-pre-line">{m.description}</span>
          </Fact>
        </div>
        {m.status === "completed" && (
          <p className="rounded-lg bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
            {m.completedAt
              ? tx({ en: `Completed on ${fmtDate(m.completedAt, "en")} and locked.`, ar: `اكتمل في ${fmtDate(m.completedAt, "ar")} وتم قفله.` })
              : tx({ en: "Completed and locked.", ar: "مكتمل ومقفل." })}
          </p>
        )}
      </div>
      {canManage && m.status === "inProgress" && (
        <div className="flex justify-end gap-1.5 border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <ActionButton size="md" outline label={tx({ en: "Edit details", ar: "تعديل التفاصيل" })} onClick={onEdit} />
          <ActionButton size="md" tone="good" label={tx({ en: "Complete", ar: "إكمال" })} onClick={onComplete} />
        </div>
      )}
    </Dialog>
  );
}

/** PATCH form: what staff can correct while the record is in progress. */
function EditModal({ m, onClose, onSaved }: { m: ApiMaintenance | null; onClose: () => void; onSaved: (updated: ApiMaintenance) => void }) {
  const { tx, language } = useT();
  const [draft, setDraft] = useState<Draft>({
    description: m?.description ?? "",
    vendor: m?.vendor ?? "",
    cost: m?.cost ?? 0,
    nextServiceDate: m?.nextServiceDate ?? "",
    nextServiceKm: m?.nextServiceKm ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const description = draft.description.trim();
  const vendor = draft.vendor.trim();
  const kmOk = draft.nextServiceKm === null || (Number.isInteger(draft.nextServiceKm) && draft.nextServiceKm >= 0);
  const valid = description.length > 0 && description.length <= DESCRIPTION_MAX && vendor.length > 0 && vendor.length <= VENDOR_MAX && Number.isFinite(draft.cost) && draft.cost >= 0 && kmOk;

  async function save() {
    if (!m || !valid || saving) return;
    const patch: MaintenancePatch = {};
    if (description !== m.description) patch.description = description;
    if (vendor !== m.vendor) patch.vendor = vendor;
    if (draft.cost !== m.cost) patch.cost = draft.cost;
    if ((draft.nextServiceDate || null) !== m.nextServiceDate) patch.nextServiceDate = draft.nextServiceDate || null;
    if (draft.nextServiceKm !== m.nextServiceKm) patch.nextServiceKm = draft.nextServiceKm;
    if (Object.keys(patch).length === 0) return onClose();
    setSaving(true);
    setError(null);
    try {
      onSaved(await api.patch<ApiMaintenance>(`/maintenance/${m.id}`, patch));
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <RecordModal open={!!m} title={m ? tx({ en: `Edit ${m.ref}`, ar: `تعديل ${m.ref}` }) : ""} onClose={saving ? () => {} : onClose} onSave={save} canSave={valid && !saving}>
      {m && (
        <>
          <Field label={tx({ en: "Workshop / vendor", ar: "الورشة / المورد" })}>
            <TextInput value={draft.vendor} onChange={(v) => set({ vendor: v })} />
          </Field>
          <Field label={tx({ en: "Cost", ar: "التكلفة" })}>
            <NumberInput value={draft.cost} onChange={(v) => set({ cost: v })} suffix={language === "ar" ? "ر.س" : "SAR"} />
          </Field>
          <Field label={tx({ en: "Work done", ar: "العمل المنجز" })} wide>
            <TextArea value={draft.description} onChange={(v) => set({ description: v })} />
          </Field>
          <Field label={tx({ en: "Next service date", ar: "موعد الصيانة القادمة" })}>
            <DatePicker value={draft.nextServiceDate} onChange={(v) => set({ nextServiceDate: v })} />
            {draft.nextServiceDate && (
              <button type="button" onClick={() => set({ nextServiceDate: "" })} className="mt-1 text-xs font-semibold text-neutral-500 hover:text-prime-600">
                {tx({ en: "Clear date", ar: "مسح التاريخ" })}
              </button>
            )}
          </Field>
          <Field label={tx({ en: "Next service at (km)", ar: "الصيانة القادمة عند (كم)" })}>
            <NumberInput value={draft.nextServiceKm ?? NaN} onChange={(v) => set({ nextServiceKm: v > 0 ? v : null })} suffix={tx({ en: "km", ar: "كم" })} />
          </Field>
          {(!description || !vendor) && (
            <p role="alert" className="text-xs text-red-600 sm:col-span-2">
              {tx({ en: "Work done and vendor cannot be empty.", ar: "لا يمكن ترك العمل المنجز أو المورد فارغًا." })}
            </p>
          )}
          <p className="text-xs text-neutral-500 sm:col-span-2 dark:text-neutral-400">
            {tx({
              en: "The next service is due by date or km, whichever comes first. The invoice comes from the driver's app and cannot be changed here.",
              ar: "تستحق الصيانة القادمة بالتاريخ أو بالكيلومترات أيهما أسبق. الفاتورة مرسلة من تطبيق السائق ولا يمكن تغييرها هنا.",
            })}
          </p>
          <FormError error={error} />
        </>
      )}
    </RecordModal>
  );
}

export default function MaintenanceLive() {
  const { tx, language } = useT();
  const can = useCan();
  const canManage = can("maintenance:manage");

  // Records
  const [status, setStatus] = useState("");
  const [emergency, setEmergency] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());
  // Next-service table (narrowed by the due cards and the vehicle filter)
  const [due, setDue] = useState("");

  const [detail, setDetail] = useState<ApiMaintenance | null>(null);
  const [editing, setEditing] = useState<ApiMaintenance | null>(null);
  const [completing, setCompleting] = useState<ApiMaintenance | null>(null);
  const [lightbox, setLightbox] = useState<{ ids: string[]; start: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const query = { status, emergency, vehicleId, driverId, from, to, search: q };
  const { items, total, loading, fetching, error, reload } = useApiPage(
    () => api.page<ApiMaintenance>("/maintenance", { ...query, page, pageSize: PAGE_SIZE }),
    JSON.stringify([status, emergency, vehicleId, driverId, from, to, q, page]),
  );
  // Export: the maintenance records for the current filters (not the service schedule), dates as yyyy-mm-dd and costs as plain numbers.
  const exportColumns: ExportColumn<ApiMaintenance>[] = [
    { header: { en: "Ref.", ar: "المرجع" }, value: (m) => m.ref },
    { header: { en: "Date", ar: "التاريخ" }, value: (m) => m.date },
    { header: { en: "Vehicle", ar: "المركبة" }, value: (m) => m.vehicle?.plateNumber },
    { header: { en: "Driver", ar: "السائق" }, value: (m) => (m.driver ? tx(m.driver.name) : "") },
    { header: { en: "Category", ar: "الفئة" }, value: (m) => tx(APPROVAL_TYPE_LABEL[m.category]) },
    { header: { en: "Work done", ar: "العمل المنجز" }, value: (m) => m.description },
    { header: { en: "Workshop / vendor", ar: "الورشة / المورد" }, value: (m) => m.vendor },
    { header: { en: "Cost (SAR)", ar: "التكلفة (ر.س)" }, value: (m) => m.cost },
    { header: { en: "Type", ar: "النوع" }, value: (m) => (m.emergency ? tx({ en: "Emergency", ar: "طارئة" }) : tx({ en: "Planned", ar: "مخططة" })) },
    { header: { en: "Invoice files", ar: "ملفات الفاتورة" }, value: (m) => m.invoicePhotos.length },
    { header: { en: "Status", ar: "الحالة" }, value: (m) => tx(STATUS[m.status].label) },
    { header: { en: "Next service date", ar: "تاريخ الصيانة القادمة" }, value: (m) => m.nextServiceDate },
    { header: { en: "Next service (km)", ar: "الصيانة القادمة (كم)" }, value: (m) => m.nextServiceKm },
  ];
  const onExport = async () => downloadCsv("maintenance", tx, await fetchAllPages<ApiMaintenance>("/maintenance", query), exportColumns);
  const schedule = useApi(() => api.get<ApiServiceDue[]>("/maintenance/schedule", { status: due, vehicleId }), `${due}|${vehicleId}`);
  // The schedule is not paged: the unfiltered list is the source of the due counts.
  const scheduleAll = useApi(() => api.get<ApiServiceDue[]>("/maintenance/schedule"), "all");
  const counts = useApi(async () => {
    const one = (s: string) => api.page<ApiMaintenance>("/maintenance", { status: s, pageSize: 1 }).then((p) => p.total);
    const [inProgress, completed] = await Promise.all([one("inProgress"), one("completed")]);
    return { inProgress, completed };
  }, "counts");
  const { vehicleOptions, driverOptions } = useFleetOptions();

  const closeDetail = useCallback(() => setDetail(null), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const clearToast = useCallback(() => setToast(null), []);

  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  function changed(updated: ApiMaintenance | null, message: string) {
    reload();
    counts.reload();
    schedule.reload();
    scheduleAll.reload();
    if (updated && detail?.id === updated.id) setDetail(updated);
    setToast(message);
  }

  const dueCount = (s: string) => (scheduleAll.data ? scheduleAll.data.filter((i) => i.status === s).length : undefined);
  const dueLabel: Record<string, string> = {
    overdue: tx({ en: "Overdue", ar: "متأخرة" }),
    dueSoon: tx({ en: "Due soon", ar: "تستحق قريبًا" }),
    scheduled: tx({ en: "Scheduled", ar: "مجدولة" }),
  };
  const statusOptions = [
    { value: "inProgress", label: tx({ en: "In progress", ar: "قيد التنفيذ" }) },
    { value: "completed", label: tx({ en: "Completed", ar: "مكتمل" }) },
  ];
  const emergencyOptions = [
    { value: "true", label: tx({ en: "Emergency", ar: "طارئة" }) },
    { value: "false", label: tx({ en: "Planned", ar: "مخططة" }) },
  ];
  const c = counts.data;
  const filtered = Boolean(status || emergency || vehicleId || driverId || from || to || q);
  const rows = schedule.data ?? [];

  return (
    <Page
      moduleKey="maintenance"
      onExport={onExport}
      subtitle={{
        en: "Workshop records drivers submit against approved requests, with invoices and the next service per vehicle.",
        ar: "سجلات الورش التي يرسلها السائقون على الطلبات المعتمدة مع الفواتير وموعد الصيانة القادمة لكل مركبة.",
      }}
      stats={[
        { label: { en: "Service overdue", ar: "صيانة متأخرة" }, value: countText(dueCount("overdue")), tone: "bad", ...toggleCard(due, "overdue", setDue) },
        { label: { en: "Service due soon", ar: "صيانة تستحق قريبًا" }, value: countText(dueCount("dueSoon")), tone: "warn", ...toggleCard(due, "dueSoon", setDue) },
        { label: { en: "In the workshop", ar: "في الورشة" }, value: countText(c?.inProgress), tone: "info", ...toggleCard(status, "inProgress", filter(setStatus)) },
        { label: { en: "Completed", ar: "مكتملة" }, value: countText(c?.completed), tone: "good", ...toggleCard(status, "completed", filter(setStatus)) },
      ]}
    >
      <Block>
        <LiveState loading={schedule.loading} error={schedule.error} onRetry={schedule.reload}>
          <Refreshing on={schedule.fetching && !schedule.loading} />
          <DataTable
            title={tx({ en: "Next service per vehicle", ar: "الصيانة القادمة لكل مركبة" })}
            searchable={false}
            filter={due ? { label: dueLabel[due], onClear: () => setDue("") } : undefined}
            empty={
              due
                ? tx({ en: "No vehicles in this group.", ar: "لا توجد مركبات في هذه الفئة." })
                : tx({ en: "No next service set yet. It comes from the workshop records below.", ar: "لا توجد صيانة قادمة محددة بعد. تأتي من سجلات الورش أدناه." })
            }
            headers={[
              tx({ en: "Vehicle", ar: "المركبة" }),
              tx({ en: "Last service", ar: "آخر صيانة" }),
              tx({ en: "Due date", ar: "تاريخ الاستحقاق" }),
              tx({ en: "Due at", ar: "عند العداد" }),
              tx({ en: "Odometer now", ar: "العداد الحالي" }),
              tx({ en: "Remaining", ar: "المتبقي" }),
              tx({ en: "Status", ar: "الحالة" }),
            ]}
            rows={rows.map((s) => ({
              key: `due-${s.vehicleId}`,
              tint: s.status === "overdue" ? "red" : undefined,
              cells: [
                <VehicleCell key="v" vehicle={s.vehicle} />,
                <span key="t" className="min-w-40 whitespace-normal">{s.task}</span>,
                s.dueDate ? fmtDate(s.dueDate, language) : "-",
                s.dueKm === null ? "-" : fmtKm(s.dueKm, language),
                fmtKm(s.currentKm, language),
                <Remaining key="r" s={s} />,
                <Status key="s" code={s.status} />,
              ],
            }))}
          />
        </LiveState>
      </Block>

      <Block>
        <FilterBar
          search={search}
          onSearch={filter(setSearch)}
          searchPlaceholder={tx({ en: "Search ref, work done or vendor…", ar: "ابحث بالمرجع أو العمل المنجز أو المورد…" })}
          filters={[
            { label: tx({ en: "All statuses", ar: "كل الحالات" }), value: status, onChange: filter(setStatus), options: statusOptions },
            { label: tx({ en: "Planned and emergency", ar: "مخططة وطارئة" }), value: emergency, onChange: filter(setEmergency), options: emergencyOptions },
            { label: tx({ en: "All vehicles", ar: "كل المركبات" }), value: vehicleId, onChange: filter(setVehicleId), options: vehicleOptions },
            { label: tx({ en: "All drivers", ar: "كل السائقين" }), value: driverId, onChange: filter(setDriverId), options: driverOptions },
          ]}
          from={from}
          to={to}
          onFrom={filter(setFrom)}
          onTo={filter(setTo)}
          shown={items.length}
          total={total}
          onClear={() => {
            setStatus("");
            setEmergency("");
            setVehicleId("");
            setDriverId("");
            setFrom("");
            setTo("");
            setSearch("");
            setPage(1);
          }}
        />
      </Block>

      <Block>
        <LiveState loading={loading} error={error} onRetry={reload}>
          <Refreshing on={fetching} />
          <DataTable
            title={tx({ en: "Maintenance records", ar: "سجل الصيانة" })}
            searchable={false}
            empty={
              filtered
                ? tx({ en: "No maintenance records match these filters.", ar: "لا توجد سجلات صيانة مطابقة." })
                : tx({ en: "No maintenance records yet. Drivers submit them after a request is approved.", ar: "لا توجد سجلات صيانة بعد. يرسلها السائقون بعد اعتماد الطلب." })
            }
            headers={[
              tx({ en: "Ref.", ar: "المرجع" }),
              tx({ en: "Date", ar: "التاريخ" }),
              tx({ en: "Vehicle", ar: "المركبة" }),
              tx({ en: "Driver", ar: "السائق" }),
              tx({ en: "Work done", ar: "العمل المنجز" }),
              tx({ en: "Workshop / vendor", ar: "الورشة / المورد" }),
              tx({ en: "Cost", ar: "التكلفة" }),
              tx({ en: "Type", ar: "النوع" }),
              tx({ en: "Invoice", ar: "الفاتورة" }),
              tx({ en: "Status", ar: "الحالة" }),
              "",
            ]}
            rows={items.map((m) => ({
              key: m.id,
              cells: [
                <button key="ref" dir="ltr" onClick={() => setDetail(m)} className="font-semibold text-prime-600 hover:underline dark:text-prime-400">
                  {m.ref}
                </button>,
                fmtDate(m.date, language),
                <VehicleCell key="v" vehicle={m.vehicle} />,
                <DriverCell key="d" driver={m.driver} />,
                <span key="w" className="block min-w-40 whitespace-normal">
                  {m.description}
                  <span className="block text-xs text-neutral-500">{tx(APPROVAL_TYPE_LABEL[m.category])}</span>
                </span>,
                m.vendor,
                <span key="c" className="font-semibold text-foreground">{fmtSAR(m.cost, language)}</span>,
                <Kind key="k" emergency={m.emergency} />,
                <FileThumbs key="inv" ids={m.invoicePhotos} onOpen={() => setLightbox({ ids: m.invoicePhotos, start: 0 })} />,
                <Status key="s" code={m.status} />,
                canManage && m.status === "inProgress" ? (
                  <span key="a" className="flex items-center gap-1">
                    <EditButton onClick={() => setEditing(m)} label={tx({ en: `Edit ${m.ref}`, ar: `تعديل ${m.ref}` })} />
                    <ActionButton tone="good" label={tx({ en: "Complete", ar: "إكمال" })} onClick={() => setCompleting(m)} />
                  </span>
                ) : (
                  <button key="o" onClick={() => setDetail(m)} className="text-xs font-semibold text-prime-600 hover:underline dark:text-prime-400">
                    {tx({ en: "View", ar: "عرض" })}
                  </button>
                ),
              ],
            }))}
          />
          <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </LiveState>
      </Block>

      <AnimatePresence>
        {detail && (
          <Detail
            key="detail"
            m={detail}
            canManage={canManage}
            onClose={closeDetail}
            onEdit={() => setEditing(detail)}
            onComplete={() => setCompleting(detail)}
            onZoom={(i) => setLightbox({ ids: detail.invoicePhotos, start: i })}
          />
        )}
        {completing && (
          <ActionDialog
            key={`complete-${completing.id}`}
            title={tx({ en: "Complete maintenance", ar: "إكمال الصيانة" })}
            summary={
              <>
                <span dir="ltr" className="font-semibold text-foreground">{completing.ref}</span>
                {completing.vehicle && (
                  <>
                    {" - "}
                    <span dir="ltr">{completing.vehicle.plateNumber}</span>
                  </>
                )}
                {" : "}
                <span className="font-semibold text-foreground">{fmtSAR(completing.cost, language)}</span>
              </>
            }
            note={tx({
              en: "Confirms the work and invoice, locks the record and returns the vehicle to active unless something else keeps it off the road. Close the approval request afterwards in Approvals.",
              ar: "يؤكد العمل والفاتورة ويقفل السجل ويعيد المركبة إلى الخدمة ما لم يمنع ذلك شيء آخر. أغلق طلب الموافقة بعد ذلك من صفحة الموافقات.",
            })}
            confirm={tx({ en: "Complete", ar: "إكمال" })}
            tone="good"
            run={() => api.post<ApiMaintenance>(`/maintenance/${completing.id}/complete`)}
            onClose={() => setCompleting(null)}
            onDone={(result, stale) => {
              if (stale) {
                reload();
                counts.reload();
                return;
              }
              setCompleting(null);
              changed(result as ApiMaintenance, tx({ en: "Maintenance completed", ar: "تم إكمال الصيانة" }));
            }}
          />
        )}
        {lightbox && <FileLightbox key="lb" ids={lightbox.ids} start={lightbox.start} onClose={closeLightbox} />}
      </AnimatePresence>
      <EditModal
        key={editing?.id ?? "none"}
        m={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setEditing(null);
          changed(updated, tx({ en: "Maintenance record updated", ar: "تم تحديث سجل الصيانة" }));
        }}
      />
      <Toast message={toast} onDone={clearToast} />
    </Page>
  );
}
