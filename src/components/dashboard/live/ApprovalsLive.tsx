"use client";

// Approvals: requests drivers send from the mobile app (maintenance, emergency
// repair, tyres, battery, expense claim). Driver → Assistant → Fleet Manager;
// the Fleet Manager can approve without the Assistant. Approving or closing
// only moves the status. The server decides whose turn it is: every row
// carries canApprove / canReject / canClose for the signed-in role, and the
// buttons follow those flags only.

import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import DataTable from "@/components/dashboard/DataTable";
import { ApprovalChain, Block, Page, Status, toggleCard } from "@/components/dashboard/ModulePage";
import { FilterBar, Toast } from "@/components/dashboard/RecordTools";
import { FileGallery, FileLightbox, FileThumbs } from "@/components/dashboard/live/Evidence";
import {
  APPROVAL_TYPE_LABEL,
  ActionButton,
  ActionDialog,
  Dialog,
  DriverCell,
  Fact,
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
import type { ApiApproval, ApprovalType } from "@/lib/api/types";
import { fmtDate, fmtSAR, type ApprovalStep } from "@/lib/fleet-data";
import { useT } from "@/lib/translations";

const PAGE_SIZE = 20;
const REASON_MAX = 500;

type Kind = "approve" | "reject" | "close";
type Action = { a: ApiApproval; kind: Kind };

const R_DRIVER = { en: "Driver", ar: "السائق" };
const R_ASSISTANT = { en: "Assistant", ar: "المساعد" };
const R_FLEET = { en: "Fleet Manager", ar: "مدير الأسطول" };

/**
 * The chain as stored. A rejection lands on the step that was pending: the
 * Fleet Manager's once the Assistant had passed it on, else the Assistant's.
 */
function stepsOf(a: ApiApproval): ApprovalStep[] {
  const passed = a.assistantApprovedAt !== null;
  const assistant: ApprovalStep["state"] =
    a.status === "pendingAssistant" ? "current" : a.status === "rejected" ? (passed ? "done" : "rejected") : passed || a.status === "pendingFleetManager" ? "done" : "skipped";
  const fleet: ApprovalStep["state"] =
    a.status === "pendingFleetManager" ? "current" : a.status === "approved" || a.status === "closed" ? "done" : a.status === "rejected" && passed ? "rejected" : "waiting";
  return [
    { role: R_DRIVER, state: "done" },
    { role: R_ASSISTANT, state: assistant },
    { role: R_FLEET, state: fleet },
  ];
}

/** Buttons for exactly what the server says this role may do now. */
function Actions({ a, onAct, size = "sm" }: { a: ApiApproval; onAct: (x: Action) => void; size?: "sm" | "md" }) {
  const { tx } = useT();
  if (!a.canApprove && !a.canReject && !a.canClose) return null;
  return (
    <span className="flex gap-1.5">
      {a.canApprove && <ActionButton size={size} tone="good" label={tx({ en: "Approve", ar: "اعتماد" })} onClick={() => onAct({ a, kind: "approve" })} />}
      {a.canReject && <ActionButton size={size} tone="bad" outline label={tx({ en: "Reject", ar: "رفض" })} onClick={() => onAct({ a, kind: "reject" })} />}
      {a.canClose && <ActionButton size={size} tone="info" label={tx({ en: "Close request", ar: "إغلاق الطلب" })} onClick={() => onAct({ a, kind: "close" })} />}
    </span>
  );
}

function Detail({ a, onClose, onAct, onZoom }: { a: ApiApproval; onClose: () => void; onAct: (x: Action) => void; onZoom: (i: number) => void }) {
  const { tx, language } = useT();
  const photos = a.photos ?? [];
  const events: { label: string; at: string }[] = [
    { label: tx({ en: "Submitted by the driver", ar: "أرسله السائق" }), at: a.createdAt },
    ...(a.assistantApprovedAt ? [{ label: tx({ en: "Passed on by the Assistant", ar: "مرّره المساعد" }), at: a.assistantApprovedAt }] : []),
    ...(a.approvedAt ? [{ label: tx({ en: "Approved", ar: "تم الاعتماد" }), at: a.approvedAt }] : []),
    ...(a.rejectedAt ? [{ label: tx({ en: "Rejected", ar: "تم الرفض" }), at: a.rejectedAt }] : []),
    ...(a.closedAt ? [{ label: tx({ en: "Closed", ar: "تم الإغلاق" }), at: a.closedAt }] : []),
  ];
  return (
    <Dialog wide title={`${tx({ en: "Request", ar: "طلب" })} ${a.ref}`} onClose={onClose}>
      <div className="space-y-5 overflow-y-auto px-5 py-5">
        <div className="rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/60">
          <ApprovalChain steps={stepsOf(a)} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label={tx({ en: "Status", ar: "الحالة" })}>
            <Status code={a.status} />
          </Fact>
          <Fact label={tx({ en: "Request type", ar: "نوع الطلب" })}>{tx(APPROVAL_TYPE_LABEL[a.type])}</Fact>
          <Fact label={tx({ en: "Estimated amount", ar: "المبلغ التقديري" })}>
            <span className="text-base">{fmtSAR(a.amount, language)}</span>
          </Fact>
          <Fact label={tx({ en: "Submitted on", ar: "تاريخ الإرسال" })}>{fmtDate(a.date, language)}</Fact>
          <Fact label={tx({ en: "Driver", ar: "السائق" })}>
            <DriverCell driver={a.driver} />
          </Fact>
          <Fact label={tx({ en: "Vehicle", ar: "المركبة" })}>
            <VehicleCell vehicle={a.vehicle} />
          </Fact>
          <Fact label={tx({ en: "Driver's note", ar: "ملاحظة السائق" })} wide>
            <span className="font-normal whitespace-pre-line">{a.note}</span>
          </Fact>
        </div>
        {photos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{tx({ en: "Photos of what needs the work", ar: "صور ما يحتاج إلى العمل" })}</p>
            <FileGallery ids={photos} empty="" onZoom={onZoom} />
          </div>
        )}
        {a.status === "rejected" && a.rejectionReason && (
          <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm dark:bg-red-950/40">
            <p className="text-xs font-semibold text-red-700 dark:text-red-300">{tx({ en: "Rejection reason", ar: "سبب الرفض" })}</p>
            <p className="mt-0.5 text-red-800 dark:text-red-200">{a.rejectionReason}</p>
          </div>
        )}
        <ol className="space-y-2 border-s-2 border-neutral-100 ps-4 dark:border-neutral-800">
          {events.map((e) => (
            <li key={e.label} className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="text-neutral-600 dark:text-neutral-300">{e.label}</span>
              <span className="text-xs text-neutral-500">{fmtDate(e.at, language)}</span>
            </li>
          ))}
        </ol>
      </div>
      {(a.canApprove || a.canReject || a.canClose) && (
        <div className="flex justify-end border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <Actions a={a} onAct={onAct} size="md" />
        </div>
      )}
    </Dialog>
  );
}

