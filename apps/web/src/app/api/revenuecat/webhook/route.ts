import { getDb, schema } from "@acme/db";
import { eq } from "drizzle-orm";

const activeEvents = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "TRANSFER",
  "TRIAL_CONVERTED"
]);

const trialEvents = new Set(["TRIAL_STARTED"]);

const inactiveEvents = new Set(["CANCELLATION", "EXPIRATION", "PAUSE"]);

const pastDueEvents = new Set(["BILLING_ISSUE"]);

export async function POST(request: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!secret || token !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await request.json()) as {
    event?: {
      type?: string;
      app_user_id?: string;
      product_id?: string;
      purchased_at_ms?: number;
      expiration_at_ms?: number;
    };
  };

  const event = payload.event;
  if (!event?.app_user_id) {
    return new Response("Missing user", { status: 400 });
  }

  const db = getDb();
  const [user] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, event.app_user_id))
    .limit(1);

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  let status: "free" | "trial" | "active" | "canceled" | "past_due" = "free";
  if (event.type && trialEvents.has(event.type)) {
    status = "trial";
  } else if (event.type && activeEvents.has(event.type)) {
    status = "active";
  } else if (event.type && pastDueEvents.has(event.type)) {
    status = "past_due";
  } else if (event.type && inactiveEvents.has(event.type)) {
    status = "canceled";
  }

  const currentPeriodStart = event.purchased_at_ms
    ? new Date(event.purchased_at_ms)
    : null;
  const currentPeriodEnd = event.expiration_at_ms
    ? new Date(event.expiration_at_ms)
    : null;

  const isPro = status === "active" || status === "trial";
  const plan = isPro ? "pro" : "free";
  const entriesLimit = isPro ? 100000 : 50;

  await db
    .insert(schema.subscription)
    .values({
      userId: event.app_user_id,
      status,
      plan,
      provider: "revenuecat",
      entriesLimit,
      entriesUsed: 0,
      currentPeriodStart,
      currentPeriodEnd
    })
    .onConflictDoUpdate({
      target: schema.subscription.userId,
      set: {
        status,
        plan,
        provider: "revenuecat",
        entriesLimit,
        currentPeriodStart,
        currentPeriodEnd,
        updatedAt: new Date()
      }
    });

  return new Response("OK", { status: 200 });
}
