"use client";

// Accidents: reported by drivers from the mobile app with scene photos and the
// Najm / police reference. Live data from GET /accidents; the fleet team adds
// cost and notes, then starts and closes them ("accidents:manage"). A closed
// accident is locked. No create here.

import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import DataTable from "@/components/dashboard/DataTable";
import { Block, Page, Status, toggleCard } from "@/components/dashboard/ModulePage";
import { EditButton, Field, FilterBar, NumberInput, RecordModal, TextArea, TextInput, Toast } from "@/components/dashboard/RecordTools";
import { FileGallery, FileLightbox, FileThumbs } from "@/components/dashboard/live/Evidence";
import {
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
import type { AccidentPatch, ApiAccident } from "@/lib/api/types";
import { downloadCsv, fetchAllPages, type ExportColumn } from "@/lib/export";
import { STATUS, fmtDate, fmtSAR } from "@/lib/fleet-data";
import { useT } from "@/lib/translations";

const PAGE_SIZE = 20;
const TEXT_MAX = 1000;
const REFERENCE_MAX = 100;

type Action = { a: ApiAccident; kind: "start" | "close" };
type Draft = { description: string; reference: string; cost: number | null; notes: string };

function Actions({ a, onAct, onEdit, size = "sm" }: { a: ApiAccident; onAct: (x: Action) => void; onEdit: () => void; size?: "sm" | "md" }) {
  const { tx } = useT();
  if (a.status === "closed") return null;
  return (
    <span className="flex items-center gap-1.5">
      {size === "md" && <ActionButton size={size} outline label={tx({ en: "Edit details", ar: "تعديل التفاصيل" })} onClick={onEdit} />}
      {a.status === "open" && <ActionButton size={size} tone="info" label={tx({ en: "Start", ar: "بدء المعالجة" })} onClick={() => onAct({ a, kind: "start" })} />}
      <ActionButton size={size} tone="good" outline={a.status === "open"} label={size === "md" ? tx({ en: "Close accident", ar: "إغلاق الحادث" }) : tx({ en: "Close", ar: "إغلاق" })} onClick={() => onAct({ a, kind: "close" })} />
    </span>
  );
}

function Detail({
  a,
  canManage,
  onClose,
  onAct,
  onEdit,
  onZoom,
}: {
  a: ApiAccident;
  canManage: boolean;
  onClose: () => void;
  onAct: (x: Action) => void;
  onEdit: () => void;
  onZoom: (i: number) => void;
}) {
  const { tx, language } = useT();
  return (
    <Dialog wide title={`${tx({ en: "Accident", ar: "حادث" })} ${a.ref}`} onClose={onClose}>
      <div className="space-y-5 overflow-y-auto px-5 py-5">
        <FileGallery ids={a.photos} empty={tx({ en: "No photos attached", ar: "لا توجد صور مرفقة" })} onZoom={onZoom} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label={tx({ en: "Status", ar: "الحالة" })}>
            <Status code={a.status} />
          </Fact>
          <Fact label={tx({ en: "Accident date", ar: "تاريخ الحادث" })}>{fmtDate(a.date, language)}</Fact>
          <Fact label={tx({ en: "Najm / police report", ar: "تقرير نجم / الشرطة" })}>
            <span dir="ltr" className="font-mono text-xs">{a.reference || "-"}</span>
          </Fact>
          <Fact label={tx({ en: "Repair cost", ar: "تكلفة الإصلاح" })}>{a.cost === null ? "-" : fmtSAR(a.cost, language)}</Fact>
          <Fact label={tx({ en: "Driver", ar: "السائق" })}>
            <DriverCell driver={a.driver} />
          </Fact>
          <Fact label={tx({ en: "Vehicle", ar: "المركبة" })}>
            <VehicleCell vehicle={a.vehicle} />
          </Fact>
          {a.closedAt && <Fact label={tx({ en: "Closed on", ar: "تاريخ الإغلاق" })}>{fmtDate(a.closedAt, language)}</Fact>}
          <Fact label={tx({ en: "Location", ar: "الموقع" })} wide>
            {a.location}
          </Fact>
          <Fact label={tx({ en: "What happened", ar: "وصف الحادث" })} wide>
            <span className="font-normal whitespace-pre-line">{a.description}</span>
          </Fact>
          {a.notes && (
            <Fact label={tx({ en: "Fleet team notes", ar: "ملاحظات فريق الأسطول" })} wide>
              <span className="font-normal whitespace-pre-line">{a.notes}</span>
            </Fact>
          )}
        </div>
        {a.status === "closed" && (
          <p className="rounded-lg bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
            {tx({ en: "This accident is closed and locked.", ar: "هذا الحادث مغلق ومقفل." })}
          </p>
        )}
      </div>
      {canManage && a.status !== "closed" && (
        <div className="flex justify-end border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <Actions a={a} onAct={onAct} onEdit={onEdit} size="md" />
        </div>
      )}
    </Dialog>
  );
}

/** PATCH form: description, Najm reference, cost and notes, while the accident is not closed. */
function EditModal({ a, onClose, onSaved }: { a: ApiAccident | null; onClose: () => void; onSaved: (updated: ApiAccident) => void }) {
  const { tx, language } = useT();
  const [draft, setDraft] = useState<Draft>({ description: a?.description ?? "", reference: a?.reference ?? "", cost: a?.cost ?? null, notes: a?.notes ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const description = draft.description.trim();
  const reference = draft.reference.trim();
  const notes = draft.notes.trim();
  const valid = description.length > 0 && description.length <= TEXT_MAX && reference.length <= REFERENCE_MAX && notes.length <= TEXT_MAX && (draft.cost === null || draft.cost >= 0);

  async function save() {
    if (!a || !valid || saving) return;
    // Send only what changed; empty optional fields clear to null.
    const patch: AccidentPatch = {};
    if (description !== a.description) patch.description = description;
    if ((reference || null) !== a.reference) patch.reference = reference || null;
    if (draft.cost !== a.cost) patch.cost = draft.cost;
    if ((notes || null) !== a.notes) patch.notes = notes || null;
    if (Object.keys(patch).length === 0) return onClose();
    setSaving(true);
    setError(null);
    try {
      onSaved(await api.patch<ApiAccident>(`/accidents/${a.id}`, patch));
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <RecordModal open={!!a} title={a ? tx({ en: `Edit ${a.ref}`, ar: `تعديل ${a.ref}` }) : ""} onClose={saving ? () => {} : onClose} onSave={save} canSave={valid && !saving}>
      {a && (
        <>
          <Field label={tx({ en: "Najm / police report no.", ar: "رقم تقرير نجم / الشرطة" })}>
            <TextInput value={draft.reference} onChange={(v) => set({ reference: v })} placeholder="NJM-2026-000000" dir="ltr" />
          </Field>
          <Field label={tx({ en: "Repair cost", ar: "تكلفة الإصلاح" })}>
            <NumberInput value={draft.cost ?? NaN} onChange={(v) => set({ cost: Number.isFinite(v) ? v : null })} suffix={language === "ar" ? "ر.س" : "SAR"} />
          </Field>
          <Field label={tx({ en: "Description", ar: "الوصف" })} wide>
            <TextArea value={draft.description} onChange={(v) => set({ description: v })} />
          </Field>
          <Field label={tx({ en: "Fleet team notes", ar: "ملاحظات فريق الأسطول" })} wide>
            <TextArea value={draft.notes} onChange={(v) => set({ notes: v })} />
          </Field>
          {!description && (
            <p role="alert" className="text-xs text-red-600 sm:col-span-2">
              {tx({ en: "The description cannot be empty.", ar: "لا يمكن أن يكون الوصف فارغًا." })}
            </p>
          )}
          <p className="text-xs text-neutral-500 sm:col-span-2 dark:text-neutral-400">
            {tx({ en: "Photos come from the driver's app and cannot be changed here.", ar: "الصور مرسلة من تطبيق السائق ولا يمكن تغييرها هنا." })}
          </p>
          <FormError error={error} />
        </>
      )}
    </RecordModal>
  );
}

export default function AccidentsLive() {
  const { tx, language } = useT();
  const can = useCan();
  const canManage = can("accidents:manage");

  const [status, setStatus] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  const [detail, setDetail] = useState<ApiAccident | null>(null);
  const [editing, setEditing] = useState<ApiAccident | null>(null);
  const [lightbox, setLightbox] = useState<{ ids: string[]; start: number } | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const query = { status, vehicleId, driverId, from, to, search: q };
  const { items, total, loading, fetching, error, reload } = useApiPage(
    () => api.page<ApiAccident>("/accidents", { ...query, page, pageSize: PAGE_SIZE }),
    JSON.stringify([status, vehicleId, driverId, from, to, q, page]),
  );
  const { vehicleOptions, driverOptions } = useFleetOptions();

  // Export: every accident for the current filters, dates as yyyy-mm-dd and cost as a plain number.
  const exportColumns: ExportColumn<ApiAccident>[] = [
    { header: { en: "Ref.", ar: "المرجع" }, value: (a) => a.ref },
    { header: { en: "Date", ar: "التاريخ" }, value: (a) => a.date },
    { header: { en: "Vehicle", ar: "المركبة" }, value: (a) => a.vehicle?.plateNumber },
    { header: { en: "Driver", ar: "السائق" }, value: (a) => (a.driver ? tx(a.driver.name) : "") },
    { header: { en: "Location", ar: "الموقع" }, value: (a) => a.location },
    { header: { en: "Description", ar: "الوصف" }, value: (a) => a.description },
    { header: { en: "Photos", ar: "الصور" }, value: (a) => a.photos.length },
    { header: { en: "Najm report", ar: "تقرير نجم" }, value: (a) => a.reference },
    { header: { en: "Cost (SAR)", ar: "التكلفة (ر.س)" }, value: (a) => a.cost },
    { header: { en: "Status", ar: "الحالة" }, value: (a) => tx(STATUS[a.status].label) },
    { header: { en: "Notes", ar: "ملاحظات" }, value: (a) => a.notes },
  ];
  const onExport = async () => downloadCsv("accidents", tx, await fetchAllPages<ApiAccident>("/accidents", query), exportColumns);
  const counts = useApi(async () => {
    const one = (s: string) => api.page<ApiAccident>("/accidents", { status: s, pageSize: 1 }).then((p) => p.total);
    const [open, inProgress, closed, all] = await Promise.all([one("open"), one("inProgress"), one("closed"), one("")]);
    return { open, inProgress, closed, all };
  }, "counts");
  const reloadCounts = counts.reload;

  const closeDetail = useCallback(() => setDetail(null), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const clearToast = useCallback(() => setToast(null), []);

  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  function changed(updated: ApiAccident | null, message: string) {
    reload();
    reloadCounts();
    if (updated && detail?.id === updated.id) setDetail(updated);
    setToast(message);
  }

  const statusOptions = [
    { value: "open", label: tx({ en: "Open", ar: "مفتوح" }) },
    { value: "inProgress", label: tx({ en: "In progress", ar: "قيد التنفيذ" }) },
    { value: "closed", label: tx({ en: "Closed", ar: "مغلق" }) },
  ];
  const c = counts.data;
  const filtered = Boolean(status || vehicleId || driverId || from || to || q);

  return (
    <Page
      moduleKey="accidents"
      onExport={onExport}
      subtitle={{ en: "Accidents reported by drivers, with location, Najm/police reference, costs and photos.", ar: "الحوادث المبلغ عنها من السائقين مع الموقع ومرجع نجم أو الشرطة والتكاليف والصور." }}
      stats={[
        { label: { en: "Open", ar: "مفتوحة" }, value: countText(c?.open), tone: "bad", ...toggleCard(status, "open", filter(setStatus)) },
        { label: { en: "In progress", ar: "قيد المعالجة" }, value: countText(c?.inProgress), tone: "warn", ...toggleCard(status, "inProgress", filter(setStatus)) },
        { label: { en: "Closed", ar: "مغلقة" }, value: countText(c?.closed), tone: "good", ...toggleCard(status, "closed", filter(setStatus)) },
        { label: { en: "All accidents", ar: "كل الحوادث" }, value: countText(c?.all), onClick: () => filter(setStatus)(""), active: false },
      ]}
    >
      <Block>
        <FilterBar
          search={search}
          onSearch={filter(setSearch)}
          searchPlaceholder={tx({ en: "Search ref, location, Najm no. or description…", ar: "ابحث بالمرجع أو الموقع أو رقم نجم أو الوصف…" })}
          filters={[
            { label: tx({ en: "All statuses", ar: "كل الحالات" }), value: status, onChange: filter(setStatus), options: statusOptions },
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
            title={tx({ en: "Accident log", ar: "سجل الحوادث" })}
            searchable={false}
            empty={filtered ? tx({ en: "No accidents match these filters.", ar: "لا توجد حوادث مطابقة لعوامل التصفية." }) : tx({ en: "No accidents reported.", ar: "لا توجد حوادث مبلغ عنها." })}
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
            rows={items.map((a) => ({
              key: a.id,
              cells: [
                <button key="ref" dir="ltr" onClick={() => setDetail(a)} className="font-semibold text-prime-600 hover:underline dark:text-prime-400">
                  {a.ref}
                </button>,
                fmtDate(a.date, language),
                <VehicleCell key="v" vehicle={a.vehicle} />,
                <DriverCell key="d" driver={a.driver} />,
                a.location,
                <span key="desc" className="line-clamp-2 min-w-48 whitespace-normal">{a.description}</span>,
                <FileThumbs key="ph" ids={a.photos} onOpen={() => setLightbox({ ids: a.photos, start: 0 })} />,
                <span key="r" dir="ltr" className="font-mono text-xs">{a.reference || "-"}</span>,
                a.cost === null ? "-" : fmtSAR(a.cost, language),
                <Status key="s" code={a.status} />,
                canManage && a.status !== "closed" ? (
                  <span key="a" className="flex items-center gap-1">
                    <EditButton onClick={() => setEditing(a)} label={tx({ en: `Edit ${a.ref}`, ar: `تعديل ${a.ref}` })} />
                    <Actions a={a} onAct={setAction} onEdit={() => setEditing(a)} />
                  </span>
                ) : (
                  <button key="o" onClick={() => setDetail(a)} className="text-xs font-semibold text-prime-600 hover:underline dark:text-prime-400">
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
          <Detail key="detail" a={detail} canManage={canManage} onClose={closeDetail} onAct={setAction} onEdit={() => setEditing(detail)} onZoom={(i) => setLightbox({ ids: detail.photos, start: i })} />
        )}
        {action && (
          <ActionDialog
            key={`${action.kind}-${action.a.id}`}
            title={action.kind === "start" ? tx({ en: "Start handling", ar: "بدء معالجة الحادث" }) : tx({ en: "Close accident", ar: "إغلاق الحادث" })}
            summary={
              <>
                <span dir="ltr" className="font-semibold text-foreground">{action.a.ref}</span>
                {action.a.vehicle && (
                  <>
                    {" - "}
                    <span dir="ltr">{action.a.vehicle.plateNumber}</span>
                  </>
                )}
                {" : "}
                {action.a.location}
              </>
            }
            note={
              action.kind === "start"
                ? tx({ en: "Marks the accident as being handled by the fleet team.", ar: "يتم تعليم الحادث بأنه قيد المعالجة من فريق الأسطول." })
                : tx({ en: "A closed accident is locked: its cost, reference and notes can no longer change.", ar: "يُقفل الحادث بعد إغلاقه: لا يمكن بعدها تعديل التكلفة أو المرجع أو الملاحظات." })
            }
            confirm={action.kind === "start" ? tx({ en: "Start", ar: "بدء المعالجة" }) : tx({ en: "Close accident", ar: "إغلاق الحادث" })}
            tone={action.kind === "start" ? "info" : "good"}
            run={() => api.post<ApiAccident>(`/accidents/${action.a.id}/${action.kind}`)}
            onClose={() => setAction(null)}
            onDone={(result, stale) => {
              if (stale) {
                reload();
                reloadCounts();
                return;
              }
              setAction(null);
              changed(result as ApiAccident, action.kind === "start" ? tx({ en: "Accident in progress", ar: "بدأت معالجة الحادث" }) : tx({ en: "Accident closed", ar: "تم إغلاق الحادث" }));
            }}
          />
        )}
        {lightbox && <FileLightbox key="lb" ids={lightbox.ids} start={lightbox.start} onClose={closeLightbox} />}
      </AnimatePresence>
      <EditModal
        key={editing?.id ?? "none"}
        a={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setEditing(null);
          changed(updated, tx({ en: "Accident updated", ar: "تم تحديث الحادث" }));
        }}
      />
      <Toast message={toast} onDone={clearToast} />
    </Page>
  );
}
