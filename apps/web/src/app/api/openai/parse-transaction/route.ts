import { parseTransaction } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";
import { ParseRequestSchema } from "@acme/api";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const expected = process.env.OPENAI_APPS_TOKEN;

  if (!expected || token !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rate = checkRateLimit(token);
  if (!rate.allowed) {
    return new Response("Too many requests", { status: 429 });
  }

  const payload = await request.json();
  const { text } = ParseRequestSchema.parse(payload);
  const userId = typeof payload?.userId === "string" ? payload.userId : undefined;
  const result = await parseTransaction({ userId, text });

  return Response.json(result);
}
