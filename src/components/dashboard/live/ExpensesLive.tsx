"use client";

// Expense Invoices: there is no expenses module in the API. This section reads
// the maintenance records (GET /maintenance): vendor, cost, category and the
// invoice photos or PDFs the driver attached. Filters from, to, vehicleId and
// driverId go to the server; the totals cover the whole filtered range, not
// just the page on screen. Read-only: records are corrected or completed in
// Maintenance.

import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import DataTable, { Badge } from "@/components/dashboard/DataTable";
import { Block, Page, Status, toggleCard } from "@/components/dashboard/ModulePage";
import { FilterBar } from "@/components/dashboard/RecordTools";
import { FileLightbox, FileThumbs } from "@/components/dashboard/live/Evidence";
import { APPROVAL_TYPE_LABEL, DriverCell, LiveState, Pager, Refreshing, VehicleCell, useDebounced, useFleetOptions } from "@/components/dashboard/live/LiveKit";
import { api } from "@/lib/api/client";
import { useApi, useApiPage } from "@/lib/api/hooks";
import type { ApiMaintenance } from "@/lib/api/types";
import { STATUS, fmtDate, fmtSAR } from "@/lib/fleet-data";
import { downloadCsv, fetchAllPages, type ExportColumn } from "@/lib/export";
import { useT } from "@/lib/translations";

const PAGE_SIZE = 20;
/** The API's page limit, and how many pages the totals read before saying "partial". */
const TOTALS_PAGE = 100;
const TOTALS_MAX_PAGES = 10;

type Totals = { spend: number; emergencySpend: number; missing: number; count: number; partial: boolean };

