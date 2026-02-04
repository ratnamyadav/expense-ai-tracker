import { ParseRequestSchema } from "@acme/api";
import { parseTransaction } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rate = checkRateLimit(user.id);
  if (!rate.allowed) {
    return new Response("Too many requests", { status: 429 });
  }

  const payload = await request.json();
  const { text } = ParseRequestSchema.parse(payload);
  const result = await parseTransaction({ userId: user.id, text });

  return Response.json(result);
}
