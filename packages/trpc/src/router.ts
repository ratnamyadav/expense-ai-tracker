import {
  MonthlySummarySchema,
  ParseRequestSchema,
  ParsedTransactionSchema,
  SubscriptionSchema,
  TransactionInputSchema,
  TransactionListSchema,
  TransactionSchema,
  TransactionUpdateSchema
} from "@acme/api";
import { parseTransactionLocally } from "@acme/api";
import { schema } from "@acme/db";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { TrpcContext } from "./context";
import { z } from "zod";
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as XLSX from "xlsx";
import { Buffer } from "node:buffer";
import { checkRateLimit } from "./rate-limit";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson
});

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new Error("UNAUTHORIZED");
  }
  return next({
    ctx: {
      userId: ctx.userId,
      db: ctx.db
    }
  });
});

const authedProcedure = t.procedure.use(isAuthed);

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
    endString: end.toISOString().slice(0, 10)
  };
}

function serializeTransaction(row: typeof schema.transaction.$inferSelect) {
  return TransactionSchema.parse({
    id: row.id,
    userId: row.userId,
    type: row.type,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category ?? null,
    subcategory: row.subcategory ?? null,
    paymentMode: row.paymentMode,
    date: typeof row.date === "string" ? row.date : row.date.toISOString().slice(0, 10),
    notes: row.notes ?? null,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  });
}

async function ensureSubscription(ctx: TrpcContext, userId: string) {
  const existing = await ctx.db.query.subscription.findFirst({
    where: (subscription, { eq }) => eq(subscription.userId, userId)
  });

  if (existing) {
    return existing;
  }

  const [created] = await ctx.db
    .insert(schema.subscription)
    .values({
      userId,
      status: "free",
      plan: "free",
      entriesLimit: 50,
      entriesUsed: 0
    })
    .returning();

  return created;
}

async function incrementUsage(ctx: TrpcContext, userId: string, date: string) {
  const subscription = await ensureSubscription(ctx, userId);
  const range = getMonthRange(date.slice(0, 7));
  if (!range) {
    return subscription;
  }

  const [{ count }] = await ctx.db
    .select({ count: sql<number>`count(*)` })
    .from(schema.transaction)
    .where(
      and(
        eq(schema.transaction.userId, userId),
        gte(schema.transaction.date, range.startString),
        lte(schema.transaction.date, range.endString)
      )
    );

  const [updated] = await ctx.db
    .update(schema.subscription)
    .set({ entriesUsed: Number(count), updatedAt: new Date() })
    .where(eq(schema.subscription.id, subscription.id))
    .returning();

  return updated;
}

