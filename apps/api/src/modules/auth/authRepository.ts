import { eq } from "drizzle-orm";
import { env } from "../../config/environment.js";
import { getDrizzleDb } from "../../db/client.js";
import { users } from "../../db/schema.js";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: "admin";
  passwordHash: string;
  isActive: boolean;
};

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is required for auth");
  }

  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      displayName: users.displayName,
      role: users.userRole,
      isActive: users.isActive
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const row = rows[0];
  if (!row || row.role !== "admin") {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: "admin",
    passwordHash: row.passwordHash,
    isActive: Boolean(row.isActive)
  };
}
