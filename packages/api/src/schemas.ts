import { z } from "zod";

export const HealthSchema = z.object({
  ok: z.boolean(),
  app: z.string(),
  timestamp: z.string()
});

export type Health = z.infer<typeof HealthSchema>;

export const TransactionTypeSchema = z.enum(["expense", "income", "refund"]);
export const PaymentModeSchema = z.enum([
  "cash",
  "upi",
  "card",
  "bank",
  "wallet",
  "unknown"
]);

export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/);

export const ParsedTransactionSchema = z.object({
  type: TransactionTypeSchema.nullable(),
  amount: z.number().nullable(),
  currency: z.literal("INR"),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  payment_mode: PaymentModeSchema.nullable(),
  date: DateStringSchema.nullable(),
  confidence: z.number().min(0).max(1),
  needs_confirmation: z.boolean()
});

export type ParsedTransaction = z.infer<typeof ParsedTransactionSchema>;

export const TransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: TransactionTypeSchema,
  amount: z.number(),
  currency: z.string(),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  paymentMode: PaymentModeSchema,
  date: DateStringSchema,
  notes: z.string().nullable(),
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const TransactionInputSchema = z.object({
  type: TransactionTypeSchema,
  amount: z.number(),
  currency: z.string().default("INR"),
  category: z.string().nullable().default(null),
  subcategory: z.string().nullable().default(null),
  paymentMode: PaymentModeSchema.default("unknown"),
  date: DateStringSchema,
  notes: z.string().nullable().default(null),
  source: z.string().default("chat")
});

export const TransactionUpdateSchema = TransactionInputSchema.partial();

export const MonthlySummarySchema = z.object({
  month: z.string(),
  totalIncome: z.number(),
  totalExpense: z.number(),
  netBalance: z.number(),
  categoryBreakdown: z.array(
    z.object({
      category: z.string(),
      total: z.number()
    })
  )
});

export type MonthlySummary = z.infer<typeof MonthlySummarySchema>;

export const SubscriptionSchema = z.object({
  status: z.enum(["free", "trial", "active", "canceled", "past_due"]),
  plan: z.string(),
  provider: z.string(),
  entriesLimit: z.number(),
  entriesUsed: z.number(),
  currentPeriodStart: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
  features: z.object({
    canExport: z.boolean(),
    unlimitedEntries: z.boolean()
  })
});

export type SubscriptionStatus = z.infer<typeof SubscriptionSchema>;

export const ParseRequestSchema = z.object({
  text: z.string().min(1),
  locale: z.string().optional()
});

export const ParseResponseSchema = ParsedTransactionSchema;

export const TransactionListSchema = z.object({
  items: z.array(TransactionSchema)
});

export const ExportRequestSchema = z.object({
  month: z.string(),
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv")
});

export const ConsentSchema = z.object({
  version: z.string(),
  acceptedAt: z.string()
});

export const Categories = [
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Travel",
  "Health",
  "Salary",
  "Business",
  "Rent",
  "Other"
] as const;

export const CategorySchema = z.enum(Categories);
