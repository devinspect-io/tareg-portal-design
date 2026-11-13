"use client";

// Compliance & expiries: read-only list of driver and vehicle document
// expiries from GET /compliance. The server reads the live driver and vehicle
// records, so this page can never disagree with the Drivers and Vehicles pages.
// Inactive drivers and vehicles raise no alerts and are left out.

import { useState } from "react";
import DataTable, { Badge } from "@/components/dashboard/DataTable";
import { Block, Page, Status, toggleCard } from "@/components/dashboard/ModulePage";
import { FilterBar } from "@/components/dashboard/RecordTools";
import { DOCUMENT_LABEL, LiveState, Pager, Refreshing, countText, useDebounced } from "@/components/dashboard/live/LiveKit";
import { api } from "@/lib/api/client";
import { useApi, useApiPage } from "@/lib/api/hooks";
import type { ApiComplianceItem, ComplianceDocument } from "@/lib/api/types";
import { downloadCsv, fetchAllPages, type ExportColumn } from "@/lib/export";
import { STATUS, fmtDate } from "@/lib/fleet-data";
import { useT } from "@/lib/translations";
import { useOpenFilter } from "@/lib/open-filter";

const PAGE_SIZE = 25;

/** Days to expiry, or how long ago it expired. */
function DaysLeft({ days }: { days: number }) {
  const { tx } = useT();
  if (days < 0) return <span className="font-semibold text-red-600 dark:text-red-400">{tx({ en: `${-days} days ago`, ar: `منذ ${-days} يوم` })}</span>;
  if (days === 0) return <span className="font-semibold text-red-600 dark:text-red-400">{tx({ en: "Today", ar: "اليوم" })}</span>;
  return <span className={days <= 30 ? "font-semibold text-accent-600 dark:text-accent-400" : ""}>{tx({ en: `${days} days`, ar: `${days} يوم` })}</span>;
}

