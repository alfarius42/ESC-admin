import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const parsed = new URL(databaseUrl);
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../db/migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort((left, right) => left.localeCompare(right));

const connection = await mysql.createConnection({
  host: parsed.hostname,
  port: Number(parsed.port || 3307),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, ""),
  multipleStatements: true
});

try {
  for (const migrationFile of migrationFiles) {
    const migrationPath = join(migrationsDir, migrationFile);
    const sql = readFileSync(migrationPath, "utf8");
    await connection.query(sql);
    console.log(`Applied migration: ${migrationFile}`);
  }
} finally {
  await connection.end();
}
