"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DataTable, { StatusBadge } from "@/components/dashboard/DataTable";
import InventoryModal from "@/components/dashboard/InventoryModal";
import {
  INITIAL_INVENTORY,
  LOW_STOCK_THRESHOLD,
  UNITS_PER_CARTON,
  type InventoryRow,
} from "@/lib/dashboard-data";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(amount: number) {
  return amount > 0 ? `AED ${amount.toLocaleString()}` : "—";
}

let nextId = INITIAL_INVENTORY.length + 1;

function EditIcon() {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
    </svg>
  );
}

/** Delete button that asks for a second click within 2.5s before it fires. */
function DeleteButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 2500);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <motion.button
      type="button"
      layout
      onClick={() => (confirming ? onConfirm() : setConfirming(true))}
      aria-label={confirming ? `Confirm delete ${label}` : `Delete ${label}`}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
        confirming
          ? "bg-prime-600 text-white"
          : "text-neutral-400 hover:bg-prime-50 hover:text-prime-600 dark:hover:bg-prime-950/40 dark:hover:text-prime-400"
      }`}
    >
      <TrashIcon />
      {confirming && "Confirm?"}
    </motion.button>
  );
}

/** Real Inventory module: a live table plus a "New Inventory" entry modal. */
export default function InventoryView() {
  const [rows, setRows] = useState<InventoryRow[]>(INITIAL_INVENTORY);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryRow | null>(null);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: InventoryRow) {
    setEditing(row);
    setModalOpen(true);
  }

  function handleSave(row: Omit<InventoryRow, "id">) {
    if (editing) {
      setRows((prev) =>
        prev.map((r) => (r.id === editing.id ? { id: editing.id, ...row } : r)),
      );
    } else {
      setRows((prev) => [{ id: `inv-${nextId++}`, ...row }, ...prev]);
    }
    setModalOpen(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-6xl space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Warehouse Stock</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Track and add stock across every branch.
          </p>
        </div>
        <motion.button
          onClick={openNew}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 rounded-lg bg-prime-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-prime-500"
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Stock Entry
        </motion.button>
      </div>

      <DataTable
        title={`Stock Ledger (${rows.length})`}
        headers={[
          "Date",
          "Item",
          "Carton",
          "Pieces",
          "Supplier",
          "Credit",
          "Debit",
          "Warehouse",
          "Status",
          "Actions",
        ]}
        rows={rows.map((r) => ({
          key: r.id,
          cells: [
            formatDate(r.date),
            r.item,
            r.carton,
            r.pieces,
            r.supplier,
            formatMoney(r.credit),
            formatMoney(r.debit),
            r.warehouse,
            <StatusBadge
              key="s"
              status={
                r.carton * UNITS_PER_CARTON + r.pieces < LOW_STOCK_THRESHOLD
                  ? "LOW"
                  : "OK"
              }
            />,
            <div key="a" className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => openEdit(r)}
                aria-label={`Edit ${r.item}`}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              >
                <EditIcon />
              </button>
              <DeleteButton label={r.item} onConfirm={() => handleDelete(r.id)} />
            </div>,
          ],
        }))}
      />

      <AnimatePresence>
        {modalOpen && (
          <InventoryModal
            initial={editing ?? undefined}
            onClose={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
