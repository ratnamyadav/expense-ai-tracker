"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";

function getCurrentMonth() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SummaryPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [format, setFormat] = useState<"csv" | "xlsx" | "pdf">("csv");

  const summaryQuery = trpc.summary.get.useQuery({ month });
  const subscriptionQuery = trpc.subscription.get.useQuery();

  const exportMutation = trpc.export.file.useMutation({
    onSuccess: (data) => {
      if (data.format === "csv" && data.csv) {
        const blob = new Blob([data.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `transactions-${month}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      if (data.base64) {
        const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
        const mime =
          data.format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        const blob = new Blob([bytes], { type: mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `transactions-${month}.${data.format}`;
        link.click();
        URL.revokeObjectURL(url);
      }
    },
  });

  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Month</p>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="mt-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as "csv" | "xlsx" | "pdf")}
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              type="button"
              onClick={() => exportMutation.mutate({ month, format })}
              disabled={!subscriptionQuery.data?.features.canExport}
              className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Export (Pro)
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Total income</p>
          <p className="mt-2 text-3xl font-semibold">
            {summary ? formatCurrency(summary.totalIncome) : "--"}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Total expense</p>
          <p className="mt-2 text-3xl font-semibold">
            {summary ? formatCurrency(summary.totalExpense) : "--"}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Net balance</p>
          <p className="mt-2 text-3xl font-semibold">
            {summary ? formatCurrency(summary.netBalance) : "--"}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold">Category breakdown</h3>
        <div className="mt-4 space-y-2">
          {summary?.categoryBreakdown.map((item) => (
            <div
              key={item.category}
              className="flex items-center justify-between rounded-2xl border border-white/10 px-3 py-2 text-sm"
            >
              <span>{item.category}</span>
              <span>{formatCurrency(item.total)}</span>
            </div>
          )) ?? <p className="text-white/50">No expenses logged yet.</p>}
        </div>
      </div>
    </div>
  );
}
