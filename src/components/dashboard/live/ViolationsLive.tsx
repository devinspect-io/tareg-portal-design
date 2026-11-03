"use client";

// Traffic violations: fines drivers report from the mobile app with a photo
// of the ticket. Live data from GET /violations; "violations:manage" marks a
// fine as paid. The record does not decide who pays. No create here.

import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import DataTable from "@/components/dashboard/DataTable";
import { Block, Page, Status, toggleCard } from "@/components/dashboard/ModulePage";
import { FilterBar, Toast } from "@/components/dashboard/RecordTools";
import { FileGallery, FileLightbox, FileThumbs } from "@/components/dashboard/live/Evidence";
import { ActionButton, ActionDialog, Dialog, DriverCell, Fact, LiveState, Pager, Refreshing, VehicleCell, countText, useDebounced, useFleetOptions } from "@/components/dashboard/live/LiveKit";
import { api } from "@/lib/api/client";
import { useApi, useApiPage } from "@/lib/api/hooks";
import { useCan } from "@/lib/api/session";
import type { ApiViolation } from "@/lib/api/types";
import { fmtDate, fmtSAR } from "@/lib/fleet-data";
import { useT } from "@/lib/translations";

const PAGE_SIZE = 20;

function Detail({ v, canManage, onClose, onPay, onZoom }: { v: ApiViolation; canManage: boolean; onClose: () => void; onPay: () => void; onZoom: (i: number) => void }) {
  const { tx, language } = useT();
  return (
    <Dialog wide title={`${tx({ en: "Violation", ar: "مخالفة" })} ${v.ref}`} onClose={onClose}>
      <div className="space-y-5 overflow-y-auto px-5 py-5">
        <FileGallery ids={v.photos} empty={tx({ en: "No ticket photo attached", ar: "لا توجد صورة للمخالفة" })} onZoom={onZoom} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label={tx({ en: "Status", ar: "الحالة" })}>
            <Status code={v.status} />
          </Fact>
          <Fact label={tx({ en: "Fine", ar: "الغرامة" })}>
            <span className="text-base">{fmtSAR(v.fine, language)}</span>
          </Fact>
          <Fact label={tx({ en: "Violation date", ar: "تاريخ المخالفة" })}>{fmtDate(v.date, language)}</Fact>
          {v.paidAt && <Fact label={tx({ en: "Paid on", ar: "تاريخ الدفع" })}>{fmtDate(v.paidAt, language)}</Fact>}
          <Fact label={tx({ en: "Driver", ar: "السائق" })}>
            <DriverCell driver={v.driver} />
          </Fact>
          <Fact label={tx({ en: "Vehicle", ar: "المركبة" })}>
            <VehicleCell vehicle={v.vehicle} />
          </Fact>
          <Fact label={tx({ en: "Violation", ar: "المخالفة" })} wide>
            {v.type}
          </Fact>
          <Fact label={tx({ en: "Location", ar: "الموقع" })} wide>
            {v.location}
          </Fact>
        </div>
      </div>
      {canManage && v.status === "unpaid" && (
        <div className="flex justify-end border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <ActionButton size="md" tone="good" label={tx({ en: "Mark as paid", ar: "تسجيل كمدفوعة" })} onClick={onPay} />
        </div>
      )}
    </Dialog>
  );
}

