import { and, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { getDrizzleDb } from "../../db/client.js";
import { activationCodes, customers, instances, licenses } from "../../db/schema.js";

export async function findCustomerIdsByInn(inn: string): Promise<string[]> {
  const db = getDrizzleDb();
  const rows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.inn, inn));

  return rows.map((row) => row.id);
}

export async function findCustomerIdsByEmail(email: string): Promise<string[]> {
  const db = getDrizzleDb();
  const normalized = email.trim().toLowerCase();
  const rows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(sql`LOWER(${customers.contactEmail}) = ${normalized}`);

  return rows.map((row) => row.id);
}

export async function countPilotCodesForCustomerIds(
  customerIds: string[]
): Promise<number> {
  if (customerIds.length === 0) {
    return 0;
  }

  const db = getDrizzleDb();
  const rows = await db
    .select({ total: sql<number>`count(*)` })
    .from(activationCodes)
    .innerJoin(licenses, eq(licenses.id, activationCodes.licenseId))
    .innerJoin(instances, eq(instances.id, licenses.instanceId))
    .where(
      and(
        eq(activationCodes.codeType, "pilot"),
        ne(activationCodes.codeStatus, "revoked"),
        inArray(instances.customerId, customerIds)
      )
    );

  return Number(rows[0]?.total ?? 0);
}

export async function countActivePilotCodesForCustomerIds(
  customerIds: string[]
): Promise<number> {
  if (customerIds.length === 0) {
    return 0;
  }

  const db = getDrizzleDb();
  const rows = await db
    .select({ total: sql<number>`count(*)` })
    .from(activationCodes)
    .innerJoin(licenses, eq(licenses.id, activationCodes.licenseId))
    .innerJoin(instances, eq(instances.id, licenses.instanceId))
    .where(
      and(
        eq(activationCodes.codeType, "pilot"),
        inArray(activationCodes.codeStatus, ["issued", "activated"]),
        gt(activationCodes.pilotUntil, sql`UTC_TIMESTAMP()`),
        inArray(instances.customerId, customerIds)
      )
    );

  return Number(rows[0]?.total ?? 0);
}