export const appRouter = t.router({
  health: t.procedure.query(() => ({
    ok: true,
    app: "trpc",
    timestamp: new Date().toISOString()
  })),
  ai: t.router({
    parseTransaction: authedProcedure
      .input(ParseRequestSchema)
      .mutation(async ({ ctx, input }) => {
        const rate = checkRateLimit(ctx.userId);
        if (!rate.allowed) {
          throw new Error("RATE_LIMITED");
        }
        const local = parseTransactionLocally(input.text);
        const shouldFallback =
          local.amount === null || local.type === null || local.confidence < 0.7;

        let result = local;
        if (shouldFallback && process.env.OPENAI_API_KEY) {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "Return a JSON object that matches the required schema. Do not include markdown or commentary."
                },
                {
                  role: "user",
                  content: `Extract a transaction and return JSON only. Message: "${input.text}"`
                }
              ],
              response_format: { type: "json_object" },
              temperature: 0.2
            })
          });

          if (response.ok) {
            const data = (await response.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              const parsed = JSON.parse(content) as Partial<typeof result>;
              result = ParsedTransactionSchema.parse({
                type: parsed.type ?? null,
                amount: parsed.amount ?? null,
                currency: "INR",
                category: parsed.category ?? null,
                subcategory: parsed.subcategory ?? null,
                payment_mode: parsed.payment_mode ?? null,
                date: parsed.date ?? null,
                confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
                needs_confirmation: true
              });
            }
          }
        }

        await ctx.db.insert(schema.aiLog).values({
          userId: ctx.userId,
          input: input.text,
          output: result,
          provider: result === local ? "local" : "openai",
          confidence: String(result.confidence)
        });

        return ParsedTransactionSchema.parse(result);
      })
  }),
  transactions: t.router({
    list: authedProcedure
      .input(z.object({ month: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const month = input?.month;
        const where = month
          ? (() => {
              const range = getMonthRange(month.slice(0, 7));
              if (!range) {
                return eq(schema.transaction.userId, ctx.userId);
              }
              return and(
                eq(schema.transaction.userId, ctx.userId),
                gte(schema.transaction.date, range.startString),
                lte(schema.transaction.date, range.endString)
              );
            })()
          : eq(schema.transaction.userId, ctx.userId);

        const items = await ctx.db.query.transaction.findMany({
          where,
          orderBy: (transaction, { desc }) => [desc(transaction.date)]
        });

        return TransactionListSchema.parse({
          items: items.map(serializeTransaction)
        });
      }),
    create: authedProcedure
      .input(TransactionInputSchema)
      .mutation(async ({ ctx, input }) => {
        const subscription = await ensureSubscription(ctx, ctx.userId);
        if (subscription.status !== "active" && subscription.status !== "trial") {
          const range = getMonthRange(input.date.slice(0, 7));
          if (range) {
            const [{ count }] = await ctx.db
              .select({ count: sql<number>`count(*)` })
              .from(schema.transaction)
              .where(
                and(
                  eq(schema.transaction.userId, ctx.userId),
                  gte(schema.transaction.date, range.startString),
                  lte(schema.transaction.date, range.endString)
                )
              );

            if (Number(count) >= subscription.entriesLimit) {
              throw new Error("MONTHLY_LIMIT");
            }
          }
        }

        const [created] = await ctx.db
          .insert(schema.transaction)
          .values({
            userId: ctx.userId,
            type: input.type,
            amount: input.amount.toFixed(2),
            currency: input.currency,
            category: input.category ?? null,
            subcategory: input.subcategory ?? null,
            paymentMode: input.paymentMode,
            date: input.date,
            notes: input.notes ?? null,
            source: input.source
          })
          .returning();

        await incrementUsage(ctx, ctx.userId, input.date);

        return serializeTransaction(created);
      }),
    update: authedProcedure
      .input(
        TransactionUpdateSchema.extend({
          id: TransactionSchema.shape.id
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updates: Record<string, unknown> = {
          updatedAt: new Date()
        };
        if (input.type) updates.type = input.type;
        if (input.amount !== undefined) updates.amount = input.amount.toFixed(2);
        if (input.currency) updates.currency = input.currency;
        if (input.category !== undefined) updates.category = input.category;
        if (input.subcategory !== undefined) updates.subcategory = input.subcategory;
        if (input.paymentMode) updates.paymentMode = input.paymentMode;
        if (input.date) updates.date = input.date;
        if (input.notes !== undefined) updates.notes = input.notes;
        if (input.source) updates.source = input.source;

        const [updated] = await ctx.db
          .update(schema.transaction)
          .set(updates)
          .where(
            and(
              eq(schema.transaction.id, input.id),
              eq(schema.transaction.userId, ctx.userId)
            )
          )
          .returning();

        if (!updated) {
          throw new Error("NOT_FOUND");
        }

        const updatedDate =
          typeof updated.date === "string"
            ? updated.date
            : updated.date.toISOString().slice(0, 10);
        await incrementUsage(ctx, ctx.userId, updatedDate);

        return serializeTransaction(updated);
      }),
    delete: authedProcedure
      .input(TransactionSchema.pick({ id: true }))
      .mutation(async ({ ctx, input }) => {
        const [deleted] = await ctx.db
          .delete(schema.transaction)
          .where(
            and(
              eq(schema.transaction.id, input.id),
              eq(schema.transaction.userId, ctx.userId)
            )
          )
          .returning();

        if (!deleted) {
          throw new Error("NOT_FOUND");
        }

        const deletedDate =
          typeof deleted.date === "string"
            ? deleted.date
            : deleted.date.toISOString().slice(0, 10);
        await incrementUsage(ctx, ctx.userId, deletedDate);

        return { ok: true };
      })
  }),
  summary: t.router({
    get: authedProcedure
      .input(z.object({ month: z.string() }))
      .query(async ({ ctx, input }) => {
        const range = getMonthRange(input.month);
        if (!range) {
          throw new Error("INVALID_MONTH");
        }

        const items = await ctx.db.query.transaction.findMany({
          where: and(
            eq(schema.transaction.userId, ctx.userId),
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

        return MonthlySummarySchema.parse({
          month: input.month,
          totalIncome,
          totalExpense,
          netBalance: totalIncome - totalExpense,
          categoryBreakdown: Array.from(breakdown.entries()).map(
            ([category, total]) => ({ category, total })
          )
        });
      })
  }),
  subscription: t.router({
    get: authedProcedure.query(async ({ ctx }) => {
      const subscription = await ensureSubscription(ctx, ctx.userId);
      const isPro = subscription.status === "active" || subscription.status === "trial";
      return SubscriptionSchema.parse({
        status: subscription.status,
        plan: subscription.plan,
        provider: subscription.provider,
        entriesLimit: subscription.entriesLimit,
        entriesUsed: subscription.entriesUsed,
        currentPeriodStart: subscription.currentPeriodStart
          ? subscription.currentPeriodStart.toISOString()
          : null,
        currentPeriodEnd: subscription.currentPeriodEnd
          ? subscription.currentPeriodEnd.toISOString()
          : null,
        features: {
          canExport: isPro,
          unlimitedEntries: isPro
        }
      });
    })
  }),
  export: t.router({
    file: authedProcedure
      .input(z.object({ month: z.string(), format: z.enum(["csv", "xlsx", "pdf"]) }))
      .mutation(async ({ ctx, input }) => {
        const subscription = await ensureSubscription(ctx, ctx.userId);
        if (subscription.status !== "active" && subscription.status !== "trial") {
          throw new Error("UPGRADE_REQUIRED");
        }

        const range = getMonthRange(input.month);
        if (!range) {
          throw new Error("INVALID_MONTH");
        }

        const items = await ctx.db.query.transaction.findMany({
          where: and(
            eq(schema.transaction.userId, ctx.userId),
            gte(schema.transaction.date, range.startString),
            lte(schema.transaction.date, range.endString)
          ),
          orderBy: (transaction, { desc }) => [desc(transaction.date)]
        });

        const headers = [
          "date",
          "type",
          "amount",
          "currency",
          "category",
          "subcategory",
          "paymentMode",
          "notes"
        ];
        const rows = items.map((item) => [
          item.date,
          item.type,
          item.amount,
          item.currency,
          item.category ?? "",
          item.subcategory ?? "",
          item.paymentMode,
          item.notes ?? ""
        ]);

        if (input.format === "xlsx") {
          const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
          const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
          return {
            format: "xlsx",
            base64: Buffer.from(buffer).toString("base64")
          };
        }

        if (input.format === "pdf") {
          const pdf = await PDFDocument.create();
          const page = pdf.addPage();
          const font = await pdf.embedFont(StandardFonts.Helvetica);
          let y = page.getHeight() - 40;

          page.drawText(`Transactions for ${input.month}`, {
            x: 40,
            y,
            size: 16,
            font
          });
          y -= 24;

          for (const row of rows) {
            const line = row.map((value) => String(value ?? "")).join(" | ");
            page.drawText(line.slice(0, 120), { x: 40, y, size: 12, font });
            y -= 18;
            if (y < 40) {
              y = page.getHeight() - 40;
              pdf.addPage();
            }
          }

          const pdfBytes = await pdf.save();
          return {
            format: "pdf",
            base64: Buffer.from(pdfBytes).toString("base64")
          };
        }

        const csv = [headers, ...rows]
          .map((row) =>
            row
              .map((value) =>
                `"${String(value ?? "").replace(/"/g, '""')}"`
              )
              .join(",")
          )
          .join("\n");

        return { format: "csv", csv };
      })
  }),
  account: t.router({
    acceptConsent: authedProcedure
      .input(z.object({ version: z.string().default("v1") }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db
          .update(schema.user)
          .set({ consentAcceptedAt: new Date(), consentVersion: input.version })
          .where(eq(schema.user.id, ctx.userId));

        return { ok: true };
      }),
    delete: authedProcedure.mutation(async ({ ctx }) => {
      await ctx.db.delete(schema.user).where(eq(schema.user.id, ctx.userId));
      return { ok: true };
    })
  })
});

export type AppRouter = typeof appRouter;
