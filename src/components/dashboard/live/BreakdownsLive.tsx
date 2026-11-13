"use client";

// Breakdowns: roadside breakdowns drivers report from the mobile app (which
// takes the vehicle off the road). Live data from GET /breakdowns; the fleet
// team starts and closes them with "breakdowns:manage". No create here.

import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import DataTable, { Badge } from "@/components/dashboard/DataTable";
import { Block, Page, Status, toggleCard } from "@/components/dashboard/ModulePage";
import { FilterBar, Toast } from "@/components/dashboard/RecordTools";
import { FileGallery, FileLightbox, FileThumbs } from "@/components/dashboard/live/Evidence";
import { ActionButton, ActionDialog, Dialog, DriverCell, Fact, LiveState, Pager, Refreshing, VehicleCell, countText, useDebounced, useFleetOptions } from "@/components/dashboard/live/LiveKit";
import { api } from "@/lib/api/client";
import { useApi, useApiPage } from "@/lib/api/hooks";
import { useCan } from "@/lib/api/session";
import type { ApiBreakdown } from "@/lib/api/types";
import { downloadCsv, fetchAllPages, type ExportColumn } from "@/lib/export";
import { STATUS, fmtDate } from "@/lib/fleet-data";
import { useT } from "@/lib/translations";

const PAGE_SIZE = 20;
const RESOLUTION_MAX = 1000;

type Action = { b: ApiBreakdown; kind: "start" | "close" };

function Severity({ major }: { major: boolean }) {
  const { tx } = useT();
  return major ? <Badge label={tx({ en: "Major", ar: "كبير" })} tone="bad" /> : <Badge label={tx({ en: "Minor", ar: "بسيط" })} tone="neutral" />;
}

/** Start / Close for the breakdown's current status. */
function Actions({ b, onAct, size = "sm" }: { b: ApiBreakdown; onAct: (a: Action) => void; size?: "sm" | "md" }) {
  const { tx } = useT();
  if (b.status === "closed") return null;
  return (
    <span className="flex gap-1.5">
      {b.status === "open" && <ActionButton size={size} tone="info" label={tx({ en: "Start", ar: "بدء المعالجة" })} onClick={() => onAct({ b, kind: "start" })} />}
      <ActionButton size={size} tone="good" outline={b.status === "open"} label={size === "md" ? tx({ en: "Close breakdown", ar: "إغلاق العطل" }) : tx({ en: "Close", ar: "إغلاق" })} onClick={() => onAct({ b, kind: "close" })} />
    </span>
  );
}

function Detail({ b, canManage, onClose, onAct, onZoom }: { b: ApiBreakdown; canManage: boolean; onClose: () => void; onAct: (a: Action) => void; onZoom: (i: number) => void }) {
  const { tx, language } = useT();
  return (
    <Dialog wide title={`${tx({ en: "Breakdown", ar: "عطل" })} ${b.ref}`} onClose={onClose}>
      <div className="space-y-5 overflow-y-auto px-5 py-5">
        <FileGallery ids={b.photos} empty={tx({ en: "No photos attached", ar: "لا توجد صور مرفقة" })} onZoom={onZoom} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label={tx({ en: "Status", ar: "الحالة" })}>
            <Status code={b.status} />
          </Fact>
          <Fact label={tx({ en: "Severity", ar: "الخطورة" })}>
            <Severity major={b.major} />
          </Fact>
          <Fact label={tx({ en: "Reported on", ar: "تاريخ البلاغ" })}>{fmtDate(b.date, language)}</Fact>
          {b.closedAt && <Fact label={tx({ en: "Closed on", ar: "تاريخ الإغلاق" })}>{fmtDate(b.closedAt, language)}</Fact>}
          <Fact label={tx({ en: "Driver", ar: "السائق" })}>
            <DriverCell driver={b.driver} />
          </Fact>
          <Fact label={tx({ en: "Vehicle", ar: "المركبة" })}>
            <VehicleCell vehicle={b.vehicle} />
          </Fact>
          <Fact label={tx({ en: "Location", ar: "الموقع" })} wide>
            {b.location}
          </Fact>
          <Fact label={tx({ en: "What happened", ar: "وصف العطل" })} wide>
            <span className="font-normal whitespace-pre-line">{b.description}</span>
          </Fact>
          {b.resolution && (
            <Fact label={tx({ en: "Resolution", ar: "طريقة المعالجة" })} wide>
              <span className="font-normal whitespace-pre-line">{b.resolution}</span>
            </Fact>
          )}
        </div>
      </div>
      {canManage && b.status !== "closed" && (
        <div className="flex justify-end border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <Actions b={b} onAct={onAct} size="md" />
        </div>
      )}
    </Dialog>
  );
}

