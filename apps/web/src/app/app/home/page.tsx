"use client";

import { EditEntryModal, type EditableEntry } from "@/components/edit-entry-modal";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useChatStore } from "@/stores/chat";
import { PaymentModeSchema, TransactionTypeSchema, parseTransactionLocally } from "@acme/api";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results?: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

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

export default function HomePage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(getCurrentMonth());
  const [input, setInput] = useState("");
  const { messages, pending, addMessage, setPending } = useChatStore();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summaryQuery = trpc.summary.get.useQuery({ month });

  const createMutation = trpc.transactions.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary", month] });
      queryClient.invalidateQueries({ queryKey: ["transactions", month] });
    },
  });

  const parseMutation = trpc.ai.parseTransaction.useMutation();

  const speechRecognition = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const SpeechRecognition =
      (
        window as typeof window & {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }
      ).SpeechRecognition ||
      (
        window as typeof window & {
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    return recognition;
  }, []);

  async function handleSend() {
    if (!input.trim()) return;
    setError(null);

    const content = input.trim();
    addMessage({ role: "user", content });
    setInput("");

    const local = parseTransactionLocally(content);
    let parsed = local;
    if (local.confidence < 0.7 || !local.amount || !local.type) {
      try {
        parsed = await parseMutation.mutateAsync({ text: content });
      } catch (err) {
        setError(err instanceof Error ? err.message : "AI parsing failed");
      }
    }

    if (!parsed.amount || !parsed.type) {
      addMessage({
        role: "assistant",
        content: "I need the amount and whether it's income or expense. Can you clarify?",
      });
      return;
    }

    addMessage({
      role: "assistant",
      content: "Here's what I parsed. Please confirm or edit before saving.",
    });

    const today = new Date().toISOString().slice(0, 10);
    setPending({
      type: TransactionTypeSchema.parse(parsed.type),
      amount: parsed.amount,
      category: parsed.category,
      subcategory: parsed.subcategory,
      date: parsed.date ?? today,
      paymentMode: parsed.payment_mode ? PaymentModeSchema.parse(parsed.payment_mode) : "unknown",
      notes: null,
    });
  }

  async function handleSave(entry: EditableEntry) {
    try {
      await createMutation.mutateAsync({
        type: entry.type,
        amount: entry.amount,
        currency: "INR",
        category: entry.category,
        subcategory: entry.subcategory,
        paymentMode: entry.paymentMode,
        date: entry.date,
        notes: entry.notes,
        source: "chat",
      });
      setPending(null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save transaction");
    }
  }

  function handleVoice() {
    if (!speechRecognition) {
      setError("Voice input isn't supported in this browser.");
      return;
    }

    speechRecognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setInput(transcript);
      }
    };
    speechRecognition.start();
  }

  const summary = summaryQuery.data;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-6">
        <Card>
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
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Net balance</p>
              <p className="text-3xl font-semibold">
                {summary ? formatCurrency(summary.netBalance) : "--"}
              </p>
              <p className="text-sm text-white/60">
                Income {summary ? formatCurrency(summary.totalIncome) : "--"} - Expense{" "}
                {summary ? formatCurrency(summary.totalExpense) : "--"}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-white/60">
                Try \"Paid 1200 rent via UPI today\" or \"Received 50,000 salary\".
              </p>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-white text-slate-900"
                    : "bg-white/10 text-white"
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>

          {pending && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Confirmation card</p>
                  <p className="text-lg font-semibold">
                    {pending.type} - INR {pending.amount}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-2xl border border-white/20 px-3 py-1 text-xs"
                >
                  Edit
                </button>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-white/70">
                <span>Category: {pending.category ?? "Uncategorized"}</span>
                <span>Date: {pending.date}</span>
                <span>Payment: {pending.paymentMode}</span>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="rounded-2xl border border-white/20 px-4 py-2 text-sm"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(pending)}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
                >
                  Save entry
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-100">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Log an expense or income..."
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={handleVoice}
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm"
            >
              Voice input
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
            >
              Send
            </button>
          </div>
          <p className="mt-3 text-xs text-white/50">
            AI suggestions are drafts only. You must confirm before saving. Voice input uses
            on-device/browser speech recognition and does not upload audio.
          </p>
        </Card>
      </section>

      <section className="space-y-6">
        <Card>
          <h3 className="text-lg font-semibold">Monthly summary</h3>
          <p className="text-sm text-white/60">Category-wise breakdown for {month}.</p>
          <div className="mt-4 space-y-2 text-sm">
            {summary?.categoryBreakdown.map((entry) => (
              <div
                key={entry.category}
                className="flex items-center justify-between rounded-2xl border border-white/10 px-3 py-2"
              >
                <span>{entry.category}</span>
                <span>{formatCurrency(entry.total)}</span>
              </div>
            )) ?? <p className="text-white/50">No expenses logged yet.</p>}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold">Pro unlocks</h3>
          <p className="mt-2 text-sm text-white/60">
            Export CSV and remove monthly limits by upgrading.
          </p>
          <button
            type="button"
            className="mt-4 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Upgrade to Pro
          </button>
        </Card>
      </section>

      {pending && (
        <EditEntryModal
          open={editing}
          value={pending}
          onClose={() => setEditing(false)}
          onSave={(value) => {
            setPending(value);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
