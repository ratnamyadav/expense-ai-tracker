import { type NodePgDatabase, drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | null = null;
let client: NodePgDatabase<typeof schema> | null = null;

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });
}

export function getDb() {
  if (!client) {
    pool = createPool();
    client = drizzle(pool, { schema });
  }

  return client;
}

export function getPool() {
  if (!pool) {
    pool = createPool();
  }

  return pool;
}
