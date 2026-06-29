import { createPool, type Pool } from "mysql2/promise";
import { env } from "../config/environment.js";

/** Data access: mysql2 pool + typed repositories (Drizzle deferred to reduce sprint scope). */
let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  if (!pool) {
    pool = createPool({
      uri: env.databaseUrl,
      connectionLimit: 10
    });
  }

  return pool;
}
