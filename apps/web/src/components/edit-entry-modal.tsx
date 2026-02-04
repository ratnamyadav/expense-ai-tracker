"use client";

import {
  Categories,
  PaymentModeSchema,
  TransactionTypeSchema
} from "@acme/api";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogOverlay } from "./ui/dialog";

export type EditableEntry = {
  type: "expense" | "income" | "refund";
  amount: number;
  category: string | null;
  subcategory: string | null;
  date: string;
  paymentMode: "cash" | "upi" | "card" | "bank" | "wallet" | "unknown";
  notes: string | null;
};

export function EditEntryModal({
  open,
  value,
  onClose,
  onSave
}: {
  open: boolean;
  value: EditableEntry;
  onClose: () => void;
  onSave: (value: EditableEntry) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value, open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogOverlay />
      <DialogContent>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Edit entry</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-white/60"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-sm text-white/70">
            Type
            <select
              value={draft.type}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  type: TransactionTypeSchema.parse(event.target.value)
                })
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2"
            >
              {TransactionTypeSchema.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-white/70">
            Amount
            <input
              type="number"
              value={draft.amount}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  amount: Number(event.target.value)
                })
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2"
            />
          </label>

          <label className="block text-sm text-white/70">
            Category
            <select
              value={draft.category ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  category: event.target.value || null
                })
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2"
            >
              <option value="">Uncategorized</option>
              {Categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-white/70">
            Date
            <input
              type="date"
              value={draft.date}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  date: event.target.value
                })
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2"
            />
          </label>

          <label className="block text-sm text-white/70">
            Payment mode
            <select
              value={draft.paymentMode}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  paymentMode: PaymentModeSchema.parse(event.target.value)
                })
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2"
            >
              {PaymentModeSchema.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-white/70">
            Notes
            <textarea
              value={draft.notes ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  notes: event.target.value || null
                })
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2"
              rows={3}
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Save changes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