export default function BreakdownsLive() {
  const { tx, language } = useT();
  const can = useCan();
  const canManage = can("breakdowns:manage");

  const [status, setStatus] = useState("");
  const [major, setMajor] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  const [detail, setDetail] = useState<ApiBreakdown | null>(null);
  const [lightbox, setLightbox] = useState<{ ids: string[]; start: number } | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const query = { status, major, vehicleId, driverId, from, to, search: q };
  const { items, total, loading, fetching, error, reload } = useApiPage(
    () => api.page<ApiBreakdown>("/breakdowns", { ...query, page, pageSize: PAGE_SIZE }),
    JSON.stringify([status, major, vehicleId, driverId, from, to, q, page]),
  );
  const { vehicleOptions, driverOptions } = useFleetOptions();

  // Export: every breakdown for the current filters, dates as yyyy-mm-dd.
  const exportColumns: ExportColumn<ApiBreakdown>[] = [
    { header: { en: "Ref.", ar: "المرجع" }, value: (b) => b.ref },
    { header: { en: "Date", ar: "التاريخ" }, value: (b) => b.date },
    { header: { en: "Vehicle", ar: "المركبة" }, value: (b) => b.vehicle?.plateNumber },
    { header: { en: "Driver", ar: "السائق" }, value: (b) => (b.driver ? tx(b.driver.name) : "") },
    { header: { en: "Location", ar: "الموقع" }, value: (b) => b.location },
    { header: { en: "Description", ar: "الوصف" }, value: (b) => b.description },
    { header: { en: "Severity", ar: "الخطورة" }, value: (b) => (b.major ? tx({ en: "Major", ar: "كبير" }) : tx({ en: "Minor", ar: "بسيط" })) },
    { header: { en: "Photos", ar: "الصور" }, value: (b) => b.photos.length },
    { header: { en: "Status", ar: "الحالة" }, value: (b) => tx(STATUS[b.status].label) },
    { header: { en: "Resolution", ar: "الحل" }, value: (b) => b.resolution },
    { header: { en: "Closed on", ar: "تاريخ الإغلاق" }, value: (b) => b.closedAt?.slice(0, 10) },
  ];
  const onExport = async () => downloadCsv("breakdowns", tx, await fetchAllPages<ApiBreakdown>("/breakdowns", query), exportColumns);
  const counts = useApi(async () => {
    const one = (query: Record<string, string>) => api.page<ApiBreakdown>("/breakdowns", { ...query, pageSize: 1 }).then((p) => p.total);
    const [open, inProgress, closed, majorOpen] = await Promise.all([one({ status: "open" }), one({ status: "inProgress" }), one({ status: "closed" }), one({ major: "true" })]);
    return { open, inProgress, closed, major: majorOpen };
  }, "counts");
  const reloadCounts = counts.reload;

  const closeDetail = useCallback(() => setDetail(null), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const clearToast = useCallback(() => setToast(null), []);

  // Any filter change goes back to the first page.
  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  function done(kind: Action["kind"], result: unknown, stale: boolean) {
    reload();
    reloadCounts();
    if (stale) return; // keep the dialog open on the friendly 409 text
    setAction(null);
    if (result && detail?.id === (result as ApiBreakdown).id) setDetail(result as ApiBreakdown);
    setToast(kind === "start" ? tx({ en: "Breakdown in progress", ar: "بدأت معالجة العطل" }) : tx({ en: "Breakdown closed", ar: "تم إغلاق العطل" }));
  }

  const statusOptions = [
    { value: "open", label: tx({ en: "Open", ar: "مفتوح" }) },
    { value: "inProgress", label: tx({ en: "In progress", ar: "قيد التنفيذ" }) },
    { value: "closed", label: tx({ en: "Closed", ar: "مغلق" }) },
  ];
  const majorOptions = [
    { value: "true", label: tx({ en: "Major", ar: "كبير" }) },
    { value: "false", label: tx({ en: "Minor", ar: "بسيط" }) },
  ];
  const c = counts.data;
  const filtered = Boolean(status || major || vehicleId || driverId || from || to || q);

  return (
    <Page
      moduleKey="breakdowns"
      onExport={onExport}
      subtitle={{ en: "Roadside breakdowns reported by drivers from the mobile app.", ar: "الأعطال على الطريق المبلغ عنها من السائقين عبر تطبيق الجوال." }}
      stats={[
        { label: { en: "Open", ar: "مفتوحة" }, value: countText(c?.open), tone: "bad", ...toggleCard(status, "open", filter(setStatus)) },
        { label: { en: "In progress", ar: "قيد المعالجة" }, value: countText(c?.inProgress), tone: "warn", ...toggleCard(status, "inProgress", filter(setStatus)) },
        { label: { en: "Major breakdowns", ar: "أعطال كبيرة" }, value: countText(c?.major), ...toggleCard(major, "true", filter(setMajor)) },
        { label: { en: "Closed", ar: "مغلقة" }, value: countText(c?.closed), tone: "good", ...toggleCard(status, "closed", filter(setStatus)) },
      ]}
    >
      <Block>
        <FilterBar
          search={search}
          onSearch={filter(setSearch)}
          searchPlaceholder={tx({ en: "Search ref, location or description…", ar: "ابحث بالمرجع أو الموقع أو الوصف…" })}
          filters={[
            { label: tx({ en: "All statuses", ar: "كل الحالات" }), value: status, onChange: filter(setStatus), options: statusOptions },
            { label: tx({ en: "Any severity", ar: "كل درجات الخطورة" }), value: major, onChange: filter(setMajor), options: majorOptions },
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
            setMajor("");
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
            title={tx({ en: "Breakdown log", ar: "سجل الأعطال" })}
            searchable={false}
            empty={filtered ? tx({ en: "No breakdowns match these filters.", ar: "لا توجد أعطال مطابقة." }) : tx({ en: "No breakdowns reported. All vehicles are on the road.", ar: "لا توجد أعطال مبلغ عنها. جميع المركبات في الخدمة." })}
            headers={[
              tx({ en: "Ref.", ar: "المرجع" }),
              tx({ en: "Date", ar: "التاريخ" }),
              tx({ en: "Vehicle", ar: "المركبة" }),
              tx({ en: "Driver", ar: "السائق" }),
              tx({ en: "Location", ar: "الموقع" }),
              tx({ en: "Description", ar: "الوصف" }),
              tx({ en: "Severity", ar: "الخطورة" }),
              tx({ en: "Photos", ar: "الصور" }),
              tx({ en: "Status", ar: "الحالة" }),
              "",
            ]}
            rows={items.map((b) => ({
              key: b.id,
              cells: [
                <button key="ref" dir="ltr" onClick={() => setDetail(b)} className="font-semibold text-prime-600 hover:underline dark:text-prime-400">
                  {b.ref}
                </button>,
                fmtDate(b.date, language),
                <VehicleCell key="v" vehicle={b.vehicle} />,
                <DriverCell key="d" driver={b.driver} />,
                b.location,
                <span key="desc" className="line-clamp-2 min-w-48 whitespace-normal">{b.description}</span>,
                <Severity key="m" major={b.major} />,
                <FileThumbs key="ph" ids={b.photos} onOpen={() => setLightbox({ ids: b.photos, start: 0 })} />,
                <Status key="s" code={b.status} />,
                canManage && b.status !== "closed" ? (
                  <Actions key="a" b={b} onAct={setAction} />
                ) : (
                  <button key="o" onClick={() => setDetail(b)} className="text-xs font-semibold text-prime-600 hover:underline dark:text-prime-400">
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
        {detail && <Detail key="detail" b={detail} canManage={canManage} onClose={closeDetail} onAct={setAction} onZoom={(i) => setLightbox({ ids: detail.photos, start: i })} />}
        {action && (
          <ActionDialog
            key={`${action.kind}-${action.b.id}`}
            title={action.kind === "start" ? tx({ en: "Start handling", ar: "بدء معالجة العطل" }) : tx({ en: "Close breakdown", ar: "إغلاق العطل" })}
            summary={
              <>
                <span dir="ltr" className="font-semibold text-foreground">{action.b.ref}</span>
                {action.b.vehicle && (
                  <>
                    {" - "}
                    <span dir="ltr">{action.b.vehicle.plateNumber}</span>
                  </>
                )}
                {" : "}
                {action.b.location}
              </>
            }
            note={
              action.kind === "start"
                ? tx({ en: "Marks the breakdown as being handled by the fleet team.", ar: "يتم تعليم العطل بأنه قيد المعالجة من فريق الأسطول." })
                : tx({
                    en: "Closing returns the vehicle to active, unless another breakdown is open or it is in maintenance. A closed breakdown cannot be reopened.",
                    ar: "يعيد الإغلاق المركبة إلى الخدمة ما لم يكن هناك عطل آخر مفتوح أو صيانة جارية. لا يمكن إعادة فتح العطل بعد إغلاقه.",
                  })
            }
            confirm={action.kind === "start" ? tx({ en: "Start", ar: "بدء المعالجة" }) : tx({ en: "Close breakdown", ar: "إغلاق العطل" })}
            tone={action.kind === "start" ? "info" : "good"}
            text={
              action.kind === "close"
                ? { label: tx({ en: "Resolution (optional)", ar: "طريقة المعالجة (اختياري)" }), hint: tx({ en: "How it was fixed, e.g. towed to the workshop.", ar: "كيف تمت المعالجة، مثل السحب إلى الورشة." }), max: RESOLUTION_MAX }
                : undefined
            }
            run={(text) =>
              action.kind === "start" ? api.post<ApiBreakdown>(`/breakdowns/${action.b.id}/start`) : api.post<ApiBreakdown>(`/breakdowns/${action.b.id}/close`, text ? { resolution: text } : {})
            }
            onClose={() => setAction(null)}
            onDone={(result, stale) => done(action.kind, result, stale)}
          />
        )}
        {lightbox && <FileLightbox key="lb" ids={lightbox.ids} start={lightbox.start} onClose={closeLightbox} />}
      </AnimatePresence>
      <Toast message={toast} onDone={clearToast} />
    </Page>
  );
}
