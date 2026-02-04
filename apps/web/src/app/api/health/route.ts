import { HealthSchema } from "@acme/api";

export async function GET() {
  const payload = {
    ok: true,
    app: "web",
    timestamp: new Date().toISOString()
  };

  return Response.json(HealthSchema.parse(payload));
}
