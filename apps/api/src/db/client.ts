import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { createPool, type Pool, type PoolConnection } from "mysql2/promise";
import { env } from "../config/environment.js";
import * as schema from "./schema.js";

/** Data access: mysql2 pool + phased Drizzle adoption. */
let pool: Pool | null = null;
let drizzleDb: MySql2Database<typeof schema> | null = null;

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

export function getDrizzleDb(): MySql2Database<typeof schema> {
  if (!drizzleDb) {
    drizzleDb = drizzle(getDbPool(), { schema, mode: "default" });
  }

  return drizzleDb;
}

export async function withTransaction<T>(
  fn: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const db = getDbPool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
