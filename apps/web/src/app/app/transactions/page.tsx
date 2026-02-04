"use client";

import type { Transaction } from "@acme/api";
import { EditEntryModal, type EditableEntry } from "@/components/edit-entry-modal";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

function getCurrentMonth() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function groupByDate(items: Transaction[]) {
  return items.reduce<Record<string, Transaction[]>>((acc, item) => {
    acc[item.date] = acc[item.date] ?? [];
    acc[item.date].push(item);
    return acc;
  }, {});
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(getCurrentMonth());
  const [selected, setSelected] = useState<Transaction | null>(null);

  const listQuery = trpc.transactions.list.useQuery({ month });

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", month] });
      queryClient.invalidateQueries({ queryKey: ["summary", month] });
    }
  });

  const deleteMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", month] });
      queryClient.invalidateQueries({ queryKey: ["summary", month] });
    }
  });

  const grouped = useMemo(
    () => groupByDate(listQuery.data?.items ?? []),
    [listQuery.data?.items]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Month</p>
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="mt-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white"
        />
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([date, items]) => (
          <div
            key={date}
            className="rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <h3 className="text-lg font-semibold">{date}</h3>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">
                      {item.type} - INR {item.amount}
                    </p>
                    <p className="text-white/60">
                      {item.category ?? "Uncategorized"} - {item.paymentMode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="rounded-2xl border border-white/20 px-3 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                    onClick={() => deleteMutation.mutate({ id: item.id })}
                    className="rounded-2xl border border-red-500/40 px-3 py-1 text-xs text-red-200"
                  >
                    Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <p className="text-white/50">No transactions for this month yet.</p>
        )}
      </div>

      {selected && (
        <EditEntryModal
          open={Boolean(selected)}
          value={{
            type: selected.type,
            amount: selected.amount,
            category: selected.category,
            subcategory: selected.subcategory,
            date: selected.date,
            paymentMode: selected.paymentMode,
            notes: selected.notes
          }}
          onClose={() => setSelected(null)}
          onSave={(value) => {
            updateMutation.mutate({
              id: selected.id,
              type: value.type,
              amount: value.amount,
              currency: "INR",
              category: value.category,
              subcategory: value.subcategory,
              paymentMode: value.paymentMode,
              date: value.date,
              notes: value.notes
            });
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
