import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { getDrizzleDb } from "../../db/client.js";
import {
  activationCodes,
  auditLog,
  boxSales,
  customers,
  instances,
  licenses,
  upsellSales,
  users
} from "../../db/schema.js";

export type LicenseIssueContext = {
  licenseId: string;
  customerId: string;
  licenseStatus: LicenseStatus;
  instanceId: string;
  packageSlug: string;
  modules: string[];
  validFrom: string;
  validUntil: string;
};

export type LicenseStatus =
  | "draft"
  | "issued"
  | "active"
  | "grace"
  | "expired"
  | "revoked";

export type LicenseRecord = {
  id: string;
  instanceId: string;
  customerId: string;
  packageSlug: string;
  modules: string[];
  validFrom: string;
  validUntil: string;
  subscriptionYear: number;
  licenseStatus: LicenseStatus;
  boxSaleId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LicenseListItem = LicenseRecord & {
  customer: {
    legalName: string;
    inn: string | null;
  };
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

export type ActivationCodeListItem = {
  id: string;
  licenseId: string;
  codeType: "initial" | "addon" | "renewal" | "pilot" | "reissue";
  modules: string[];
  status: LicenseCodeStatus;
  codeHashPrefix: string;
  validUntil: string | null;
  pilotUntil: string | null;
  issuedAt: string;
  activatedAt: string | null;
  issuedBy: {
    id: string;
    displayName: string;
  };
};

export type ActivationCodeLookup = {
  id: string;
  licenseId: string;
  codeType: "initial" | "addon" | "renewal" | "pilot" | "reissue";
  codeStatus: LicenseCodeStatus;
  targetInstanceId: string | null;
  modules: string[];
  validUntil: string | null;
  activatedAt: string | null;
  revokedAt: string | null;
  licenseInstanceId: string;
  licenseModules: string[];
};

type LicenseIssueRow = {
  licenseId: string;
  customerId: string;
  licenseStatus: LicenseStatus;
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

function toIsoDateTime(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapActivationCodeListItem(row: {
  id: string;
  licenseId: string;
  codeType: ActivationCodeListItem["codeType"];
  modules: unknown;
  codeStatus: LicenseCodeStatus;
  codeHashPrefix: string;
  validUntil: Date | string | null;
  pilotUntil: Date | string | null;
  issuedAt: Date | string;
  activatedAt: Date | string | null;
  issuedById: string;
  issuedByDisplayName: string;
}): ActivationCodeListItem {
  return {
    id: row.id,
    licenseId: row.licenseId,
    codeType: row.codeType,
    modules: parseModules(row.modules),
    status: row.codeStatus,
    codeHashPrefix: row.codeHashPrefix,
    validUntil: toIsoDateTime(row.validUntil),
    pilotUntil: toIsoDateTime(row.pilotUntil),
    issuedAt: toIsoDateTime(row.issuedAt) ?? "",
    activatedAt: toIsoDateTime(row.activatedAt),
    issuedBy: {
      id: row.issuedById,
      displayName: row.issuedByDisplayName
    }
  };
}

function mapLicenseRecord(row: {
  id: string;
  instanceId: string;
  customerId: string;
  packageSlug: string;
  modules: unknown;
  validFrom: Date | string;
  validUntil: Date | string;
  subscriptionYear: number;
  licenseStatus: LicenseStatus;
  boxSaleId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): LicenseRecord {
  return {
    id: row.id,
    instanceId: row.instanceId,
    customerId: row.customerId,
    packageSlug: row.packageSlug,
    modules: parseModules(row.modules),
    validFrom: toIsoDate(row.validFrom),
    validUntil: toIsoDate(row.validUntil),
    subscriptionYear: Number(row.subscriptionYear),
    licenseStatus: row.licenseStatus,
    boxSaleId: row.boxSaleId,
    createdAt: toIsoDateTime(row.createdAt) ?? "",
    updatedAt: toIsoDateTime(row.updatedAt) ?? ""
  };
}

function mapLicenseListItem(row: {
  id: string;
  instanceId: string;
  customerId: string;
  packageSlug: string;
  modules: unknown;
  validFrom: Date | string;
  validUntil: Date | string;
  subscriptionYear: number;
  licenseStatus: LicenseStatus;
  boxSaleId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  legalName: string;
  inn: string | null;
}): LicenseListItem {
  return {
    ...mapLicenseRecord(row),
    customer: {
      legalName: row.legalName,
      inn: row.inn
    }
  };
}

export async function listLicenses(params: {
  customerId?: string;
  instanceId?: string;
  status?: LicenseStatus;
  offset: number;
  limit: number;
}): Promise<{ items: LicenseListItem[]; total: number }> {
  const db = getDrizzleDb();
  const conditions: SQL<unknown>[] = [];

  if (params.customerId) {
    conditions.push(eq(instances.customerId, params.customerId));
  }
  if (params.instanceId) {
    conditions.push(eq(licenses.instanceId, params.instanceId));
  }
  if (params.status) {
    conditions.push(eq(licenses.licenseStatus, params.status));
  }

  const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

  const totalRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(licenses)
    .innerJoin(instances, eq(instances.id, licenses.instanceId))
    .innerJoin(customers, eq(customers.id, instances.customerId))
    .where(whereExpr);
  const total = Number(totalRows[0]?.total ?? 0);

  const rows = await db
    .select({
      id: licenses.id,
      instanceId: licenses.instanceId,
      customerId: instances.customerId,
      packageSlug: licenses.packageSlug,
      modules: licenses.modules,
      validFrom: licenses.validFrom,
      validUntil: licenses.validUntil,
      subscriptionYear: licenses.subscriptionYear,
      licenseStatus: licenses.licenseStatus,
      boxSaleId: licenses.boxSaleId,
      createdAt: licenses.createdAt,
      updatedAt: licenses.updatedAt,
      legalName: customers.legalName,
      inn: customers.inn
    })
    .from(licenses)
    .innerJoin(instances, eq(instances.id, licenses.instanceId))
    .innerJoin(customers, eq(customers.id, instances.customerId))
    .where(whereExpr)
    .orderBy(desc(licenses.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  return { items: rows.map((row) => mapLicenseListItem(row)), total };
}

export async function findLicenseById(id: string): Promise<LicenseRecord | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: licenses.id,
      instanceId: licenses.instanceId,
      customerId: instances.customerId,
      packageSlug: licenses.packageSlug,
      modules: licenses.modules,
      validFrom: licenses.validFrom,
      validUntil: licenses.validUntil,
      subscriptionYear: licenses.subscriptionYear,
      licenseStatus: licenses.licenseStatus,
      boxSaleId: licenses.boxSaleId,
      createdAt: licenses.createdAt,
      updatedAt: licenses.updatedAt
    })
    .from(licenses)
    .innerJoin(instances, eq(instances.id, licenses.instanceId))
    .where(eq(licenses.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return mapLicenseRecord(row);
}

export async function createLicense(data: {
  instanceId: string;
  packageSlug: string;
  modules: string[];
  validFrom: string;
  validUntil: string;
  subscriptionYear: number;
  boxSaleId: string | null;
}): Promise<LicenseRecord> {
  const db = getDrizzleDb();
  const id = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(licenses).values({
      id,
      instanceId: data.instanceId,
      packageSlug: data.packageSlug,
      modules: data.modules,
      validFrom: sql`DATE(${data.validFrom})`,
      validUntil: sql`DATE(${data.validUntil})`,
      subscriptionYear: data.subscriptionYear,
      licenseStatus: "draft",
      boxSaleId: data.boxSaleId,
      createdAt: sql`UTC_TIMESTAMP()`,
      updatedAt: sql`UTC_TIMESTAMP()`
    });

    if (data.boxSaleId) {
      await tx
        .update(boxSales)
        .set({
          licenseId: id,
          updatedAt: sql`UTC_TIMESTAMP()`
        })
        .where(eq(boxSales.id, data.boxSaleId));
    }
  });

  const created = await findLicenseById(id);
  if (!created) {
    throw new Error("Failed to create license");
  }
  return created;
}

export async function updateLicense(
  id: string,
  patch: Partial<{
    modules: string[];
    validUntil: string;
    licenseStatus: LicenseStatus;
  }>
): Promise<LicenseRecord | null> {
  const existing = await findLicenseById(id);
  if (!existing) {
    return null;
  }

  const db = getDrizzleDb();
  await db
    .update(licenses)
    .set({
      modules: patch.modules ?? existing.modules,
      validUntil: sql`DATE(${patch.validUntil ?? existing.validUntil})`,
      licenseStatus: patch.licenseStatus ?? existing.licenseStatus,
      updatedAt: sql`UTC_TIMESTAMP()`
    })
    .where(eq(licenses.id, id));

  return findLicenseById(id);
}

export async function listActivationCodesByLicenseId(
  licenseId: string
): Promise<ActivationCodeListItem[]> {
  const result = await listActivationCodes({
    licenseId,
    offset: 0,
    limit: 200
  });
  return result.items;
}

export async function listLicenseAuditHistory(licenseId: string): Promise<
  Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    userId: string | null;
    diffJson: unknown;
    createdAt: string;
  }>
> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      userId: auditLog.userId,
      diffJson: auditLog.diffJson,
      createdAt: auditLog.createdAt
    })
    .from(auditLog)
    .where(eq(auditLog.entityId, licenseId))
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  return rows.map((row) => ({
    ...row,
    createdAt: toIsoDateTime(row.createdAt) ?? ""
  }));
}

