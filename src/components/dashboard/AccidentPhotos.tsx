"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CarGlyph from "@/components/CarGlyph";
import { Badge } from "@/components/dashboard/DataTable";
import { useT } from "@/lib/translations";
import {
  STATUS,
  driverById,
  fmtDate,
  fmtSAR,
  vehicleById,
  type Accident,
  type AccidentPhoto,
} from "@/lib/fleet-data";

// Where each damage zone sits on CarGlyph (car faces right), as % of its box.
const DAMAGE_POINT: Record<NonNullable<AccidentPhoto["damage"]>, { x: number; y: number }> = {
  rear: { x: 7, y: 60 },
  front: { x: 91, y: 57 },
  side: { x: 68, y: 40 },
};

/**
 * Drawn stand-in for a driver-uploaded accident photo: the car on a road with
 * the impact zone circled (close-ups zoom into it), or the attached report.
 * Replaced by real image URLs once the mobile app uploads them.
 */
export function AccidentPhotoView({ photo, reference, large = false }: { photo: AccidentPhoto; reference: string; large?: boolean }) {
  if (photo.kind === "document") {
    return (
      <div dir="ltr" className="flex h-full w-full items-center justify-center bg-neutral-200 dark:bg-neutral-800">
        <div className={`flex aspect-[3/4] h-[82%] flex-col rounded-sm bg-white shadow-md ${large ? "gap-3 p-6" : "gap-1 p-1.5"}`}>
          <div className={`rounded-sm bg-prime-600 ${large ? "h-3" : "h-1"}`} />
          {large && <p className="font-mono text-xs font-semibold text-neutral-700">{reference}</p>}
          {Array.from({ length: large ? 9 : 5 }, (_, i) => (
            <div key={i} className={`rounded-full bg-neutral-200 ${large ? "h-2" : "h-0.5"}`} style={{ width: `${[92, 78, 85, 60, 88, 70, 95, 55, 80][i]}%` }} />
          ))}
          <div className={`mt-auto self-end rounded-full border-2 border-prime-500/60 ${large ? "h-14 w-14" : "h-3 w-3"}`} />
        </div>
      </div>
    );
  }

  const point = DAMAGE_POINT[photo.damage ?? "rear"];
  const zoom = photo.kind === "closeup";

  return (
    <div dir="ltr" className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#dbe4ee] to-[#c3cedb] dark:from-[#2a3442] dark:to-[#1f2733]">
      {/* Road */}
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[#5b6472] dark:bg-[#3a414c]">
        <div className="absolute inset-x-0 top-1/2 h-[3%] -translate-y-1/2 bg-[repeating-linear-gradient(90deg,#e5e7eb_0_12%,transparent_12%_22%)] opacity-70" />
      </div>
      <div
        className="absolute bottom-[14%] left-1/2 w-[80%] -translate-x-1/2"
        style={zoom ? { scale: "2.6", transformOrigin: `${point.x}% ${point.y}%` } : undefined}
      >
        <div className="relative text-prime-700 dark:text-prime-400">
          <CarGlyph className="w-full" spin={false} />
          <span
            className="absolute aspect-square w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-500 bg-red-500/20"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            {large && <span className="absolute inset-0 animate-ping rounded-full border-2 border-red-500/70" />}
          </span>
        </div>
      </div>
      {zoom && <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.25)]" />}
    </div>
  );
}

function CameraIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx={12} cy={13} r={3.5} />
    </svg>
  );
}

/** Overlapping thumbnails + count, for the Photos column. */
export function PhotoStack({ accident, onOpen }: { accident: Accident; onOpen: () => void }) {
  const { tx } = useT();
  const shown = accident.photos.slice(0, 3);
  return (
    <button
      onClick={onOpen}
      aria-label={tx({ en: `View ${accident.photos.length} photos`, ar: `عرض ${accident.photos.length} صور` })}
      className="group flex items-center gap-2"
    >
      <span className="flex">
        {shown.map((p, i) => (
          <span
            key={i}
            className={`block h-9 w-12 overflow-hidden rounded-md border-2 border-white shadow-sm transition-transform group-hover:-translate-y-0.5 dark:border-neutral-900 ${i > 0 ? "-ms-4" : ""}`}
            style={{ zIndex: shown.length - i }}
          >
            <AccidentPhotoView photo={p} reference={accident.reference} />
          </span>
        ))}
      </span>
      <span className="flex items-center gap-1 text-xs font-semibold text-prime-600 group-hover:underline dark:text-prime-400">
        <CameraIcon size={13} />
        {accident.photos.length}
      </span>
    </button>
  );
}

