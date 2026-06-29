import { randomUUID } from "node:crypto";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { getDrizzleDb } from "../../db/client.js";
import { customers, instances } from "../../db/schema.js";

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

function mapRow(row: {
  id: string;
  legalName: string;
  inn: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): CustomerRecord {
  return {
    id: row.id,
    legalName: row.legalName,
    inn: row.inn,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
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

export async function listCustomers(params: {
  q?: string;
  offset: number;
  limit: number;
}): Promise<{ items: CustomerRecord[]; total: number }> {
  const db = getDrizzleDb();
  const conditions: SQL<unknown>[] = [];

  if (params.q?.trim()) {
    const term = `%${params.q.trim()}%`;
    conditions.push(
      or(
        like(customers.legalName, term),
        like(customers.inn, term),
        like(customers.contactEmail, term)
      )!
    );
  }

  const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

  const countRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(customers)
    .where(whereExpr);
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await db
    .select({
      id: customers.id,
      legalName: customers.legalName,
      inn: customers.inn,
      contactName: customers.contactName,
      contactEmail: customers.contactEmail,
      contactPhone: customers.contactPhone,
      notes: customers.notes,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt
    })
    .from(customers)
    .where(whereExpr)
    .orderBy(desc(customers.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  return { items: rows.map(mapRow), total };
}

export async function findCustomerById(id: string): Promise<CustomerRecord | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: customers.id,
      legalName: customers.legalName,
      inn: customers.inn,
      contactName: customers.contactName,
      contactEmail: customers.contactEmail,
      contactPhone: customers.contactPhone,
      notes: customers.notes,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt
    })
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return mapRow(row);
}

export async function createCustomer(data: {
  legalName: string;
  inn: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
}): Promise<CustomerRecord> {
  const db = getDrizzleDb();
  const id = randomUUID();

  await db.insert(customers).values({
    id,
    legalName: data.legalName,
    inn: data.inn,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    notes: data.notes,
    createdAt: sql`UTC_TIMESTAMP()`,
    updatedAt: sql`UTC_TIMESTAMP()`
  });

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

  const db = getDrizzleDb();
  await db
    .update(customers)
    .set({
      legalName: data.legalName ?? existing.legalName,
      inn: data.inn !== undefined ? data.inn : existing.inn,
      contactName: data.contactName !== undefined ? data.contactName : existing.contactName,
      contactEmail:
        data.contactEmail !== undefined ? data.contactEmail : existing.contactEmail,
      contactPhone:
        data.contactPhone !== undefined ? data.contactPhone : existing.contactPhone,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      updatedAt: sql`UTC_TIMESTAMP()`
    })
    .where(eq(customers.id, id));

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
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: instances.id,
      runtimeInstanceId: instances.runtimeInstanceId,
      instanceStatus: instances.instanceStatus,
      hostname: instances.hostname
    })
    .from(instances)
    .where(eq(instances.customerId, customerId))
    .orderBy(desc(instances.createdAt));

  return rows.map((row) => ({
    id: row.id,
    runtimeInstanceId: row.runtimeInstanceId,
    instanceStatus: row.instanceStatus,
    hostname: row.hostname
  }));
}
