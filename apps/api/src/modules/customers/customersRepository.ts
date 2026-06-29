import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { getDbPool } from "../../db/client.js";

export type CustomerRecord = {
  id: string;
  legalName: string;
  inn: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type CustomerRow = RowDataPacket & {
  id: string;
  legal_name: string;
  inn: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: CustomerRow): CustomerRecord {
  return {
    id: row.id,
    legalName: row.legal_name,
    inn: row.inn,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function listCustomers(params: {
  q?: string;
  offset: number;
  limit: number;
}): Promise<{ items: CustomerRecord[]; total: number }> {
  const db = getDbPool();
  const conditions: string[] = [];
  const values: string[] = [];

  if (params.q?.trim()) {
    const term = `%${params.q.trim()}%`;
    conditions.push(
      "(legal_name LIKE ? OR inn LIKE ? OR contact_email LIKE ?)"
    );
    values.push(term, term, term);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM customers ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await db.execute<CustomerRow[]>(
    `SELECT id, legal_name, inn, contact_name, contact_email, contact_phone, notes, created_at, updated_at
     FROM customers
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, String(params.limit), String(params.offset)]
  );

  return { items: rows.map(mapRow), total };
}

export async function findCustomerById(id: string): Promise<CustomerRecord | null> {
  const db = getDbPool();
  const [rows] = await db.execute<CustomerRow[]>(
    `SELECT id, legal_name, inn, contact_name, contact_email, contact_phone, notes, created_at, updated_at
     FROM customers WHERE id = ? LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapRow(rows[0]);
}

export async function createCustomer(data: {
  legalName: string;
  inn: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
}): Promise<CustomerRecord> {
  const db = getDbPool();
  const id = randomUUID();

  await db.execute(
    `INSERT INTO customers (id, legal_name, inn, contact_name, contact_email, contact_phone, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.legalName,
      data.inn,
      data.contactName,
      data.contactEmail,
      data.contactPhone,
      data.notes
    ]
  );

  const created = await findCustomerById(id);
  if (!created) {
    throw new Error("Failed to create customer");
  }

  return created;
}

export async function updateCustomer(
  id: string,
  data: Partial<{
    legalName: string;
    inn: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    notes: string | null;
  }>
): Promise<CustomerRecord | null> {
  const existing = await findCustomerById(id);
  if (!existing) {
    return null;
  }

  const db = getDbPool();
  await db.execute(
    `UPDATE customers SET
       legal_name = ?,
       inn = ?,
       contact_name = ?,
       contact_email = ?,
       contact_phone = ?,
       notes = ?
     WHERE id = ?`,
    [
      data.legalName ?? existing.legalName,
      data.inn !== undefined ? data.inn : existing.inn,
      data.contactName !== undefined ? data.contactName : existing.contactName,
      data.contactEmail !== undefined ? data.contactEmail : existing.contactEmail,
      data.contactPhone !== undefined ? data.contactPhone : existing.contactPhone,
      data.notes !== undefined ? data.notes : existing.notes,
      id
    ]
  );

  return findCustomerById(id);
}

export async function listInstancesForCustomer(customerId: string): Promise<
  Array<{
    id: string;
    runtimeInstanceId: string | null;
    instanceStatus: string;
    hostname: string | null;
  }>
> {
  const db = getDbPool();
  type InstanceRow = RowDataPacket & {
    id: string;
    runtime_instance_id: string | null;
    instance_status: string;
    hostname: string | null;
  };

  const [rows] = await db.execute<InstanceRow[]>(
    `SELECT id, runtime_instance_id, instance_status, hostname
     FROM instances WHERE customer_id = ? ORDER BY created_at DESC`,
    [customerId]
  );

  return rows.map((row) => ({
    id: row.id,
    runtimeInstanceId: row.runtime_instance_id,
    instanceStatus: row.instance_status,
    hostname: row.hostname
  }));
}
