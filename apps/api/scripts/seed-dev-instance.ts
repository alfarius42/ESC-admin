import { createHash, randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const databaseUrl = process.env.DATABASE_URL;
const plainToken =
  process.env.INTEGRATION_INSTANCE_TOKEN_PLAIN ?? "replace-with-plain-token";
const runtimeInstanceId =
  process.env.INTEGRATION_TEST_RUNTIME_INSTANCE_ID ?? "a1b2c3d4e5f6g7h8i9j0k1l2";

if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const parsed = new URL(databaseUrl);
const tokenHash = createHash("sha256").update(plainToken).digest("hex");
const defaultCustomerId = "11111111-1111-1111-1111-111111111111";

const connection = await mysql.createConnection({
  host: parsed.hostname,
  port: Number(parsed.port || 3307),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, "")
});

try {
  await connection.execute(
    `INSERT INTO customers (
      id, legal_name, inn, contact_name, contact_email
    ) VALUES (?, 'Dev Customer LLC', '7701234567', 'Dev Contact', 'dev@example.com')
    ON DUPLICATE KEY UPDATE
      legal_name = VALUES(legal_name),
      contact_email = VALUES(contact_email)`,
    [defaultCustomerId]
  );

  const [customerIdColumnRows] = await connection.query<{ Field: string }[]>(
    "SHOW COLUMNS FROM instances LIKE 'customer_id'"
  );
  if (customerIdColumnRows.length === 0) {
    throw new Error(
      "instances.customer_id is missing. Run `corepack pnpm db:reset`, then `db:migrate`, `db:seed`, `db:seed-dev`."
    );
  }

  await connection.execute(
    `INSERT INTO instances (
      id, customer_id, runtime_instance_id, integration_token_hash, instance_status
    ) VALUES (?, ?, ?, ?, 'active')
    ON DUPLICATE KEY UPDATE
      customer_id = VALUES(customer_id),
      runtime_instance_id = VALUES(runtime_instance_id),
      integration_token_hash = VALUES(integration_token_hash),
      instance_status = 'active'`,
    [randomUUID(), defaultCustomerId, runtimeInstanceId, tokenHash]
  );

  console.log("Dev instance seeded");
  console.log(`runtimeInstanceId: ${runtimeInstanceId}`);
  console.log(`token (plain):     ${plainToken}`);
} finally {
  await connection.end();
}
