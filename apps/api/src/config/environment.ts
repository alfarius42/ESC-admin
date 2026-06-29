import { config } from "dotenv";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "../../../../.env") });

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const plainToken = process.env.INTEGRATION_INSTANCE_TOKEN_PLAIN;
const hashedFromEnv = process.env.INTEGRATION_INSTANCE_TOKEN_HASH;
const fallbackPlainToken = "replace-with-plain-token";
const tokenSourceDefault = process.env.NODE_ENV === "test" ? "env" : "db";
const configuredTokenSource =
  process.env.INTEGRATION_TOKEN_SOURCE?.trim().toLowerCase() ?? tokenSourceDefault;

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 4000),
  vendorAdminPublicUrl:
    process.env.VENDOR_ADMIN_PUBLIC_URL ?? "http://localhost:4000",
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "change-me-min-32-chars",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "24h",
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@vendor.local",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? "admin12345",
  seedAdminDisplayName: process.env.SEED_ADMIN_DISPLAY_NAME ?? "Admin",
  authRateLimitWindowMs: toNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 60_000),
  authRateLimitMaxRequests: toNumber(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10),
  trustProxy: process.env.TRUST_PROXY === "true",
  verifyTimeoutMs: toNumber(process.env.INTEGRATION_TOKEN_VERIFY_TIMEOUT_MS, 3000),
  tokenCheckIntervalDays: toNumber(process.env.INTEGRATION_TOKEN_CHECK_INTERVAL_DAYS, 30),
  runtimeInstanceId:
    process.env.INTEGRATION_TEST_RUNTIME_INSTANCE_ID ?? "a1b2c3d4e5f6g7h8i9j0k1l2",
  tokenSource: configuredTokenSource === "env" ? "env" : "db",
  integrationTokenHash:
    hashedFromEnv && hashedFromEnv.length > 0
      ? hashedFromEnv
      : plainToken
        ? sha256Hex(plainToken)
        : sha256Hex(fallbackPlainToken)
};