export default function ApprovalsLive() {
  const { tx, language } = useT();

  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  const [detail, setDetail] = useState<ApiApproval | null>(null);
  const [lightbox, setLightbox] = useState<{ ids: string[]; start: number } | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { items, total, loading, fetching, error, reload } = useApiPage(
    () => api.page<ApiApproval>("/approvals", { status, type, vehicleId, driverId, search: q, page, pageSize: PAGE_SIZE }),
    JSON.stringify([status, type, vehicleId, driverId, q, page]),
  );
  const { vehicleOptions, driverOptions } = useFleetOptions();
  const counts = useApi(async () => {
    const one = (s: string) => api.page<ApiApproval>("/approvals", { status: s, pageSize: 1 }).then((p) => p.total);
    const [assistant, fleet, approved, rejected] = await Promise.all([one("pendingAssistant"), one("pendingFleetManager"), one("approved"), one("rejected")]);
    return { assistant, fleet, approved, rejected };
  }, "counts");
  const reloadCounts = counts.reload;

  const closeDetail = useCallback(() => setDetail(null), []);
  const clearToast = useCallback(() => setToast(null), []);

  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  function done(kind: Kind, result: unknown, stale: boolean) {
    reload();
    reloadCounts();
    if (stale) {
      // Out of turn: the detail behind the dialog is stale too.
      setDetail(null);
      return;
    }
    setAction(null);
    const updated = result as ApiApproval;
    if (detail?.id === updated.id) setDetail(updated);
    setToast(
      kind === "reject"
        ? tx({ en: "Request rejected", ar: "تم رفض الطلب" })
        : kind === "close"
          ? tx({ en: "Request closed", ar: "تم إغلاق الطلب" })
          : updated.status === "approved"
            ? tx({ en: "Request approved", ar: "تم اعتماد الطلب" })
            : tx({ en: "Passed to the Fleet Manager", ar: "تم تمريره إلى مدير الأسطول" }),
    );
  }

  const statusOptions = (["pendingAssistant", "pendingFleetManager", "approved", "rejected", "closed"] as const).map((s) => ({
    value: s,
    label: tx(
      {
        pendingAssistant: { en: "With the Assistant", ar: "لدى المساعد" },
        pendingFleetManager: { en: "With the Fleet Manager", ar: "لدى مدير الأسطول" },
        approved: { en: "Approved", ar: "معتمد" },
        rejected: { en: "Rejected", ar: "مرفوض" },
        closed: { en: "Closed", ar: "مغلق" },
      }[s],
    ),
  }));
  const typeOptions = (Object.keys(APPROVAL_TYPE_LABEL) as ApprovalType[]).map((t) => ({ value: t, label: tx(APPROVAL_TYPE_LABEL[t]) }));
  const c = counts.data;
  const filtered = Boolean(status || type || vehicleId || driverId || q);

  const dialogText: Record<Kind, { title: string; confirm: string; note: string }> = {
    approve: {
      title: tx({ en: "Approve request", ar: "اعتماد الطلب" }),
      confirm: tx({ en: "Approve", ar: "اعتماد" }),
      note: tx({
        en: "Approving moves the request to its next step. It only changes the status: no maintenance record, invoice or vehicle change is created.",
        ar: "ينقل الاعتماد الطلب إلى خطوته التالية. يغيّر الحالة فقط ولا ينشئ سجل صيانة أو فاتورة أو تغييرًا على المركبة.",
      }),
    },
    reject: {
      title: tx({ en: "Reject request", ar: "رفض الطلب" }),
      confirm: tx({ en: "Reject", ar: "رفض" }),
      note: tx({ en: "A rejection is final. The driver can submit a new request.", ar: "الرفض نهائي. يمكن للسائق إرسال طلب جديد." }),
    },
    close: {
      title: tx({ en: "Close request", ar: "إغلاق الطلب" }),
      confirm: tx({ en: "Close request", ar: "إغلاق الطلب" }),
      note: tx({
        en: "Close the request once the invoice or completed work is in. This only changes the status.",
        ar: "أغلق الطلب بعد وصول الفاتورة أو اكتمال العمل. يغيّر ذلك الحالة فقط.",
      }),
    },
  };

  return (
    <Page
      moduleKey="approvals"
      subtitle={{ en: "Driver requests move through Driver → Assistant → Fleet Manager before work proceeds.", ar: "تمر طلبات السائقين عبر السائق ← المساعد ← مدير الأسطول قبل تنفيذ العمل." }}
      stats={[
        { label: { en: "With the Assistant", ar: "لدى المساعد" }, value: countText(c?.assistant), tone: "warn", ...toggleCard(status, "pendingAssistant", filter(setStatus)) },
        { label: { en: "With the Fleet Manager", ar: "لدى مدير الأسطول" }, value: countText(c?.fleet), tone: "warn", ...toggleCard(status, "pendingFleetManager", filter(setStatus)) },
        { label: { en: "Approved, to close", ar: "معتمدة بانتظار الإغلاق" }, value: countText(c?.approved), tone: "good", ...toggleCard(status, "approved", filter(setStatus)) },
        { label: { en: "Rejected", ar: "مرفوضة" }, value: countText(c?.rejected), tone: "bad", ...toggleCard(status, "rejected", filter(setStatus)) },
      ]}
    >
      <Block>
        <FilterBar
          search={search}
          onSearch={filter(setSearch)}
          searchPlaceholder={tx({ en: "Search by reference or note…", ar: "ابحث بالمرجع أو الملاحظة…" })}
          filters={[
            { label: tx({ en: "All statuses", ar: "كل الحالات" }), value: status, onChange: filter(setStatus), options: statusOptions },
            { label: tx({ en: "All request types", ar: "كل أنواع الطلبات" }), value: type, onChange: filter(setType), options: typeOptions },
            { label: tx({ en: "All vehicles", ar: "كل المركبات" }), value: vehicleId, onChange: filter(setVehicleId), options: vehicleOptions },
            { label: tx({ en: "All drivers", ar: "كل السائقين" }), value: driverId, onChange: filter(setDriverId), options: driverOptions },
          ]}
          shown={items.length}
          total={total}
          onClear={() => {
            setStatus("");
            setType("");
            setVehicleId("");
            setDriverId("");
            setSearch("");
            setPage(1);
          }}
        />
      </Block>

      <Block>
        <LiveState loading={loading} error={error} onRetry={reload}>
          <Refreshing on={fetching} />
          <DataTable
            title={tx({ en: "Driver requests", ar: "طلبات السائقين" })}
            searchable={false}
            empty={filtered ? tx({ en: "No requests match these filters.", ar: "لا توجد طلبات مطابقة." }) : tx({ en: "No requests yet. Drivers send them from the mobile app.", ar: "لا توجد طلبات بعد. يرسلها السائقون من تطبيق الجوال." })}
            headers={[
              tx({ en: "Ref.", ar: "المرجع" }),
              tx({ en: "Date", ar: "التاريخ" }),
              tx({ en: "Request", ar: "الطلب" }),
              tx({ en: "Driver", ar: "السائق" }),
              tx({ en: "Vehicle", ar: "المركبة" }),
              tx({ en: "Amount", ar: "المبلغ" }),
              tx({ en: "Photos", ar: "الصور" }),
              tx({ en: "Approval chain", ar: "مسار الموافقة" }),
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
                <span key="r" className="block min-w-40 whitespace-normal">
                  <span className="font-medium text-foreground">{tx(APPROVAL_TYPE_LABEL[a.type])}</span>
                  <span className="line-clamp-2 block text-xs text-neutral-500">{a.note}</span>
                </span>,
                <DriverCell key="d" driver={a.driver} />,
                <VehicleCell key="v" vehicle={a.vehicle} />,
                <span key="am" className="font-semibold text-foreground">{fmtSAR(a.amount, language)}</span>,
                <FileThumbs key="ph" ids={a.photos ?? []} onOpen={() => setLightbox({ ids: a.photos ?? [], start: 0 })} />,
                <ApprovalChain key="c" steps={stepsOf(a)} />,
                <Status key="s" code={a.status} />,
                a.canApprove || a.canReject || a.canClose ? (
                  <Actions key="a" a={a} onAct={setAction} />
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
        {detail && <Detail key="detail" a={detail} onClose={closeDetail} onAct={setAction} onZoom={(i) => setLightbox({ ids: detail.photos ?? [], start: i })} />}
        {lightbox && <FileLightbox key="lb" ids={lightbox.ids} start={lightbox.start} onClose={() => setLightbox(null)} />}
        {action && (
          <ActionDialog
            key={`${action.kind}-${action.a.id}`}
            title={dialogText[action.kind].title}
            summary={
              <>
                <span dir="ltr" className="font-semibold text-foreground">{action.a.ref}</span>
                {" - "}
                {tx(APPROVAL_TYPE_LABEL[action.a.type])}
                {action.a.vehicle && (
                  <>
                    {" - "}
                    <span dir="ltr">{action.a.vehicle.plateNumber}</span>
                  </>
                )}
                {" : "}
                <span className="font-semibold text-foreground">{fmtSAR(action.a.amount, language)}</span>
              </>
            }
            note={dialogText[action.kind].note}
            confirm={dialogText[action.kind].confirm}
            tone={action.kind === "approve" ? "good" : action.kind === "reject" ? "bad" : "info"}
            text={
              action.kind === "reject"
                ? { label: tx({ en: "Reason for rejection", ar: "سبب الرفض" }), hint: tx({ en: "The driver will see this reason in their app.", ar: "سيظهر هذا السبب للسائق في تطبيقه." }), required: true, max: REASON_MAX }
                : undefined
            }
            run={(reason) => api.post<ApiApproval>(`/approvals/${action.a.id}/${action.kind}`, action.kind === "reject" ? { reason } : undefined)}
            onClose={() => setAction(null)}
            onDone={(result, stale) => done(action.kind, result, stale)}
          />
        )}
      </AnimatePresence>
      <Toast message={toast} onDone={clearToast} />
    </Page>
  );
}
