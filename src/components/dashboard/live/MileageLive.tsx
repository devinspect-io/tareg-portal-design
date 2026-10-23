"use client";

// Kilometer Tracking: office review of odometer readings drivers submit from
// the mobile app. Live data from GET /mileage; approve / reject need the
// "mileage:review" permission.

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/dashboard/DataTable";
import DataTable from "@/components/dashboard/DataTable";
import { Block, Page, Status } from "@/components/dashboard/ModulePage";
import { FilterBar, Field, TextArea, Toast } from "@/components/dashboard/RecordTools";
import { FormError, LiveState, Pager, Refreshing, useDebounced } from "@/components/dashboard/live/LiveKit";
import { api } from "@/lib/api/client";
import { useApi, useApiPage } from "@/lib/api/hooks";
import { useCan } from "@/lib/api/session";
import type { ApiDriver, ApiMileage, ApiVehicle } from "@/lib/api/types";
import { fmtDate, fmtKm } from "@/lib/fleet-data";
import { useT } from "@/lib/translations";

const PAGE_SIZE = 20;
/** A jump bigger than this between two readings deserves a second look. */
const BIG_JUMP = 2000;
const REJECT_MAX = 500;

type Action = { m: ApiMileage; kind: "approve" | "reject" };

// ---------- Small pieces ----------

function CameraIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
      <circle cx={12} cy={13} r={3.5} />
    </svg>
  );
}

function Photo({ src, className = "", contain = false }: { src: string; className?: string; contain?: boolean }) {
  const { tx } = useT();
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={`flex flex-col items-center justify-center gap-1 bg-neutral-100 text-neutral-400 dark:bg-neutral-800 ${className}`}>
        <CameraIcon size={contain ? 28 : 14} />
        {contain && <span className="text-xs">{tx({ en: "Photo could not be loaded", ar: "تعذر تحميل الصورة" })}</span>}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" onError={() => setFailed(true)} className={`${contain ? "object-contain" : "object-cover"} ${className}`} />;
}

/** Flags for a reading: lower than before, or an unusually large jump. */
function Flags({ distance }: { distance: number }) {
  const { tx } = useT();
  if (distance < 0) return <Badge label={tx({ en: "Lower than before", ar: "أقل من السابق" })} tone="bad" />;
  if (distance > BIG_JUMP) return <Badge label={tx({ en: "Big jump", ar: "قفزة كبيرة" })} tone="warn" />;
  return null;
}

function Distance({ km }: { km: number }) {
  const { language } = useT();
  const cls = km < 0 ? "text-red-600 dark:text-red-400" : km > BIG_JUMP ? "text-accent-600 dark:text-accent-400" : "";
  return (
    // The sign stays glued to the number in Arabic; the unit follows the page direction like fmtKm.
    <span className={`font-semibold whitespace-nowrap ${cls}`}>
      <bdi dir="ltr">{`${km > 0 ? "+" : ""}${km.toLocaleString("en-US")}`}</bdi> {language === "ar" ? "كم" : "km"}
    </span>
  );
}

function PhotoThumbs({ photos, onOpen }: { photos: string[]; onOpen: () => void }) {
  const { tx } = useT();
  if (photos.length === 0) return <span className="text-neutral-400">-</span>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label={tx({ en: `View ${photos.length} photos`, ar: `عرض ${photos.length} صور` })}
      className="group flex items-center gap-2"
    >
      <span className="block h-9 w-12 shrink-0 overflow-hidden rounded-md border border-neutral-200 shadow-sm transition-transform group-hover:-translate-y-0.5 dark:border-neutral-700">
        <Photo src={photos[0]} className="h-full w-full" />
      </span>
      {photos.length > 1 && <span dir="ltr" className="text-xs font-semibold text-prime-600 group-hover:underline dark:text-prime-400">+{photos.length - 1}</span>}
    </button>
  );
}

const arrowBtn = "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2.5 text-white transition-colors hover:bg-black/70 disabled:opacity-30";

