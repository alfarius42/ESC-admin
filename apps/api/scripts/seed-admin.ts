import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hash } from "bcryptjs";
import { config } from "dotenv";
import mysql from "mysql2/promise";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const seedEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@vendor.local";
const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";
const seedDisplayName = process.env.SEED_ADMIN_DISPLAY_NAME ?? "Admin";
const passwordHash = await hash(seedPassword, 12);

const parsed = new URL(databaseUrl);
const connection = await mysql.createConnection({
  host: parsed.hostname,
  port: Number(parsed.port || 3307),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, "")
});

try {
  await connection.execute(
    `INSERT INTO users (
      id, email, password_hash, display_name, user_role, is_active
    ) VALUES (?, ?, ?, ?, 'admin', 1)
    ON DUPLICATE KEY UPDATE
      password_hash = VALUES(password_hash),
      display_name = VALUES(display_name),
      user_role = 'admin',
      is_active = 1`,
    [randomUUID(), seedEmail.toLowerCase(), passwordHash, seedDisplayName]
  );
  console.log(`Seeded admin user: ${seedEmail}`);
} finally {
  await connection.end();
}
