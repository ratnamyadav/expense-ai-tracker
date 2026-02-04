import type { getDb } from "@acme/db";

export type TrpcContext = {
  userId: string | null;
  db: ReturnType<typeof getDb>;
};
