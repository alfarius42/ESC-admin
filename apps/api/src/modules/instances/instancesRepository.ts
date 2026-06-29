import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { env } from "../../config/environment.js";
import { getDbPool } from "../../db/client.js";

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

type InstanceRow = RowDataPacket & {
  id: string;
  customer_id: string;
  runtime_instance_id: string | null;
  hostname: string | null;
  deploy_url: string | null;
  integration_token_hash: string;
  instance_status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

type VerifyTokenResult = {
  mode: "db" | "env";
  record: {
    id: string;
    runtimeInstanceId: string | null;
    instanceStatus: string;
  } | null;
};

function mapRow(row: InstanceRow): InstanceRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    runtimeInstanceId: row.runtime_instance_id,
    hostname: row.hostname,
    deployUrl: row.deploy_url,
    integrationTokenHash: row.integration_token_hash,
    instanceStatus: row.instance_status,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
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

  const db = getDbPool();
  type TokenLookupRow = RowDataPacket & {
    id: string;
    runtime_instance_id: string | null;
    instance_status: string;
  };

  const [rows] = await db.execute<TokenLookupRow[]>(
    `SELECT id, runtime_instance_id, instance_status
     FROM instances
     WHERE integration_token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );

  if (rows.length === 0) {
    return { mode: "db", record: null };
  }

  const row = rows[0];
  return {
    mode: "db",
    record: {
      id: row.id,
      runtimeInstanceId: row.runtime_instance_id,
      instanceStatus: row.instance_status
    }
  };
}

export async function markInstanceTokenVerified(instanceId: string): Promise<void> {
  if (env.tokenSource !== "db") {
    return;
  }

  const db = getDbPool();
  await db.execute(
    `UPDATE instances SET last_token_verified_at = UTC_TIMESTAMP() WHERE id = ?`,
    [instanceId]
  );
}

export async function listInstances(params: {
  q?: string;
  status?: string;
  customerId?: string;
  offset: number;
  limit: number;
}): Promise<{ items: InstanceRecord[]; total: number }> {
  const db = getDbPool();
  const conditions: string[] = [];
  const values: string[] = [];

  if (params.status?.trim()) {
    conditions.push("i.instance_status = ?");
    values.push(params.status.trim());
  }

  if (params.customerId?.trim()) {
    conditions.push("i.customer_id = ?");
    values.push(params.customerId.trim());
  }

  if (params.q?.trim()) {
    const term = `%${params.q.trim()}%`;
    conditions.push(
      "(i.runtime_instance_id LIKE ? OR i.hostname LIKE ? OR i.deploy_url LIKE ? OR c.legal_name LIKE ?)"
    );
    values.push(term, term, term, term);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const fromClause = params.q?.trim()
    ? "FROM instances i INNER JOIN customers c ON c.id = i.customer_id"
    : "FROM instances i";

  const [countRows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total ${fromClause} ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await db.execute<InstanceRow[]>(
    `SELECT i.id, i.customer_id, i.runtime_instance_id, i.hostname, i.deploy_url,
            i.integration_token_hash, i.instance_status, i.notes, i.created_at, i.updated_at
     ${fromClause}
     ${whereClause}
     ORDER BY i.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, String(params.limit), String(params.offset)]
  );

  return { items: rows.map(mapRow), total };
}

export async function findInstanceById(id: string): Promise<InstanceRecord | null> {
  const db = getDbPool();
  const [rows] = await db.execute<InstanceRow[]>(
    `SELECT id, customer_id, runtime_instance_id, hostname, deploy_url,
            integration_token_hash, instance_status, notes, created_at, updated_at
     FROM instances WHERE id = ? LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapRow(rows[0]);
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
  const db = getDbPool();
  const id = data.id ?? randomUUID();

  await db.execute(
    `INSERT INTO instances (
       id, customer_id, hostname, deploy_url, integration_token_hash, instance_status, notes
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.customerId,
      data.hostname,
      data.deployUrl,
      data.integrationTokenHash,
      data.instanceStatus,
      data.notes
    ]
  );

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

  const db = getDbPool();
  await db.execute(
    `UPDATE instances SET
       runtime_instance_id = ?,
       hostname = ?,
       deploy_url = ?,
       instance_status = ?,
       notes = ?
     WHERE id = ?`,
    [
      data.runtimeInstanceId !== undefined
        ? data.runtimeInstanceId
        : existing.runtimeInstanceId,
      data.hostname !== undefined ? data.hostname : existing.hostname,
      data.deployUrl !== undefined ? data.deployUrl : existing.deployUrl,
      data.instanceStatus !== undefined
        ? data.instanceStatus
        : existing.instanceStatus,
      data.notes !== undefined ? data.notes : existing.notes,
      id
    ]
  );

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
  const db = getDbPool();
  type LicenseRow = RowDataPacket & {
    license_status: string;
    modules: unknown;
    valid_until: Date | string | null;
  };

  const [rows] = await db.execute<LicenseRow[]>(
    `SELECT license_status, modules, valid_until
     FROM licenses
     WHERE instance_id = ?
     ORDER BY valid_until DESC
     LIMIT 1`,
    [instanceId]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  const licenseStatus = String(row.license_status);
  const validUntilRaw = row.valid_until;
  const validUntil =
    validUntilRaw instanceof Date
      ? validUntilRaw.toISOString().slice(0, 10)
      : validUntilRaw
        ? String(validUntilRaw).slice(0, 10)
        : null;

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

  const db = getDbPool();
  await db.execute(
    `UPDATE instances SET
       integration_token_hash = ?,
       integration_token_rotated_at = UTC_TIMESTAMP(),
       integration_token_issued_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [newTokenHash, id]
  );

  return findInstanceById(id);
}
