import { getDb, schema } from "@acme/db";
import { requireUser } from "@/lib/session";
import { eq } from "drizzle-orm";

export async function POST() {
  const user = await requireUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();
  await db.delete(schema.user).where(eq(schema.user.id, user.id));

  return new Response(null, { status: 204 });
}