export default function ExpensesLive() {
  const { tx, language } = useT();

  const [emergency, setEmergency] = useState("");
  const [status, setStatus] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lightbox, setLightbox] = useState<{ ids: string[]; start: number } | null>(null);
  const q = useDebounced(search.trim());
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const query = { status, emergency, vehicleId, driverId, from, to, search: q };
  const key = JSON.stringify(query);

  const { items, total, loading, fetching, error, reload } = useApiPage(() => api.page<ApiMaintenance>("/maintenance", { ...query, page, pageSize: PAGE_SIZE }), JSON.stringify([key, page]));

  const totals = useApi<Totals>(async () => {
    let spend = 0;
    let emergencySpend = 0;
    let missing = 0;
    let count = 0;
    let all = 0;
    let partial = false;
    for (let p = 1; p <= TOTALS_MAX_PAGES; p++) {
      const res = await api.page<ApiMaintenance>("/maintenance", { ...query, page: p, pageSize: TOTALS_PAGE });
      all = res.total;
      for (const m of res.items) {
        spend += m.cost;
        if (m.emergency) emergencySpend += m.cost;
        if (m.invoicePhotos.length === 0) missing += 1;
        count += 1;
      }
      if (count >= all) break;
      if (p === TOTALS_MAX_PAGES) partial = true;
    }
    return { spend, emergencySpend, missing, count: all, partial };
  }, key);

  const { vehicleOptions, driverOptions } = useFleetOptions();

  // Export: every invoice matching the current filters, dates as yyyy-mm-dd and
  // amounts as plain numbers so a spreadsheet can sum and sort them.
  const exportColumns: ExportColumn<ApiMaintenance>[] = [
    { header: { en: "Ref.", ar: "المرجع" }, value: (m) => m.ref },
    { header: { en: "Date", ar: "التاريخ" }, value: (m) => m.date },
    { header: { en: "Category", ar: "الفئة" }, value: (m) => tx(APPROVAL_TYPE_LABEL[m.category]) },
    { header: { en: "Emergency", ar: "طارئة" }, value: (m) => (m.emergency ? tx({ en: "Yes", ar: "نعم" }) : tx({ en: "No", ar: "لا" })) },
    { header: { en: "Vehicle", ar: "المركبة" }, value: (m) => m.vehicle?.plateNumber },
    { header: { en: "Driver", ar: "السائق" }, value: (m) => (m.driver ? tx(m.driver.name) : "") },
    { header: { en: "Vendor", ar: "المورد" }, value: (m) => m.vendor },
    { header: { en: "Work done", ar: "العمل المنجز" }, value: (m) => m.description },
    { header: { en: "Amount (SAR)", ar: "المبلغ (ر.س)" }, value: (m) => m.cost },
    { header: { en: "Invoice files", ar: "ملفات الفاتورة" }, value: (m) => m.invoicePhotos.length },
    { header: { en: "Status", ar: "الحالة" }, value: (m) => tx(STATUS[m.status].label) },
  ];
  const onExport = async () => downloadCsv("expense-invoices", tx, await fetchAllPages<ApiMaintenance>("/maintenance", query), exportColumns);

  const shown = items;
  const filtered = Boolean(emergency || status || vehicleId || driverId || from || to || q);
  const t = totals.data;
  const money = (n: number | undefined) => (n === undefined ? "-" : fmtSAR(n, language));

  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const emergencyOptions = [
    { value: "true", label: tx({ en: "Emergency", ar: "طارئة" }) },
    { value: "false", label: tx({ en: "Planned", ar: "مخططة" }) },
  ];
  const statusOptions = [
    { value: "inProgress", label: tx({ en: "In progress", ar: "قيد التنفيذ" }) },
    { value: "completed", label: tx({ en: "Completed", ar: "مكتمل" }) },
  ];

  return (
    <Page
      moduleKey="expenses"
      onExport={onExport}
      subtitle={{
        en: "Workshop invoices from the maintenance records: vendor, cost, category and the attached invoice.",
        ar: "فواتير الورش من سجلات الصيانة: المورد والتكلفة والفئة والفاتورة المرفقة.",
      }}
      stats={[
        {
          label: filtered ? { en: "Spend (this selection)", ar: "الإنفاق (هذا التحديد)" } : { en: "Total spend", ar: "إجمالي الإنفاق" },
          value: t ? `${money(t.spend)}${t.partial ? "+" : ""}` : "-",
        },
        { label: { en: "Invoices", ar: "الفواتير" }, value: t ? String(t.count) : "-", tone: "info" },
        { label: { en: "Emergency repairs", ar: "إصلاحات طارئة" }, value: money(t?.emergencySpend), tone: "bad", ...toggleCard(emergency, "true", filter(setEmergency)) },
        { label: { en: "Missing invoice", ar: "بدون فاتورة" }, value: t ? String(t.missing) : "-", tone: "warn" },
      ]}
    >
      <Block>
        <FilterBar
          search={search}
          onSearch={filter(setSearch)}
          searchPlaceholder={tx({ en: "Search ref, work done or vendor…", ar: "ابحث بالمرجع أو العمل المنجز أو المورد…" })}
          filters={[
            { label: tx({ en: "Planned and emergency", ar: "مخططة وطارئة" }), value: emergency, onChange: filter(setEmergency), options: emergencyOptions },
            { label: tx({ en: "All statuses", ar: "كل الحالات" }), value: status, onChange: filter(setStatus), options: statusOptions },
            { label: tx({ en: "All vehicles", ar: "كل المركبات" }), value: vehicleId, onChange: filter(setVehicleId), options: vehicleOptions },
            { label: tx({ en: "All drivers", ar: "كل السائقين" }), value: driverId, onChange: filter(setDriverId), options: driverOptions },
          ]}
          from={from}
          to={to}
          onFrom={filter(setFrom)}
          onTo={filter(setTo)}
          shown={shown.length}
          total={total}
          onClear={() => {
            setEmergency("");
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
            title={tx({ en: "Invoices", ar: "الفواتير" })}
            searchable={false}
            empty={
              filtered
                ? tx({ en: "No invoices match these filters.", ar: "لا توجد فواتير مطابقة لعوامل التصفية." })
                : tx({ en: "No invoices yet. They appear when drivers submit maintenance records.", ar: "لا توجد فواتير بعد. تظهر عندما يرسل السائقون سجلات الصيانة." })
            }
            headers={[
              tx({ en: "Ref.", ar: "المرجع" }),
              tx({ en: "Date", ar: "التاريخ" }),
              tx({ en: "Category", ar: "الفئة" }),
              tx({ en: "Vehicle", ar: "المركبة" }),
              tx({ en: "Driver", ar: "السائق" }),
              tx({ en: "Vendor", ar: "المورد" }),
              tx({ en: "Amount", ar: "المبلغ" }),
              tx({ en: "Invoice", ar: "الفاتورة" }),
              tx({ en: "Status", ar: "الحالة" }),
            ]}
            rows={shown.map((m) => ({
              key: m.id,
              cells: [
                <span key="ref" dir="ltr" className="font-semibold text-foreground">{m.ref}</span>,
                fmtDate(m.date, language),
                <span key="c" className="flex flex-wrap items-center gap-1.5">
                  {tx(APPROVAL_TYPE_LABEL[m.category])}
                  {m.emergency && <Badge label={tx({ en: "Emergency", ar: "طارئة" })} tone="bad" />}
                </span>,
                <VehicleCell key="v" vehicle={m.vehicle} />,
                <DriverCell key="d" driver={m.driver} />,
                <span key="w" className="block min-w-40 whitespace-normal">
                  {m.vendor}
                  <span className="line-clamp-1 block text-xs text-neutral-500">{m.description}</span>
                </span>,
                <span key="a" className="font-semibold text-foreground">{fmtSAR(m.cost, language)}</span>,
                m.invoicePhotos.length > 0 ? (
                  <FileThumbs key="inv" ids={m.invoicePhotos} onOpen={() => setLightbox({ ids: m.invoicePhotos, start: 0 })} />
                ) : (
                  <Badge key="inv" label={tx({ en: "Missing", ar: "غير مرفقة" })} tone="warn" />
                ),
                <Status key="s" code={m.status} />,
              ],
            }))}
          />
          <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </LiveState>
      </Block>

      <AnimatePresence>{lightbox && <FileLightbox key="lb" ids={lightbox.ids} start={lightbox.start} onClose={closeLightbox} />}</AnimatePresence>
    </Page>
  );
}
