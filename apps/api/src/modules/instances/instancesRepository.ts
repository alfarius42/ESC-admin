import { randomUUID } from "node:crypto";
import { and, count, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { env } from "../../config/environment.js";
import { getDrizzleDb } from "../../db/client.js";
import { customers, instances, licenses } from "../../db/schema.js";

type InstanceStatus =
  | "planned"
  | "deployed"
  | "active"
  | "grace"
  | "expired"
  | "decommissioned"
  | "suspended";

export type InstanceRecord = {
  id: string;
  customerId: string;
  runtimeInstanceId: string | null;
  hostname: string | null;
  deployUrl: string | null;
  integrationTokenHash: string;
  instanceStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type VerifyTokenResult = {
  mode: "db" | "env";
  record: {
    id: string;
    runtimeInstanceId: string | null;
    instanceStatus: string;
  } | null;
};

function mapRow(row: {
  id: string;
  customerId: string;
  runtimeInstanceId: string | null;
  hostname: string | null;
  deployUrl: string | null;
  integrationTokenHash: string;
  instanceStatus: string;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): InstanceRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    runtimeInstanceId: row.runtimeInstanceId,
    hostname: row.hostname,
    deployUrl: row.deployUrl,
    integrationTokenHash: row.integrationTokenHash,
    instanceStatus: row.instanceStatus,
    notes: row.notes,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString(),
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : new Date(row.updatedAt).toISOString()
  };
}

export function toPublicInstance(record: InstanceRecord) {
  return {
    id: record.id,
    customerId: record.customerId,
    runtimeInstanceId: record.runtimeInstanceId,
    hostname: record.hostname,
    deployUrl: record.deployUrl,
    instanceStatus: record.instanceStatus,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export async function findInstanceByTokenHash(
  tokenHash: string
): Promise<VerifyTokenResult> {
  if (env.tokenSource === "env") {
    const isTokenValid = tokenHash === env.integrationTokenHash;
    if (!isTokenValid) {
      return { mode: "env", record: null };
    }

    return {
      mode: "env",
      record: {
        id: "env-instance",
        runtimeInstanceId: env.runtimeInstanceId,
        instanceStatus: "active"
      }
    };
  }

  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: instances.id,
      runtimeInstanceId: instances.runtimeInstanceId,
      instanceStatus: instances.instanceStatus
    })
    .from(instances)
    .where(eq(instances.integrationTokenHash, tokenHash))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return { mode: "db", record: null };
  }

  return {
    mode: "db",
    record: {
      id: row.id,
      runtimeInstanceId: row.runtimeInstanceId,
      instanceStatus: row.instanceStatus
    }
  };
}

export async function markInstanceTokenVerified(instanceId: string): Promise<void> {
  if (env.tokenSource !== "db") {
    return;
  }

  const db = getDrizzleDb();
  await db
    .update(instances)
    .set({
      lastTokenVerifiedAt: sql`UTC_TIMESTAMP()`
    })
    .where(eq(instances.id, instanceId));
}