export async function findInstanceByIdForLicense(instanceId: string): Promise<{
  id: string;
  customerId: string;
} | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: instances.id,
      customerId: instances.customerId
    })
    .from(instances)
    .where(eq(instances.id, instanceId))
    .limit(1);

  return rows[0] ?? null;
}

export async function findBoxSaleLinkCandidate(boxSaleId: string): Promise<{
  id: string;
  customerId: string;
  instanceId: string | null;
  licenseId: string | null;
} | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: boxSales.id,
      customerId: boxSales.customerId,
      instanceId: boxSales.instanceId,
      licenseId: boxSales.licenseId
    })
    .from(boxSales)
    .where(eq(boxSales.id, boxSaleId))
    .limit(1);

  return rows[0] ?? null;
}

export async function listActivationCodes(params: {
  licenseId?: string;
  codeType?: InsertActivationCodeInput["codeType"];
  status?: LicenseCodeStatus;
  offset: number;
  limit: number;
}): Promise<{ items: ActivationCodeListItem[]; total: number }> {
  const db = getDrizzleDb();
  const conditions = [];

  if (params.licenseId) {
    conditions.push(eq(activationCodes.licenseId, params.licenseId));
  }
  if (params.codeType) {
    conditions.push(eq(activationCodes.codeType, params.codeType));
  }
  if (params.status) {
    conditions.push(eq(activationCodes.codeStatus, params.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const totalRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(activationCodes)
    .where(whereClause);
  const total = Number(totalRows[0]?.total ?? 0);

  const rows = await db
    .select({
      id: activationCodes.id,
      licenseId: activationCodes.licenseId,
      codeType: activationCodes.codeType,
      modules: activationCodes.modules,
      codeStatus: activationCodes.codeStatus,
      codeHashPrefix: activationCodes.codeHashPrefix,
      validUntil: activationCodes.validUntil,
      pilotUntil: activationCodes.pilotUntil,
      issuedAt: activationCodes.issuedAt,
      activatedAt: activationCodes.activatedAt,
      issuedById: users.id,
      issuedByDisplayName: users.displayName
    })
    .from(activationCodes)
    .innerJoin(users, eq(users.id, activationCodes.issuedBy))
    .where(whereClause)
    .orderBy(desc(activationCodes.issuedAt))
    .limit(params.limit)
    .offset(params.offset);

  return {
    items: rows.map((row) => mapActivationCodeListItem(row)),
    total
  };
}

export async function findActivationCodeByLicenseAndHashPrefix(
  licenseId: string,
  codeHashPrefix: string
): Promise<ActivationCodeLookup | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: activationCodes.id,
      licenseId: activationCodes.licenseId,
      codeType: activationCodes.codeType,
      codeStatus: activationCodes.codeStatus,
      targetInstanceId: activationCodes.targetInstanceId,
      modules: activationCodes.modules,
      validUntil: activationCodes.validUntil,
      activatedAt: activationCodes.activatedAt,
      revokedAt: activationCodes.revokedAt,
      licenseInstanceId: licenses.instanceId,
      licenseModules: licenses.modules
    })
    .from(activationCodes)
    .innerJoin(licenses, eq(licenses.id, activationCodes.licenseId))
    .where(
      and(
        eq(activationCodes.licenseId, licenseId),
        eq(activationCodes.codeHashPrefix, codeHashPrefix)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    licenseId: row.licenseId,
    codeType: row.codeType,
    codeStatus: row.codeStatus,
    targetInstanceId: row.targetInstanceId,
    modules: parseModules(row.modules),
    validUntil: toIsoDateTime(row.validUntil),
    activatedAt: toIsoDateTime(row.activatedAt),
    revokedAt: toIsoDateTime(row.revokedAt),
    licenseInstanceId: row.licenseInstanceId,
    licenseModules: parseModules(row.licenseModules)
  };
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
