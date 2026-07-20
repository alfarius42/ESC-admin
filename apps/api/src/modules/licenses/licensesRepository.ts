import { randomUUID } from "node:crypto";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { getDrizzleDb } from "../../db/client.js";
import {
  activationCodes,
  auditLog,
  instances,
  licenses,
  upsellSales
} from "../../db/schema.js";

export type LicenseIssueContext = {
  licenseId: string;
  customerId: string;
  licenseStatus: "draft" | "issued" | "active" | "grace" | "expired" | "revoked";
  instanceId: string;
  packageSlug: string;
  modules: string[];
  validFrom: string;
  validUntil: string;
};

export type InsertActivationCodeInput = {
  licenseId: string;
  codeType: "initial" | "addon" | "renewal" | "pilot" | "reissue";
  modules: string[];
  validUntil: string | null;
  pilotUntil: string | null;
  targetInstanceId: string | null;
  activationCodeEncrypted: string;
  codeHashPrefix: string;
  payloadJson: unknown;
  issuedBy: string;
  auditEntry?: AuditLogInput;
};

export type AuditLogInput = {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  diffJson?: unknown;
};

export type LicenseCodeStatus = "issued" | "activated" | "expired" | "revoked";

type LicenseIssueRow = {
  licenseId: string;
  customerId: string;
  licenseStatus: "draft" | "issued" | "active" | "grace" | "expired" | "revoked";
  instanceId: string;
  packageSlug: string;
  modules: unknown;
  validFrom: Date | string;
  validUntil: Date | string;
};

function parseModules(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString()) as string[];
  }
  if (typeof value === "string") {
    return JSON.parse(value) as string[];
  }
  return [];
}

function toIsoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

export async function findLicenseIssueContext(
  licenseId: string
): Promise<LicenseIssueContext | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      licenseId: licenses.id,
      customerId: instances.customerId,
      licenseStatus: licenses.licenseStatus,
      instanceId: licenses.instanceId,
      packageSlug: licenses.packageSlug,
      modules: licenses.modules,
      validFrom: licenses.validFrom,
      validUntil: licenses.validUntil
    })
    .from(licenses)
    .innerJoin(instances, eq(instances.id, licenses.instanceId))
    .where(eq(licenses.id, licenseId))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0] as unknown as LicenseIssueRow;
  return {
    licenseId: row.licenseId,
    customerId: row.customerId,
    licenseStatus: row.licenseStatus,
    instanceId: row.instanceId,
    packageSlug: row.packageSlug,
    modules: parseModules(row.modules),
    validFrom: toIsoDate(row.validFrom),
    validUntil: toIsoDate(row.validUntil)
  };
}

export async function countLicenseCodesByTypeAndStatus(
  licenseId: string,
  codeType: "initial" | "addon" | "renewal" | "pilot" | "reissue",
  statuses: LicenseCodeStatus[]
): Promise<number> {
  const db = getDrizzleDb();
  const rows = await db
    .select({ total: sql<number>`count(*)` })
    .from(activationCodes)
    .where(
      and(
        eq(activationCodes.licenseId, licenseId),
        eq(activationCodes.codeType, codeType),
        inArray(activationCodes.codeStatus, statuses)
      )
    );
  return Number(rows[0]?.total ?? 0);
}

export async function hasLinkedReissueUpsellForCustomer(
  customerId: string
): Promise<boolean> {
  const db = getDrizzleDb();
  const rows = await db
    .select({ id: upsellSales.id })
    .from(upsellSales)
    .where(
      and(
        eq(upsellSales.customerId, customerId),
        eq(upsellSales.sku, "LIC-REISSUE")
      )
    )
    .limit(1);
  return rows.length > 0;
}

export async function insertActivationCodeAndMarkIssued(
  input: InsertActivationCodeInput
): Promise<{ codeId: string }> {
  const db = getDrizzleDb();
  const codeId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(activationCodes).values({
      id: codeId,
      licenseId: input.licenseId,
      codeType: input.codeType,
      modules: input.modules,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      pilotUntil: input.pilotUntil ? new Date(input.pilotUntil) : null,
      targetInstanceId: input.targetInstanceId,
      activationCodeEncrypted: input.activationCodeEncrypted,
      codeHashPrefix: input.codeHashPrefix,
      payloadJson: input.payloadJson,
      issuedBy: input.issuedBy,
      issuedAt: sql`UTC_TIMESTAMP()`,
      activatedAt: null,
      revokedAt: null,
      codeStatus: "issued"
    });

    const statusUpdate =
      input.codeType === "initial" || input.codeType === "pilot"
        ? { licenseStatus: "issued" as const }
        : {};

    await tx
      .update(licenses)
      .set({
        ...statusUpdate,
        updatedAt: sql`UTC_TIMESTAMP()`
      })
      .where(eq(licenses.id, input.licenseId));

    if (input.auditEntry) {
      const diffJson =
        input.auditEntry.diffJson && typeof input.auditEntry.diffJson === "object"
          ? { ...(input.auditEntry.diffJson as Record<string, unknown>), codeId }
          : { codeId, diff: input.auditEntry.diffJson ?? null };

      await tx.insert(auditLog).values({
        id: randomUUID(),
        userId: input.auditEntry.userId,
        action: input.auditEntry.action,
        entityType: input.auditEntry.entityType,
        entityId: input.auditEntry.entityId,
        diffJson,
        createdAt: sql`UTC_TIMESTAMP()`
      });
    }
  });

  return { codeId };
}

export async function appendAuditLog(input: AuditLogInput): Promise<void> {
  const db = getDrizzleDb();
  await db.insert(auditLog).values({
    id: randomUUID(),
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    diffJson: input.diffJson ?? null,
    createdAt: sql`UTC_TIMESTAMP()`
  });
}