export async function listInstances(params: {
  q?: string;
  status?: string;
  customerId?: string;
  offset: number;
  limit: number;
}): Promise<{ items: InstanceRecord[]; total: number }> {
  const db = getDrizzleDb();
  const conditions: SQL<unknown>[] = [];

  if (params.status?.trim()) {
    conditions.push(eq(instances.instanceStatus, params.status.trim() as InstanceStatus));
  }

  if (params.customerId?.trim()) {
    conditions.push(eq(instances.customerId, params.customerId.trim()));
  }

  if (params.q?.trim()) {
    const term = `%${params.q.trim()}%`;
    conditions.push(
      or(
        like(instances.runtimeInstanceId, term),
        like(instances.hostname, term),
        like(instances.deployUrl, term),
        like(customers.legalName, term)
      )!
    );
  }

  const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

  const countRows = await db
    .select({ total: count() })
    .from(instances)
    .leftJoin(customers, eq(customers.id, instances.customerId))
    .where(whereExpr);
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await db
    .select({
      id: instances.id,
      customerId: instances.customerId,
      runtimeInstanceId: instances.runtimeInstanceId,
      hostname: instances.hostname,
      deployUrl: instances.deployUrl,
      integrationTokenHash: instances.integrationTokenHash,
      instanceStatus: instances.instanceStatus,
      notes: instances.notes,
      createdAt: instances.createdAt,
      updatedAt: instances.updatedAt
    })
    .from(instances)
    .leftJoin(customers, eq(customers.id, instances.customerId))
    .where(whereExpr)
    .orderBy(desc(instances.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  return { items: rows.map(mapRow), total };
}

export async function findInstanceById(id: string): Promise<InstanceRecord | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: instances.id,
      customerId: instances.customerId,
      runtimeInstanceId: instances.runtimeInstanceId,
      hostname: instances.hostname,
      deployUrl: instances.deployUrl,
      integrationTokenHash: instances.integrationTokenHash,
      instanceStatus: instances.instanceStatus,
      notes: instances.notes,
      createdAt: instances.createdAt,
      updatedAt: instances.updatedAt
    })
    .from(instances)
    .where(eq(instances.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return mapRow(row);
}

export async function createInstance(data: {
  id?: string;
  customerId: string;
  hostname: string | null;
  deployUrl: string | null;
  instanceStatus: string;
  notes: string | null;
  integrationTokenHash: string;
}): Promise<InstanceRecord> {
  const db = getDrizzleDb();
  const id = data.id ?? randomUUID();

  await db.insert(instances).values({
    id,
    customerId: data.customerId,
    hostname: data.hostname,
    deployUrl: data.deployUrl,
    integrationTokenHash: data.integrationTokenHash,
    instanceStatus: data.instanceStatus as
      InstanceStatus,
    notes: data.notes,
    integrationTokenIssuedAt: sql`UTC_TIMESTAMP()`,
    createdAt: sql`UTC_TIMESTAMP()`,
    updatedAt: sql`UTC_TIMESTAMP()`
  });

  const created = await findInstanceById(id);
  if (!created) {
    throw new Error("Failed to create instance");
  }

  return created;
}

export async function updateInstance(
  id: string,
  data: Partial<{
    runtimeInstanceId: string | null;
    hostname: string | null;
    deployUrl: string | null;
    instanceStatus: string;
    notes: string | null;
  }>
): Promise<InstanceRecord | null> {
  const existing = await findInstanceById(id);
  if (!existing) {
    return null;
  }

  const db = getDrizzleDb();
  await db
    .update(instances)
    .set({
      runtimeInstanceId:
        data.runtimeInstanceId !== undefined
          ? data.runtimeInstanceId
          : existing.runtimeInstanceId,
      hostname: data.hostname !== undefined ? data.hostname : existing.hostname,
      deployUrl: data.deployUrl !== undefined ? data.deployUrl : existing.deployUrl,
      instanceStatus: (data.instanceStatus !== undefined
        ? data.instanceStatus
        : existing.instanceStatus) as InstanceStatus,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      updatedAt: sql`UTC_TIMESTAMP()`
    })
    .where(eq(instances.id, id));

  return findInstanceById(id);
}

export type LicenseSummary = {
  licenseStatus: string;
  modules: string[];
  validUntil: string | null;
  licenseActive: boolean;
};

function parseModulesJson(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string");
  }
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
}

export async function findLicenseSummaryByInstanceId(
  instanceId: string
): Promise<LicenseSummary | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      licenseStatus: licenses.licenseStatus,
      modules: licenses.modules,
      validUntil: licenses.validUntil
    })
    .from(licenses)
    .where(eq(licenses.instanceId, instanceId))
    .orderBy(desc(licenses.validUntil))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const licenseStatus = String(row.licenseStatus);
  const validUntil = row.validUntil ? String(row.validUntil).slice(0, 10) : null;

  const activeStatuses = new Set(["active", "grace", "issued"]);
  const today = new Date().toISOString().slice(0, 10);
  const licenseActive =
    activeStatuses.has(licenseStatus) && validUntil !== null && validUntil >= today;

  return {
    licenseStatus,
    modules: parseModulesJson(row.modules),
    validUntil,
    licenseActive
  };
}

export async function rotateInstanceToken(
  id: string,
  newTokenHash: string
): Promise<InstanceRecord | null> {
  const existing = await findInstanceById(id);
  if (!existing) {
    return null;
  }

  const db = getDrizzleDb();
  await db
    .update(instances)
    .set({
      integrationTokenHash: newTokenHash,
      integrationTokenRotatedAt: sql`UTC_TIMESTAMP()`,
      integrationTokenIssuedAt: sql`UTC_TIMESTAMP()`,
      updatedAt: sql`UTC_TIMESTAMP()`
    })
    .where(eq(instances.id, id));

  return findInstanceById(id);
}
