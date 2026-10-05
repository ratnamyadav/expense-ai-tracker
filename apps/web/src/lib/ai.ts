import { parseTransactionLocally } from "@acme/api";
import { ParseResponseSchema, type ParsedTransaction, ParsedTransactionSchema } from "@acme/api";
import { getDb, schema } from "@acme/db";
import { and, eq, gte, lte, sql } from "drizzle-orm";

const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

function buildPrompt(text: string) {
  return `You are an expense parsing assistant. Extract a single transaction from the user's message and return ONLY valid JSON matching the schema.\n\nUser message: "${text}"`;
}

async function parseWithOpenAI(text: string): Promise<ParsedTransaction | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Return a JSON object that matches the required schema. Do not include markdown or commentary.",
        },
        {
          role: "user",
          content: buildPrompt(text),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  const parsed = JSON.parse(content) as Partial<ParsedTransaction>;
  return ParsedTransactionSchema.parse({
    type: parsed.type ?? null,
    amount: parsed.amount ?? null,
    currency: "INR",
    category: parsed.category ?? null,
    subcategory: parsed.subcategory ?? null,
    payment_mode: parsed.payment_mode ?? null,
    date: parsed.date ?? null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    needs_confirmation: true,
  });
}

export async function parseTransaction({
  userId,
  text,
}: {
  userId?: string;
  text: string;
}): Promise<ParsedTransaction> {
  const local = parseTransactionLocally(text);
  const shouldFallback = local.amount === null || local.type === null || local.confidence < 0.7;

  const cloud = shouldFallback ? await parseWithOpenAI(text).catch(() => null) : null;
  const result = cloud ?? local;

  if (userId) {
    const db = getDb();
    await db.insert(schema.aiLog).values({
      userId,
      input: text,
      output: result,
      provider: cloud ? "openai" : "local",
      confidence: String(result.confidence),
    });
  }

  return ParseResponseSchema.parse(result);
}

export async function ensureSubscription(userId: string) {
  const db = getDb();
  const existing = await db.query.subscription.findFirst({
    where: (subscription, { eq }) => eq(subscription.userId, userId),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(schema.subscription)
    .values({
      userId,
      status: "free",
      plan: "free",
      entriesLimit: 50,
      entriesUsed: 0,
    })
    .returning();

  return created;
}

function getMonthRange(month: string) {
  const [yearString, monthString] = month.split("-");
  const year = Number(yearString);
  const monthIndex = Number(monthString) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return null;
  }
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    startString: start.toISOString().slice(0, 10),
    endString: end.toISOString().slice(0, 10),
  };
}

export async function incrementUsage(userId: string, date: string) {
  const db = getDb();
  const subscription = await ensureSubscription(userId);
  const range = getMonthRange(date.slice(0, 7));
  if (!range) {
    return subscription;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.transaction)
    .where(
      and(
        eq(schema.transaction.userId, userId),
        gte(schema.transaction.date, range.startString),
        lte(schema.transaction.date, range.endString),
      ),
    );

  const [updated] = await db
    .update(schema.subscription)
    .set({ entriesUsed: Number(count), updatedAt: new Date() })
    .where(eq(schema.subscription.id, subscription.id))
    .returning();

  return updated;
}