export default function ComplianceLive() {
  const { tx, language } = useT();

  const [status, setStatus] = useState(useOpenFilter("status", ["expired", "expiringSoon", "valid"]));
  const [kind, setKind] = useState("");
  const [doc, setDoc] = useState("");
  const [withinDays, setWithinDays] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  const query = { status, kind, document: doc, withinDays, search: q };
  const { items, total, loading, fetching, error, reload } = useApiPage(
    () => api.page<ApiComplianceItem>("/compliance", { ...query, page, pageSize: PAGE_SIZE }),
    JSON.stringify([status, kind, doc, withinDays, q, page]),
  );
  const counts = useApi(async () => {
    const one = (s: string) => api.page<ApiComplianceItem>("/compliance", { status: s, pageSize: 1 }).then((p) => p.total);
    const [expired, expiringSoon, valid, all] = await Promise.all([one("expired"), one("expiringSoon"), one("valid"), one("")]);
    return { expired, expiringSoon, valid, all };
  }, "counts");

  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const statusOptions = [
    { value: "expired", label: tx({ en: "Expired", ar: "منتهية" }) },
    { value: "expiringSoon", label: tx({ en: "Expiring soon", ar: "تنتهي قريبًا" }) },
    { value: "valid", label: tx({ en: "Valid", ar: "سارية" }) },
  ];
  const kindOptions = [
    { value: "driver", label: tx({ en: "Drivers", ar: "السائقون" }) },
    { value: "vehicle", label: tx({ en: "Vehicles", ar: "المركبات" }) },
  ];
  const documentOptions = (Object.keys(DOCUMENT_LABEL) as ComplianceDocument[]).map((d) => ({ value: d, label: tx(DOCUMENT_LABEL[d]) }));
  // The reminder stages (30, 7, 3, 1 days) plus a longer look ahead.
  const withinOptions = [1, 3, 7, 30, 60, 90].map((d) => ({ value: String(d), label: tx({ en: `Expiring within ${d} days`, ar: `تنتهي خلال ${d} يوم` }) }));

  // Export: every tracked document for the current filters, expiry as yyyy-mm-dd and days as a plain number (negative once expired).
  const exportColumns: ExportColumn<ApiComplianceItem>[] = [
    { header: { en: "Document", ar: "الوثيقة" }, value: (i) => tx(DOCUMENT_LABEL[i.document]) },
    { header: { en: "Holder", ar: "صاحب الوثيقة" }, value: (i) => (i.subject.name ? tx(i.subject.name) : i.subject.plateNumber) },
    { header: { en: "Type", ar: "النوع" }, value: (i) => (i.kind === "driver" ? tx({ en: "Driver", ar: "سائق" }) : tx({ en: "Vehicle", ar: "مركبة" })) },
    { header: { en: "Expiry", ar: "تاريخ الانتهاء" }, value: (i) => i.expiry },
    { header: { en: "Days remaining", ar: "الأيام المتبقية" }, value: (i) => i.daysLeft },
    { header: { en: "Reminder (days)", ar: "التذكير (أيام)" }, value: (i) => i.reminderDay },
    { header: { en: "Status", ar: "الحالة" }, value: (i) => tx(STATUS[i.status].label) },
  ];
  const onExport = async () => downloadCsv("compliance", tx, await fetchAllPages<ApiComplianceItem>("/compliance", query), exportColumns);

  const c = counts.data;
  const filtered = Boolean(status || kind || doc || withinDays || q);

  return (
    <Page
      moduleKey="compliance"
      onExport={onExport}
      subtitle={{ en: "Licenses, IDs, Iqamas, registrations, insurance and inspections, with expiry reminders.", ar: "الرخص والهويات والإقامات والاستمارات والتأمين والفحص الدوري مع تذكيرات الانتهاء." }}
      stats={[
        { label: { en: "Expired", ar: "منتهية" }, value: countText(c?.expired), tone: "bad", ...toggleCard(status, "expired", filter(setStatus)) },
        { label: { en: "Expiring in 30 days", ar: "تنتهي خلال 30 يومًا" }, value: countText(c?.expiringSoon), tone: "warn", ...toggleCard(status, "expiringSoon", filter(setStatus)) },
        { label: { en: "Valid", ar: "سارية" }, value: countText(c?.valid), tone: "good", ...toggleCard(status, "valid", filter(setStatus)) },
        { label: { en: "Documents tracked", ar: "الوثائق المتابعة" }, value: countText(c?.all), onClick: () => filter(setStatus)(""), active: false },
      ]}
    >
      <Block>
        <FilterBar
          search={search}
          onSearch={filter(setSearch)}
          searchPlaceholder={tx({ en: "Search driver name or plate…", ar: "ابحث باسم السائق أو اللوحة…" })}
          filters={[
            { label: tx({ en: "All statuses", ar: "كل الحالات" }), value: status, onChange: filter(setStatus), options: statusOptions },
            { label: tx({ en: "Drivers and vehicles", ar: "السائقون والمركبات" }), value: kind, onChange: filter(setKind), options: kindOptions },
            { label: tx({ en: "All documents", ar: "كل الوثائق" }), value: doc, onChange: filter(setDoc), options: documentOptions },
            { label: tx({ en: "Any expiry date", ar: "أي تاريخ انتهاء" }), value: withinDays, onChange: filter(setWithinDays), options: withinOptions },
          ]}
          shown={items.length}
          total={total}
          onClear={() => {
            setStatus("");
            setKind("");
            setDoc("");
            setWithinDays("");
            setSearch("");
            setPage(1);
          }}
        />
      </Block>

      <Block>
        <LiveState loading={loading} error={error} onRetry={reload}>
          <Refreshing on={fetching} />
          <DataTable
            title={tx({ en: "Document expiries", ar: "انتهاء الوثائق" })}
            searchable={false}
            empty={filtered ? tx({ en: "No documents match these filters.", ar: "لا توجد وثائق مطابقة." }) : tx({ en: "No documents to track yet.", ar: "لا توجد وثائق للمتابعة بعد." })}
            headers={[
              tx({ en: "Document", ar: "الوثيقة" }),
              tx({ en: "Holder", ar: "صاحب الوثيقة" }),
              tx({ en: "Type", ar: "النوع" }),
              tx({ en: "Expiry", ar: "تاريخ الانتهاء" }),
              tx({ en: "Remaining", ar: "المتبقي" }),
              tx({ en: "Reminder", ar: "التذكير" }),
              tx({ en: "Status", ar: "الحالة" }),
            ]}
            rows={items.map((i) => ({
              key: i.id,
              tint: i.status === "expired" ? "red" : undefined,
              cells: [
                tx(DOCUMENT_LABEL[i.document]),
                i.subject.name ? (
                  <span key="h" className="font-medium text-foreground">{tx(i.subject.name)}</span>
                ) : (
                  <span key="h" dir="ltr" className="font-medium text-foreground">{i.subject.plateNumber ?? "-"}</span>
                ),
                i.kind === "driver" ? tx({ en: "Driver", ar: "سائق" }) : tx({ en: "Vehicle", ar: "مركبة" }),
                fmtDate(i.expiry, language),
                <DaysLeft key="d" days={i.daysLeft} />,
                i.reminderDay === null ? (
                  <span key="r" className="text-neutral-400">-</span>
                ) : (
                  <Badge key="r" label={tx({ en: `${i.reminderDay}-day reminder`, ar: `تذكير ${i.reminderDay} يوم` })} tone={i.reminderDay <= 7 ? "bad" : "warn"} />
                ),
                <Status key="s" code={i.status} />,
              ],
            }))}
          />
          <Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </LiveState>
      </Block>
    </Page>
  );
}