/** Full-screen viewer with next / previous, keyboard arrows and Escape. */
function Lightbox({ photos, start, onClose }: { photos: string[]; start: number; onClose: () => void }) {
  const { tx } = useT();
  const [i, setI] = useState(start);
  const last = photos.length - 1;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Arrows follow the reading direction of the page.
      const rtl = document.documentElement.dir === "rtl";
      if (e.key === "ArrowRight") setI((v) => Math.max(0, Math.min(last, v + (rtl ? -1 : 1))));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, Math.min(last, v + (rtl ? 1 : -1))));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [last, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <button onClick={onClose} aria-label={tx({ en: "Close", ar: "إغلاق" })} className="absolute end-4 top-4 rounded-full bg-black/50 p-2.5 text-white hover:bg-black/70">
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <Photo key={i} src={photos[i]} contain className="max-h-[85vh] w-full max-w-5xl rounded-lg" />
      {photos.length > 1 && (
        <>
          <button className={`${arrowBtn} start-3`} disabled={i === 0} onClick={() => setI(i - 1)} aria-label={tx({ en: "Previous photo", ar: "الصورة السابقة" })}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button className={`${arrowBtn} end-3`} disabled={i === last} onClick={() => setI(i + 1)} aria-label={tx({ en: "Next photo", ar: "الصورة التالية" })}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span dir="ltr" className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
            {i + 1} / {photos.length}
          </span>
        </>
      )}
    </motion.div>
  );
}

/** Centered dialog shell used by the detail view and the review dialogs. */
function Dialog({ title, onClose, wide = false, z = "z-50", children }: { title: string; onClose: () => void; wide?: boolean; z?: string; children: React.ReactNode }) {
  const { tx } = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div
      className={`fixed inset-0 ${z} flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900 ${wide ? "max-w-3xl" : "max-w-md"}`}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} aria-label={tx({ en: "Close", ar: "إغلاق" })} className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

const ghostBtn =
  "rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700";

/** Approve confirmation / reject reason form. */
function ReviewDialog({ action, onClose, onDone }: { action: Action; onClose: () => void; onDone: (kind: Action["kind"], stale: boolean) => void }) {
  const { tx, language } = useT();
  const { m, kind } = action;
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const approve = kind === "approve";
  const trimmed = reason.trim();
  const canSend = !busy && (approve || (trimmed.length > 0 && trimmed.length <= REJECT_MAX));

  async function submit() {
    if (!canSend) return;
    setBusy(true);
    setError(null);
    try {
      if (approve) await api.post(`/mileage/${m.id}/approve`);
      else await api.post(`/mileage/${m.id}/reject`, { reason: trimmed });
      onDone(kind, false);
    } catch (e) {
      setError(e);
      setBusy(false);
      // Someone else got there first: the list is stale, refresh it behind the dialog.
      if (typeof e === "object" && e !== null && (e as { status?: number }).status === 409) onDone(kind, true);
    }
  }

  return (
    <Dialog
      z="z-[55]"
      onClose={busy ? () => {} : onClose}
      title={approve ? tx({ en: "Approve reading", ar: "اعتماد القراءة" }) : tx({ en: "Reject reading", ar: "رفض القراءة" })}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-4 overflow-y-auto px-5 py-5"
      >
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          <span dir="ltr" className="font-semibold text-foreground">{m.ref}</span>
          {" - "}
          {m.vehicle ? <span dir="ltr">{m.vehicle.plateNumber}</span> : null}
          {" : "}
          <span className="font-semibold text-foreground">{fmtKm(m.reading, language)}</span>
        </p>
        {approve ? (
          <p className="rounded-lg bg-prime-50 px-3 py-2.5 text-sm text-prime-800 dark:bg-prime-950/50 dark:text-prime-200">
            {tx({
              en: `Approving updates the vehicle odometer to ${fmtKm(m.reading, language)}. This cannot be undone.`,
              ar: `سيتم تحديث عداد المركبة إلى ${fmtKm(m.reading, language)} عند الاعتماد. لا يمكن التراجع عن ذلك.`,
            })}
          </p>
        ) : (
          <Field label={tx({ en: "Reason for rejection", ar: "سبب الرفض" })} wide>
            <TextArea value={reason} onChange={setReason} />
            <p className="mt-1.5 flex justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              <span>{tx({ en: "The driver will see this reason in their app.", ar: "سيظهر هذا السبب للسائق في تطبيقه." })}</span>
              <span dir="ltr" className={trimmed.length > REJECT_MAX ? "text-red-600" : ""}>
                {trimmed.length}/{REJECT_MAX}
              </span>
            </p>
          </Field>
        )}
        <FormError error={error} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className={ghostBtn}>
            {tx({ en: "Cancel", ar: "إلغاء" })}
          </button>
          <button
            type="submit"
            disabled={!canSend}
            className={`rounded-lg px-5 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${approve ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"}`}
          >
            {busy ? tx({ en: "Saving…", ar: "جارٍ الحفظ…" }) : approve ? tx({ en: "Approve", ar: "اعتماد" }) : tx({ en: "Reject", ar: "رفض" })}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function ReviewButtons({ m, onAct, size = "sm" }: { m: ApiMileage; onAct: (a: Action) => void; size?: "sm" | "md" }) {
  const { tx } = useT();
  const pad = size === "md" ? "px-4 py-2 text-sm" : "px-2.5 py-1 text-xs";
  return (
    <span className="flex gap-1.5">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAct({ m, kind: "approve" });
        }}
        className={`rounded-lg bg-green-600 font-semibold text-white transition-colors hover:bg-green-500 ${pad}`}
      >
        {tx({ en: "Approve", ar: "اعتماد" })}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAct({ m, kind: "reject" });
        }}
        className={`rounded-lg border border-red-200 bg-white font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:bg-transparent dark:hover:bg-red-950/40 ${pad}`}
      >
        {tx({ en: "Reject", ar: "رفض" })}
      </button>
    </span>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-800/60">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}

