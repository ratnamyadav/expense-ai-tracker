import { requireUser } from "@/lib/session";
import { ConsentSchema } from "@acme/api";
import { getDb, schema } from "@acme/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { version } = ConsentSchema.parse({
    version: body?.version ?? "v1",
    acceptedAt: new Date().toISOString(),
  });

  const db = getDb();
  await db
    .update(schema.user)
    .set({ consentAcceptedAt: new Date(), consentVersion: version })
    .where(eq(schema.user.id, user.id));

  return new Response(null, { status: 204 });
}
