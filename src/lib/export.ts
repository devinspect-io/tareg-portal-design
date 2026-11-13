"use client";

import { api } from "@/lib/api/client";
import type { Bi } from "@/lib/translations";

/** One spreadsheet column: header in both languages, plain-text value per row. */
export type ExportColumn<T> = { header: Bi; value: (item: T) => string | number | null | undefined };

/** The API's page limit, and how many pages an export reads at most (2,000 rows). */
const EXPORT_PAGE = 100;
const EXPORT_MAX_PAGES = 20;

/** Every row matching `query` (the screen's current filters), not just the page on screen. */
export async function fetchAllPages<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= EXPORT_MAX_PAGES; page++) {
    const res = await api.page<T>(path, { ...query, page, pageSize: EXPORT_PAGE });
    out.push(...res.items);
    if (out.length >= res.total || res.items.length === 0) break;
  }
  return out;
}

const cell = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Downloads the rows as a CSV named after the screen and today's date. The BOM
 * makes Excel read it as UTF-8, so Arabic names come through intact.
 */
export function downloadCsv<T>(name: string, tx: (b: Bi) => string, items: T[], columns: ExportColumn<T>[]) {
  const lines = [columns.map((c) => cell(tx(c.header))), ...items.map((item) => columns.map((c) => cell(c.value(item))))].map((r) => r.join(","));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `tareg-${name}-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
