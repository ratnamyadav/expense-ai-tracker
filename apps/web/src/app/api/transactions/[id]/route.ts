import { TransactionUpdateSchema } from "@acme/api";
import { getDb, schema } from "@acme/db";
import { incrementUsage } from "@/lib/ai";
import { serializeTransaction } from "@/lib/serializers";
import { requireUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const input = TransactionUpdateSchema.parse(body);

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

  const db = getDb();
  const [updated] = await db
    .update(schema.transaction)
    .set(updates)
    .where(and(eq(schema.transaction.id, params.id), eq(schema.transaction.userId, user.id)))
    .returning();

  if (!updated) {
    return new Response("Not found", { status: 404 });
  }

  const updatedDate =
    typeof updated.date === "string"
      ? updated.date
      : updated.date.toISOString().slice(0, 10);
  await incrementUsage(user.id, updatedDate);

  return Response.json(serializeTransaction(updated));
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const [deleted] = await db
    .delete(schema.transaction)
    .where(and(eq(schema.transaction.id, params.id), eq(schema.transaction.userId, user.id)))
    .returning();

  if (!deleted) {
    return new Response("Not found", { status: 404 });
  }

  const deletedDate =
    typeof deleted.date === "string"
      ? deleted.date
      : deleted.date.toISOString().slice(0, 10);
  await incrementUsage(user.id, deletedDate);

  return new Response(null, { status: 204 });
}
