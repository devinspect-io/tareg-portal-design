"use client";

import { useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import Loader from "@/components/Loader";
import CustomSelect from "@/components/dashboard/CustomSelect";
import DatePicker from "@/components/dashboard/DatePicker";
import {
  ITEM_NAMES,
  SUPPLIERS,
  WAREHOUSES,
  type InventoryRow,
} from "@/lib/dashboard-data";

type InventoryModalProps = {
  onClose: () => void;
  onSave: (row: Omit<InventoryRow, "id">) => void;
  /** Pass an existing row to edit it in place instead of creating a new one. */
  initial?: InventoryRow;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const fieldClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-prime-500 focus:ring-4 focus:ring-prime-500/10 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

const errorFieldClass =
  "border-prime-500 ring-4 ring-prime-500/10 dark:border-prime-500";

const labelClass =
  "mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300";

export default function InventoryModal({
  onClose,
  onSave,
  initial,
}: InventoryModalProps) {
  const isEditing = Boolean(initial);
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [item, setItem] = useState(initial?.item ?? "");
  const [carton, setCarton] = useState(initial ? String(initial.carton) : "");
  const [pieces, setPieces] = useState(initial ? String(initial.pieces) : "");
  const [supplier, setSupplier] = useState(initial?.supplier ?? "");
  const [credit, setCredit] = useState(
    initial?.credit ? String(initial.credit) : "",
  );
  const [debit, setDebit] = useState(
    initial?.debit ? String(initial.debit) : "",
  );
  const [warehouse, setWarehouse] = useState(initial?.warehouse ?? WAREHOUSES[0]);
  const [errors, setErrors] = useState({
    item: false,
    carton: false,
    pieces: false,
    supplier: false,
  });
  const [saving, setSaving] = useState(false);
  const shakeControls = useAnimationControls();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    const cartonNum = Number(carton);
    const piecesNum = Number(pieces);
    const nextErrors = {
      item: item.trim() === "",
      carton: carton.trim() === "" || Number.isNaN(cartonNum) || cartonNum < 0,
      pieces: pieces.trim() === "" || Number.isNaN(piecesNum) || piecesNum < 0,
      supplier: supplier.trim() === "",
    };
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      shakeControls.start({
        x: [0, -10, 10, -8, 8, -4, 4, 0],
        transition: { duration: 0.45, ease: "easeInOut" },
      });
      return;
    }

    setSaving(true);
    // Simulate a save round-trip, consistent with the rest of the app
    setTimeout(() => {
      onSave({
        date,
        item,
        carton: cartonNum,
        pieces: piecesNum,
        supplier,
        credit: Number(credit) || 0,
        debit: Number(debit) || 0,
        warehouse,
      });
    }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Shake wrapper (validation feedback) — entrance/exit lives on the inner panel */}
      <motion.div animate={shakeControls} className="relative w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full rounded-2xl border border-prime-100 bg-white p-6 shadow-[0_20px_60px_-15px_rgba(10,86,224,0.25)] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/50"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              {isEditing ? "Edit" : "New"}{" "}
              <span className="text-prime-600">Stock Entry</span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="inv-item" className={labelClass}>
                Item Name
              </label>
              <CustomSelect
                id="inv-item"
                value={item}
                onChange={(v) => {
                  setItem(v);
                  if (errors.item) setErrors((p) => ({ ...p, item: false }));
                }}
                options={ITEM_NAMES}
                placeholder="Select an item…"
                error={errors.item}
              />
            </div>

            <div>
              <label htmlFor="inv-date" className={labelClass}>
                Date
              </label>
              <DatePicker id="inv-date" value={date} onChange={setDate} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="inv-carton" className={labelClass}>
                  Carton
                </label>
                <input
                  id="inv-carton"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={carton}
                  onChange={(e) => {
                    setCarton(e.target.value);
                    if (errors.carton)
                      setErrors((p) => ({ ...p, carton: false }));
                  }}
                  className={`${fieldClass} ${errors.carton ? errorFieldClass : ""}`}
                />
              </div>
              <div>
                <label htmlFor="inv-pieces" className={labelClass}>
                  Pieces
                </label>
                <input
                  id="inv-pieces"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={pieces}
                  onChange={(e) => {
                    setPieces(e.target.value);
                    if (errors.pieces)
                      setErrors((p) => ({ ...p, pieces: false }));
                  }}
                  className={`${fieldClass} ${errors.pieces ? errorFieldClass : ""}`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="inv-supplier" className={labelClass}>
                From Supplier
              </label>
              <CustomSelect
                id="inv-supplier"
                value={supplier}
                onChange={(v) => {
                  setSupplier(v);
                  if (errors.supplier)
                    setErrors((p) => ({ ...p, supplier: false }));
                }}
                options={SUPPLIERS}
                placeholder="Select a supplier…"
                error={errors.supplier}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="inv-credit" className={labelClass}>
                  Credit
                </label>
                <input
                  id="inv-credit"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={credit}
                  onChange={(e) => setCredit(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="inv-debit" className={labelClass}>
                  Debit
                </label>
                <input
                  id="inv-debit"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={debit}
                  onChange={(e) => setDebit(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="inv-warehouse" className={labelClass}>
                Warehouse
              </label>
              <CustomSelect
                id="inv-warehouse"
                value={warehouse}
                onChange={setWarehouse}
                options={WAREHOUSES}
              />
            </div>

            {Object.values(errors).some(Boolean) && (
              <p role="alert" className="text-sm text-prime-600">
                Please select an item, a supplier, and enter valid carton/pieces
                counts.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-neutral-200 bg-white py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                disabled={saving}
                whileHover={saving ? undefined : { scale: 1.02 }}
                whileTap={saving ? undefined : { scale: 0.97 }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-prime-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-prime-500 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader size={16} className="text-white" />
                    Saving…
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Save Stock Entry"
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
