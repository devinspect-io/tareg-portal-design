"use client";

// Photos and invoice PDFs attached to live records (breakdowns, accidents,
// violations, maintenance). Records hold file ids; the bytes need the signed-in
// token, so every view goes through useFile (object URL, revoked on unmount).
// Images open in the shared Lightbox; PDFs open in a new tab.

import { useState } from "react";
import { Lightbox } from "@/components/dashboard/live/LiveKit";
import { isPdf, useFile } from "@/lib/api/files";
import { useT } from "@/lib/translations";

function CameraIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
      <circle cx={12} cy={13} r={3.5} />
    </svg>
  );
}

function PdfIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

/**
 * One attachment. `size` picks the look: a table thumbnail, the detail
 * viewer, or the lightbox. A PDF shows as a document tile with an Open link.
 */
export function FileView({ id, size, className = "" }: { id: string; size: "thumb" | "large" | "lightbox"; className?: string }) {
  const { tx } = useT();
  const { file, error, loading } = useFile(id);
  const [broken, setBroken] = useState(false);
  const big = size !== "thumb";
  const tile = `flex flex-col items-center justify-center gap-1.5 ${size === "lightbox" ? "rounded-lg bg-neutral-900 text-neutral-300" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"} ${className}`;

  if (loading) return <span className={`block animate-pulse bg-neutral-200 dark:bg-neutral-700 ${className}`} aria-label={tx({ en: "Loading…", ar: "جارٍ التحميل…" })} />;

  if (error || broken || !file) {
    return (
      <span className={tile}>
        <CameraIcon size={big ? 28 : 14} />
        {big && <span className="text-xs">{tx({ en: "File could not be loaded", ar: "تعذر تحميل الملف" })}</span>}
      </span>
    );
  }

  if (isPdf(file)) {
    return (
      <span className={tile}>
        <span className="text-red-500">
          <PdfIcon size={big ? 36 : 16} />
        </span>
        {big ? (
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg bg-prime-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-prime-500"
          >
            {tx({ en: "Open PDF", ar: "فتح ملف PDF" })}
          </a>
        ) : (
          <span className="text-[10px] font-bold">PDF</span>
        )}
      </span>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={file.url} alt="" onError={() => setBroken(true)} className={`${big ? "object-contain" : "object-cover"} ${className}`} />;
}

/** First attachment as a thumbnail plus "+N"; opens the lightbox. */
export function FileThumbs({ ids, onOpen }: { ids: string[]; onOpen: () => void }) {
  const { tx } = useT();
  if (ids.length === 0) return <span className="text-neutral-400">-</span>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label={tx({ en: `View ${ids.length} attachments`, ar: `عرض ${ids.length} مرفقات` })}
      className="group flex items-center gap-2"
    >
      <span className="block h-9 w-12 shrink-0 overflow-hidden rounded-md border border-neutral-200 shadow-sm transition-transform group-hover:-translate-y-0.5 dark:border-neutral-700">
        <FileView id={ids[0]} size="thumb" className="h-full w-full" />
      </span>
      {ids.length > 1 && <span dir="ltr" className="text-xs font-semibold text-prime-600 group-hover:underline dark:text-prime-400">+{ids.length - 1}</span>}
    </button>
  );
}

/** Big viewer with a thumbnail strip, for detail dialogs. Clicking the viewer zooms. */
export function FileGallery({ ids, empty, onZoom }: { ids: string[]; empty: string; onZoom: (i: number) => void }) {
  const { tx } = useT();
  const [i, setI] = useState(0);
  if (ids.length === 0) return <p className="rounded-xl bg-neutral-50 py-10 text-center text-sm text-neutral-400 dark:bg-neutral-800/60">{empty}</p>;
  const at = Math.min(i, ids.length - 1);
  return (
    <div className="space-y-2">
      {/* A div, not a button: a PDF tile inside holds its own "Open PDF" link. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onZoom(at)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onZoom(at))}
        className="block w-full cursor-zoom-in overflow-hidden rounded-xl bg-neutral-100 outline-none focus-visible:ring-4 focus-visible:ring-prime-500/20 dark:bg-neutral-800"
        aria-label={tx({ en: "Enlarge", ar: "تكبير" })}
      >
        <FileView key={ids[at]} id={ids[at]} size="large" className="h-64 w-full sm:h-80" />
      </div>
      {ids.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {ids.map((id, idx) => (
            <button
              key={id}
              type="button"
              onClick={() => setI(idx)}
              className={`h-12 w-16 overflow-hidden rounded-md border-2 transition-colors ${idx === at ? "border-prime-500" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <FileView id={id} size="thumb" className="h-full w-full" />
            </button>
          ))}
          <span dir="ltr" className="ms-auto text-xs text-neutral-500">
            {at + 1} / {ids.length}
          </span>
        </div>
      )}
    </div>
  );
}

/** The shared Lightbox over a list of file ids. */
export function FileLightbox({ ids, start, onClose }: { ids: string[]; start: number; onClose: () => void }) {
  return (
    <Lightbox
      count={ids.length}
      start={start}
      onClose={onClose}
      render={(i) => <FileView key={ids[i]} id={ids[i]} size="lightbox" className="max-h-[85vh] min-h-64 w-full max-w-5xl rounded-lg" />}
    />
  );
}
