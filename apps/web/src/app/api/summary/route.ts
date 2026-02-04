import { MonthlySummarySchema } from "@acme/api";
import { getDb, schema } from "@acme/db";
import { requireUser } from "@/lib/session";
import { and, eq, gte, lte } from "drizzle-orm";

function getMonthRange(month: string) {
  const [yearString, monthString] = month.split("-");
  const year = Number(yearString);
  const monthIndex = Number(monthString) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return null;
  }
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  const startString = start.toISOString().slice(0, 10);
  const endString = end.toISOString().slice(0, 10);
  return { startString, endString };
}

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!month) {
    return new Response("Month is required", { status: 400 });
  }

  const range = getMonthRange(month);
  if (!range) {
    return new Response("Invalid month", { status: 400 });
  }

  const db = getDb();
  const items = await db.query.transaction.findMany({
    where: and(
      eq(schema.transaction.userId, user.id),
      gte(schema.transaction.date, range.startString),
      lte(schema.transaction.date, range.endString)
    )
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const breakdown = new Map<string, number>();

  for (const item of items) {
    const amount = Number(item.amount);
    if (item.type === "income" || item.type === "refund") {
      totalIncome += amount;
    } else {
      totalExpense += amount;
      const category = item.category ?? "Other";
      breakdown.set(category, (breakdown.get(category) ?? 0) + amount);
    }
  }

  const payload = MonthlySummarySchema.parse({
    month,
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    categoryBreakdown: Array.from(breakdown.entries()).map(([category, total]) => ({
      category,
      total
    }))
  });

  return Response.json(payload);
}