/** Accident detail panel: facts, photo gallery, and a full-size viewer. */
export function AccidentDetail({ accident, onClose }: { accident: Accident | null; onClose: () => void }) {
  const { tx, language } = useT();
  const [viewing, setViewing] = useState<number | null>(null);

  useEffect(() => {
    if (!accident) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (viewing !== null) setViewing(null);
        else onClose();
      }
      if (viewing === null) return;
      const count = accident!.photos.length;
      // Arrow keys follow reading direction: "next" is left in Arabic.
      const forward = language === "ar" ? "ArrowLeft" : "ArrowRight";
      const back = language === "ar" ? "ArrowRight" : "ArrowLeft";
      if (e.key === forward) setViewing((v) => (v! + 1) % count);
      if (e.key === back) setViewing((v) => (v! - 1 + count) % count);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [accident, viewing, onClose, language]);

  const driver = accident ? driverById(accident.driverId) : undefined;
  const vehicle = accident ? vehicleById(accident.vehicleId) : undefined;

  return (
    <AnimatePresence onExitComplete={() => setViewing(null)}>
      {accident && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={accident.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
              <div>
                <p className="flex items-center gap-2 text-lg font-bold text-foreground">
                  {accident.id}
                  <Badge label={tx(STATUS[accident.status].label)} tone={STATUS[accident.status].tone} />
                </p>
                <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{tx(accident.description)}</p>
              </div>
              <button
                onClick={onClose}
                aria-label={tx({ en: "Close", ar: "إغلاق" })}
                className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {/* Facts */}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                {[
                  [{ en: "Date", ar: "التاريخ" }, fmtDate(accident.date, language)],
                  [{ en: "Vehicle", ar: "المركبة" }, vehicle ? `${vehicle.plate} · ${tx(vehicle.make)} ${vehicle.model}` : "-"],
                  [{ en: "Driver", ar: "السائق" }, driver ? tx(driver.name) : "-"],
                  [{ en: "Location", ar: "الموقع" }, tx(accident.location)],
                  [{ en: "Najm report", ar: "تقرير نجم" }, accident.reference],
                  [{ en: "Repair cost", ar: "تكلفة الإصلاح" }, fmtSAR(accident.cost, language)],
                ].map(([label, value]) => (
                  <div key={(label as { en: string }).en}>
                    <dt className="text-xs text-neutral-500 dark:text-neutral-400">{tx(label as { en: string; ar: string })}</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{value as string}</dd>
                  </div>
                ))}
              </dl>

              {/* Gallery */}
              <div className="mt-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CameraIcon size={15} />
                  {tx({ en: `Photos (${accident.photos.length})`, ar: `الصور (${accident.photos.length})` })}
                  <span className="text-xs font-normal text-neutral-400">
                    {tx({ en: "· uploaded by the driver from the mobile app", ar: "· رفعها السائق من تطبيق الجوال" })}
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {accident.photos.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setViewing(i)}
                      className="group overflow-hidden rounded-xl border border-neutral-200 text-start transition-shadow hover:shadow-md dark:border-neutral-700"
                    >
                      <span className="block aspect-[4/3] overflow-hidden">
                        <span className="block h-full w-full transition-transform duration-300 group-hover:scale-105">
                          <AccidentPhotoView photo={p} reference={accident.reference} />
                        </span>
                      </span>
                      <span className="block px-3 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">{tx(p.caption)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Full-size viewer */}
            <AnimatePresence>
              {viewing !== null && (
                <motion.div
                  className="absolute inset-0 z-10 flex flex-col bg-neutral-950"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{tx(accident.photos[viewing].caption)}</p>
                      <p className="text-xs text-white/60">
                        {driver ? tx(driver.name) : ""} ·{" "}
                        {tx({
                          en: `${accident.photos[viewing].uploadedAfter} min after the accident`,
                          ar: `بعد ${accident.photos[viewing].uploadedAfter} دقيقة من الحادث`,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/60">
                        {viewing + 1} / {accident.photos.length}
                      </span>
                      <button onClick={() => setViewing(null)} aria-label={tx({ en: "Back to details", ar: "العودة للتفاصيل" })} className="rounded-full p-1.5 hover:bg-white/10">
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="relative flex flex-1 items-center justify-center px-14 pb-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={viewing}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        className="aspect-[4/3] w-full max-w-xl overflow-hidden rounded-lg"
                      >
                        <AccidentPhotoView photo={accident.photos[viewing]} reference={accident.reference} large />
                      </motion.div>
                    </AnimatePresence>
                    {accident.photos.length > 1 && (
                      <>
                        <button
                          onClick={() => setViewing((v) => (v! - 1 + accident.photos.length) % accident.photos.length)}
                          aria-label={tx({ en: "Previous photo", ar: "الصورة السابقة" })}
                          className="absolute start-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                        >
                          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden="true">
                            <path d="M15 6l-6 6 6 6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setViewing((v) => (v! + 1) % accident.photos.length)}
                          aria-label={tx({ en: "Next photo", ar: "الصورة التالية" })}
                          className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                        >
                          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden="true">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
