import { SubscriptionSchema } from "@acme/api";
import { ensureSubscription } from "@/lib/ai";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const subscription = await ensureSubscription(user.id);
  const isPro = subscription.status === "active" || subscription.status === "trial";
  const payload = SubscriptionSchema.parse({
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

  return Response.json(payload);
}