/** Detail: big evidence photo with thumbnails, the numbers and the decision. */
function Detail({ m, canReview, onClose, onAct, onZoom }: { m: ApiMileage; canReview: boolean; onClose: () => void; onAct: (a: Action) => void; onZoom: (i: number) => void }) {
  const { tx, language } = useT();
  const [i, setI] = useState(0);
  const photos = m.photos;
  return (
    <Dialog wide title={`${tx({ en: "Kilometer reading", ar: "قراءة العداد" })} ${m.ref}`} onClose={onClose}>
      <div className="space-y-5 overflow-y-auto px-5 py-5">
        {photos.length > 0 ? (
          <div className="space-y-2">
            <button type="button" onClick={() => onZoom(i)} className="block w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800" aria-label={tx({ en: "Enlarge photo", ar: "تكبير الصورة" })}>
              <Photo key={i} src={photos[i]} contain className="h-64 w-full sm:h-96" />
            </button>
            {photos.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                {photos.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setI(idx)}
                    className={`h-12 w-16 overflow-hidden rounded-md border-2 transition-colors ${idx === i ? "border-prime-500" : "border-transparent opacity-70 hover:opacity-100"}`}
                  >
                    <Photo src={p} className="h-full w-full" />
                  </button>
                ))}
                <span dir="ltr" className="ms-auto text-xs text-neutral-500">{i + 1} / {photos.length}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl bg-neutral-50 py-10 text-center text-sm text-neutral-400 dark:bg-neutral-800/60">{tx({ en: "No photos attached", ar: "لا توجد صور مرفقة" })}</p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label={tx({ en: "Previous reading", ar: "القراءة السابقة" })}>
            <span>{fmtKm(m.previous, language)}</span>
          </Fact>
          <Fact label={tx({ en: "New reading", ar: "القراءة الجديدة" })}>
            <span className="text-base">{fmtKm(m.reading, language)}</span>
          </Fact>
          <Fact label={tx({ en: "Distance", ar: "المسافة" })}>
            <Distance km={m.distance} />
          </Fact>
          <Fact label={tx({ en: "Status", ar: "الحالة" })}>
            <Status code={m.status} />
          </Fact>
          <Fact label={tx({ en: "Driver", ar: "السائق" })}>
            {m.driver ? (
              <>
                {tx(m.driver.name)}
                <span dir="ltr" className="block text-xs font-normal text-neutral-500">{m.driver.employeeNo}</span>
              </>
            ) : (
              "-"
            )}
          </Fact>
          <Fact label={tx({ en: "Vehicle", ar: "المركبة" })}>
            {m.vehicle ? (
              <>
                <span dir="ltr">{m.vehicle.plateNumber}</span>
                <span className="block text-xs font-normal text-neutral-500">{tx(m.vehicle.make)} {tx(m.vehicle.model)}</span>
              </>
            ) : (
              "-"
            )}
          </Fact>
          <Fact label={tx({ en: "Submitted on", ar: "تاريخ الإرسال" })}>{fmtDate(m.date, language)}</Fact>
          {m.reviewedAt && <Fact label={tx({ en: "Reviewed on", ar: "تاريخ المراجعة" })}>{fmtDate(m.reviewedAt, language)}</Fact>}
        </div>

        {(m.distance < 0 || m.distance > BIG_JUMP) && (
          <p
            className={`rounded-lg px-3 py-2.5 text-sm ${m.distance < 0 ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-accent-50 text-accent-800 dark:bg-accent-950/40 dark:text-accent-200"}`}
          >
            {m.distance < 0
              ? tx({ en: "This reading is lower than the previous one. Check the photo carefully before deciding.", ar: "هذه القراءة أقل من القراءة السابقة. تحقق من الصورة جيدًا قبل القرار." })
              : tx({ en: `This reading is more than ${BIG_JUMP.toLocaleString("en-US")} km above the previous one. Make sure it matches the photo.`, ar: `هذه القراءة أعلى من السابقة بأكثر من ${BIG_JUMP.toLocaleString("en-US")} كم. تأكد من مطابقتها للصورة.` })}
          </p>
        )}

        {m.status === "rejected" && m.rejectionReason && (
          <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm dark:bg-red-950/40">
            <p className="text-xs font-semibold text-red-700 dark:text-red-300">{tx({ en: "Rejection reason", ar: "سبب الرفض" })}</p>
            <p className="mt-0.5 text-red-800 dark:text-red-200">{m.rejectionReason}</p>
          </div>
        )}
      </div>
      {canReview && m.status === "inReview" && (
        <div className="flex justify-end border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
          <ReviewButtons m={m} onAct={onAct} size="md" />
        </div>
      )}
    </Dialog>
  );
}

