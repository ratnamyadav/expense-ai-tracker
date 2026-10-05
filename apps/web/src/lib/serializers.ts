import { type Transaction, TransactionSchema } from "@acme/api";
import type { Transaction as DbTransaction } from "@acme/db";

function toDateString(value: string | Date) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function toIsoString(value: string | Date) {
  if (typeof value === "string") {
    return new Date(value).toISOString();
  }
  return value.toISOString();
}

export function serializeTransaction(row: DbTransaction): Transaction {
  return TransactionSchema.parse({
    id: row.id,
    userId: row.userId,
    type: row.type,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category ?? null,
    subcategory: row.subcategory ?? null,
    paymentMode: row.paymentMode,
    date: toDateString(row.date),
    notes: row.notes ?? null,
    source: row.source,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  });
}
