import { ensureSubscription, incrementUsage } from "@/lib/ai";
import { serializeTransaction } from "@/lib/serializers";
import { requireUser } from "@/lib/session";
import { TransactionInputSchema, TransactionListSchema } from "@acme/api";
import { getDb, schema } from "@acme/db";
import { and, eq, gte, lte, sql } from "drizzle-orm";

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
  const db = getDb();

  const where = month
    ? (() => {
        const range = getMonthRange(month);
        if (!range) {
          return eq(schema.transaction.userId, user.id);
        }
        return and(
          eq(schema.transaction.userId, user.id),
          gte(schema.transaction.date, range.startString),
          lte(schema.transaction.date, range.endString),
        );
      })()
    : eq(schema.transaction.userId, user.id);

  const items = await db.query.transaction.findMany({
    where,
    orderBy: (transaction, { desc }) => [desc(transaction.date)],
  });

  const payload = TransactionListSchema.parse({
    items: items.map(serializeTransaction),
  });

  return Response.json(payload);
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const input = TransactionInputSchema.parse(body);

  const subscription = await ensureSubscription(user.id);
  if (subscription.status !== "active" && subscription.status !== "trial") {
    const range = getMonthRange(input.date.slice(0, 7));
    if (range) {
      const db = getDb();
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.transaction)
        .where(
          and(
            eq(schema.transaction.userId, user.id),
            gte(schema.transaction.date, range.startString),
            lte(schema.transaction.date, range.endString),
          ),
        );

      if (Number(count) >= subscription.entriesLimit) {
        return new Response("Monthly limit reached. Upgrade to Pro.", {
          status: 402,
        });
      }
    }
  }

  const db = getDb();
  const [created] = await db
    .insert(schema.transaction)
    .values({
      userId: user.id,
      type: input.type,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      category: input.category ?? null,
      subcategory: input.subcategory ?? null,
      paymentMode: input.paymentMode,
      date: input.date,
      notes: input.notes ?? null,
      source: input.source,
    })
    .returning();

  await incrementUsage(user.id, input.date);

  return Response.json(serializeTransaction(created));
}
