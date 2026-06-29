import type { RowDataPacket } from "mysql2";
import { env } from "../../config/environment.js";
import { getDbPool } from "../../db/client.js";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: "admin";
  passwordHash: string;
  isActive: boolean;
};

type UserRow = RowDataPacket & {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  user_role: "admin";
  is_active: number;
};

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required for auth");
  }

  const db = getDbPool();
  const [rows] = await db.execute<UserRow[]>(
    `SELECT id, email, password_hash, display_name, user_role, is_active
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.user_role,
    passwordHash: row.password_hash,
    isActive: Boolean(row.is_active)
  };
}
