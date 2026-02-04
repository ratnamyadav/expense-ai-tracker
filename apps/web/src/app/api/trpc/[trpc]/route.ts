import { appRouter } from "@acme/trpc";
import { getDb } from "@acme/db";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { auth } from "@/lib/auth";

const handler = (request: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: async () => {
      const session = await auth.api.getSession({ headers: request.headers });
      return {
        userId: session?.user?.id ?? null,
        db: getDb()
      };
    }
  });

export const GET = handler;
export const POST = handler;