export default function ViolationsLive() {
  const { tx, language } = useT();
  const can = useCan();
  const canManage = can("violations:manage");

  const [status, setStatus] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  const [detail, setDetail] = useState<ApiViolation | null>(null);
  const [paying, setPaying] = useState<ApiViolation | null>(null);
  const [lightbox, setLightbox] = useState<{ ids: string[]; start: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { items, total, loading, fetching, error, reload } = useApiPage(
    () => api.page<ApiViolation>("/violations", { status, vehicleId, driverId, from, to, search: q, page, pageSize: PAGE_SIZE }),
    JSON.stringify([status, vehicleId, driverId, from, to, q, page]),
  );
  const { vehicleOptions, driverOptions } = useFleetOptions();
  const counts = useApi(async () => {
    const one = (s: string) => api.page<ApiViolation>("/violations", { status: s, pageSize: 1 }).then((p) => p.total);
    const [unpaid, paid, all] = await Promise.all([one("unpaid"), one("paid"), one("")]);
    return { unpaid, paid, all };
  }, "counts");
  const reloadCounts = counts.reload;

  const closeDetail = useCallback(() => setDetail(null), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const clearToast = useCallback(() => setToast(null), []);

  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const statusOptions = [
    { value: "unpaid", label: tx({ en: "Unpaid", ar: "غير مدفوعة" }) },
    { value: "paid", label: tx({ en: "Paid", ar: "مدفوعة" }) },
  ];
  const c = counts.data;
  const filtered = Boolean(status || vehicleId || driverId || from || to || q);

  return (
    <Page
      moduleKey="violations"
      subtitle={{ en: "Traffic fines reported by drivers, recorded against the driver and vehicle.", ar: "المخالفات المرورية المبلغ عنها من السائقين والمسجلة على السائق والمركبة." }}
      stats={[
        { label: { en: "Unpaid fines", ar: "مخالفات غير مدفوعة" }, value: countText(c?.unpaid), tone: "bad", ...toggleCard(status, "unpaid", filter(setStatus)) },
        { label: { en: "Paid", ar: "مدفوعة" }, value: countText(c?.paid), tone: "good", ...toggleCard(status, "paid", filter(setStatus)) },
        { label: { en: "All violations", ar: "كل المخالفات" }, value: countText(c?.all), onClick: () => filter(setStatus)(""), active: false },
      ]}
    >
      <Block>
        <FilterBar
          search={search}
          onSearch={filter(setSearch)}
          searchPlaceholder={tx({ en: "Search ref, violation or location…", ar: "ابحث بالمرجع أو المخالفة أو الموقع…" })}
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
            title={tx({ en: "Violation log", ar: "سجل المخالفات" })}
            searchable={false}
            empty={filtered ? tx({ en: "No violations match these filters.", ar: "لا توجد مخالفات مطابقة." }) : tx({ en: "No violations reported.", ar: "لا توجد مخالفات مبلغ عنها." })}
            headers={[
              tx({ en: "Ref.", ar: "المرجع" }),
              tx({ en: "Date", ar: "التاريخ" }),
              tx({ en: "Violation", ar: "المخالفة" }),
              tx({ en: "Driver", ar: "السائق" }),
              tx({ en: "Vehicle", ar: "المركبة" }),
              tx({ en: "Location", ar: "الموقع" }),
              tx({ en: "Fine", ar: "الغرامة" }),
              tx({ en: "Ticket", ar: "صورة المخالفة" }),
              tx({ en: "Status", ar: "الحالة" }),
              "",
            ]}
            rows={items.map((v) => ({
              key: v.id,
              cells: [
                <button key="ref" dir="ltr" onClick={() => setDetail(v)} className="font-semibold text-prime-600 hover:underline dark:text-prime-400">
                  {v.ref}
                </button>,
                fmtDate(v.date, language),
                <span key="t" className="min-w-40 whitespace-normal">{v.type}</span>,
                <DriverCell key="d" driver={v.driver} />,
                <VehicleCell key="veh" vehicle={v.vehicle} />,
                v.location,
                <span key="f" className="font-semibold text-foreground">{fmtSAR(v.fine, language)}</span>,
                <FileThumbs key="ph" ids={v.photos} onOpen={() => setLightbox({ ids: v.photos, start: 0 })} />,
                <Status key="s" code={v.status} />,
                canManage && v.status === "unpaid" ? (
                  <ActionButton key="a" tone="good" label={tx({ en: "Mark paid", ar: "تسجيل الدفع" })} onClick={() => setPaying(v)} />
                ) : (
                  <button key="o" onClick={() => setDetail(v)} className="text-xs font-semibold text-prime-600 hover:underline dark:text-prime-400">
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
        {detail && <Detail key="detail" v={detail} canManage={canManage} onClose={closeDetail} onPay={() => setPaying(detail)} onZoom={(i) => setLightbox({ ids: detail.photos, start: i })} />}
        {paying && (
          <ActionDialog
            key={`pay-${paying.id}`}
            title={tx({ en: "Mark violation as paid", ar: "تسجيل المخالفة كمدفوعة" })}
            summary={
              <>
                <span dir="ltr" className="font-semibold text-foreground">{paying.ref}</span>
                {" - "}
                {paying.type}
                {" : "}
                <span className="font-semibold text-foreground">{fmtSAR(paying.fine, language)}</span>
              </>
            }
            note={tx({ en: "Confirms the fine has been paid. This cannot be undone.", ar: "يؤكد أن الغرامة قد دُفعت. لا يمكن التراجع عن ذلك." })}
            confirm={tx({ en: "Mark as paid", ar: "تسجيل كمدفوعة" })}
            tone="good"
            run={() => api.post<ApiViolation>(`/violations/${paying.id}/mark-paid`)}
            onClose={() => setPaying(null)}
            onDone={(result, stale) => {
              reload();
              reloadCounts();
              if (stale) return;
              setPaying(null);
              if (result && detail?.id === (result as ApiViolation).id) setDetail(result as ApiViolation);
              setToast(tx({ en: "Violation marked as paid", ar: "تم تسجيل المخالفة كمدفوعة" }));
            }}
          />
        )}
        {lightbox && <FileLightbox key="lb" ids={lightbox.ids} start={lightbox.start} onClose={closeLightbox} />}
      </AnimatePresence>
      <Toast message={toast} onDone={clearToast} />
    </Page>
  );
}
