import { createHash, randomBytes } from "node:crypto";
import { env } from "../../config/environment.js";

export function generatePlainIntegrationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashIntegrationToken(plainToken: string): string {
  return createHash("sha256").update(plainToken).digest("hex");
}

export function buildPendingTokenHash(instanceId: string): string {
  return createHash("sha256").update(`pending:${instanceId}`).digest("hex");
}

export function buildEnvSnippet(plainToken: string): string {
  return `VENDOR_ADMIN_URL=${env.vendorAdminPublicUrl}\nVENDOR_ADMIN_INSTANCE_TOKEN=${plainToken}`;
}