// ---------- Screen ----------

export default function MileageLive() {
  const { tx, language } = useT();
  const can = useCan();
  const canReview = can("mileage:review");

  const [status, setStatus] = useState("inReview");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  const [detailId, setDetailId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ photos: string[]; start: number } | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { items, total, loading, fetching, error, reload } = useApiPage(
    () => api.page<ApiMileage>("/mileage", { status, vehicleId, driverId, from, to, search: q, page, pageSize: PAGE_SIZE }),
    JSON.stringify([status, vehicleId, driverId, from, to, q, page]),
  );

  const vehicles = useApi(() => api.page<ApiVehicle>("/vehicles", { pageSize: 100 }), "vehicles");
  const drivers = useApi(() => api.page<ApiDriver>("/drivers", { pageSize: 100 }), "drivers");
  const counts = useApi(
    async () => {
      const [a, b, c] = await Promise.all((["inReview", "approved", "rejected"] as const).map((s) => api.page<ApiMileage>("/mileage", { status: s, pageSize: 1 })));
      return { inReview: a.total, approved: b.total, rejected: c.total };
    },
    "counts",
  );
  const reloadCounts = counts.reload;

  const detail = detailId ? (items.find((m) => m.id === detailId) ?? null) : null;
  const closeDetail = useCallback(() => setDetailId(null), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const clearToast = useCallback(() => setToast(null), []);

  // Any filter change goes back to the first page.
  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  function done(kind: Action["kind"], stale: boolean) {
    reload();
    reloadCounts();
    if (stale) return; // keep the dialog open to show the friendly 409 text
    setAction(null);
    setDetailId(null);
    setToast(kind === "approve" ? tx({ en: "Reading approved", ar: "تم اعتماد القراءة" }) : tx({ en: "Reading rejected", ar: "تم رفض القراءة" }));
  }

  const statusOptions = [
    { value: "inReview", label: tx({ en: "In review", ar: "قيد المراجعة" }) },
    { value: "approved", label: tx({ en: "Approved", ar: "معتمد" }) },
    { value: "rejected", label: tx({ en: "Rejected", ar: "مرفوض" }) },
  ];
  const vehicleOptions = (vehicles.data?.items ?? []).map((v) => ({ value: v.id, label: `${v.plateNumber} - ${tx(v.make)} ${tx(v.model)}` }));
  const driverOptions = (drivers.data?.items ?? []).map((d) => ({ value: d.id, label: `${tx(d.name)} (${d.employeeNo})` }));

  const c = counts.data;
  const num = (n: number | undefined) => (n === undefined ? "-" : n.toLocaleString("en-US"));

  return (
    <Page
      moduleKey="mileage"
      subtitle={{ en: "Kilometer readings submitted by drivers from the mobile app, with photo evidence.", ar: "قراءات العداد المرسلة من السائقين عبر تطبيق الجوال مع صور الإثبات." }}
      stats={[
        { label: { en: "In review", ar: "قيد المراجعة" }, value: num(c?.inReview), tone: "warn" },
        { label: { en: "Approved", ar: "معتمدة" }, value: num(c?.approved), tone: "good" },
        { label: { en: "Rejected", ar: "مرفوضة" }, value: num(c?.rejected), tone: "bad" },
      ]}
    >
      <Block>
        <FilterBar
          search={search}
          onSearch={filter(setSearch)}
          searchPlaceholder={tx({ en: "Search by reference…", ar: "ابحث بالمرجع…" })}
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
            title={tx({ en: "Driver submissions", ar: "قراءات السائقين" })}
            empty={status === "inReview" && !vehicleId && !driverId && !from && !to && !q ? tx({ en: "Nothing waiting for review. All caught up.", ar: "لا توجد قراءات بانتظار المراجعة." }) : tx({ en: "No readings match these filters.", ar: "لا توجد قراءات مطابقة." })}
            headers={[
              tx({ en: "Ref.", ar: "المرجع" }),
              tx({ en: "Date", ar: "التاريخ" }),
              tx({ en: "Driver", ar: "السائق" }),
              tx({ en: "Vehicle", ar: "المركبة" }),
              tx({ en: "Previous", ar: "السابقة" }),
              tx({ en: "New reading", ar: "الجديدة" }),
              tx({ en: "Distance", ar: "المسافة" }),
              tx({ en: "Photos", ar: "الصور" }),
              tx({ en: "Status", ar: "الحالة" }),
              "",
            ]}
            rows={items.map((m) => ({
              key: m.id,
              cells: [
                <button key="ref" dir="ltr" onClick={() => setDetailId(m.id)} className="font-semibold text-prime-600 hover:underline dark:text-prime-400">
                  {m.ref}
                </button>,
                fmtDate(m.date, language),
                m.driver ? (
                  <span key="d" className="block">
                    {tx(m.driver.name)}
                    <span dir="ltr" className="block text-xs text-neutral-500">{m.driver.employeeNo}</span>
                  </span>
                ) : (
                  "-"
                ),
                m.vehicle ? (
                  <span key="v" className="block">
                    <span dir="ltr" className="font-medium">{m.vehicle.plateNumber}</span>
                    <span className="block text-xs text-neutral-500">{tx(m.vehicle.make)} {tx(m.vehicle.model)}</span>
                  </span>
                ) : (
                  "-"
                ),
                <span key="p">{fmtKm(m.previous, language)}</span>,
                <span key="r" className="font-bold text-foreground">{fmtKm(m.reading, language)}</span>,
                <span key="dist" className="flex flex-col items-start gap-1">
                  <Distance km={m.distance} />
                  <Flags distance={m.distance} />
                </span>,
                <PhotoThumbs key="ph" photos={m.photos} onOpen={() => setLightbox({ photos: m.photos, start: 0 })} />,
                <Status key="s" code={m.status} />,
                canReview && m.status === "inReview" ? <ReviewButtons key="a" m={m} onAct={setAction} /> : <button key="o" onClick={() => setDetailId(m.id)} className="text-xs font-semibold text-prime-600 hover:underline dark:text-prime-400">{tx({ en: "View", ar: "عرض" })}</button>,
              ],
            }))}
          />
          <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </LiveState>
      </Block>

      <AnimatePresence>
        {detail && <Detail key="detail" m={detail} canReview={canReview} onClose={closeDetail} onAct={setAction} onZoom={(i) => setLightbox({ photos: detail.photos, start: i })} />}
        {action && <ReviewDialog key={`${action.kind}-${action.m.id}`} action={action} onClose={() => setAction(null)} onDone={done} />}
        {lightbox && <Lightbox key="lb" photos={lightbox.photos} start={lightbox.start} onClose={closeLightbox} />}
      </AnimatePresence>
      <Toast message={toast} onDone={clearToast} />
    </Page>
  );
}
