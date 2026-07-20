import { randomUUID } from "node:crypto";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { getDrizzleDb } from "../../db/client.js";
import { boxSales, customers, instances } from "../../db/schema.js";
import { buildPendingTokenHash } from "../instances/integrationToken.js";
import { formatRubDecimal } from "../../utils/salesFormat.js";

export type BoxSaleRecord = {
  id: string;
  customerId: string;
  instanceId: string | null;
  licenseId: string | null;
  packageSku: string;
  modules: string[];
  listPriceRub: string;
  soldPriceRub: string;
  soldAt: string;
  contractRef: string | null;
  salesUserId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BoxSaleListItem = BoxSaleRecord & {
  customer: {
    legalName: string;
    inn: string | null;
  };
};

type BoxSaleRow = {
  id: string;
  customerId: string;
  instanceId: string | null;
  licenseId: string | null;
  packageSku: string;
  modules: unknown;
  listPriceRub: string | number;
  soldPriceRub: string | number;
  soldAt: Date | string;
  contractRef: string | null;
  salesUserId: string;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  legalName: string;
  inn: string | null;
};

function parseModules(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString()) as unknown as string[];
  }
  if (typeof value === "string") {
    return JSON.parse(value) as unknown as string[];
  }
  return [];
}

function toIsoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: BoxSaleRow): BoxSaleRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    instanceId: row.instanceId,
    licenseId: row.licenseId,
    packageSku: row.packageSku,
    modules: parseModules(row.modules),
    listPriceRub: formatRubDecimal(row.listPriceRub),
    soldPriceRub: formatRubDecimal(row.soldPriceRub),
    soldAt: toIsoDate(row.soldAt),
    contractRef: row.contractRef,
    salesUserId: row.salesUserId,
    notes: row.notes,
    createdAt: toIsoTimestamp(row.createdAt),
    updatedAt: toIsoTimestamp(row.updatedAt)
  };
}

function mapListRow(row: BoxSaleRow): BoxSaleListItem {
  return {
    ...mapRow(row),
    customer: {
      legalName: row.legalName,
      inn: row.inn ?? null
    }
  };
}

function buildListConditions(params: {
  q?: string;
  customerId?: string;
  instanceId?: string;
  packageSku?: string;
  from?: string;
  to?: string;
}): SQL<unknown>[] {
  const conditions: SQL<unknown>[] = [];

  if (params.customerId?.trim()) {
    conditions.push(eq(boxSales.customerId, params.customerId.trim()));
  }

  if (params.instanceId?.trim()) {
    conditions.push(eq(boxSales.instanceId, params.instanceId.trim()));
  }

  if (params.packageSku?.trim()) {
    conditions.push(eq(boxSales.packageSku, params.packageSku.trim()));
  }

  if (params.from?.trim()) {
    conditions.push(sql`${boxSales.soldAt} >= DATE(${params.from.trim()})`);
  }

  if (params.to?.trim()) {
    conditions.push(sql`${boxSales.soldAt} <= DATE(${params.to.trim()})`);
  }

  if (params.q?.trim()) {
    const term = `%${params.q.trim()}%`;
    conditions.push(
      or(
        like(customers.legalName, term),
        like(customers.inn, term),
        like(boxSales.packageSku, term),
        like(boxSales.contractRef, term)
      )!
    );
  }
  return conditions;
}

export async function listBoxSales(params: {
  q?: string;
  customerId?: string;
  instanceId?: string;
  packageSku?: string;
  from?: string;
  to?: string;
  offset: number;
  limit: number;
}): Promise<{ items: BoxSaleListItem[]; total: number }> {
  const db = getDrizzleDb();
  const conditions = buildListConditions(params);
  const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

  const countRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(boxSales)
    .innerJoin(customers, eq(customers.id, boxSales.customerId))
    .where(whereExpr);
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await db
    .select({
      id: boxSales.id,
      customerId: boxSales.customerId,
      instanceId: boxSales.instanceId,
      licenseId: boxSales.licenseId,
      packageSku: boxSales.packageSku,
      modules: boxSales.modules,
      listPriceRub: boxSales.listPriceRub,
      soldPriceRub: boxSales.soldPriceRub,
      soldAt: boxSales.soldAt,
      contractRef: boxSales.contractRef,
      salesUserId: boxSales.salesUserId,
      notes: boxSales.notes,
      createdAt: boxSales.createdAt,
      updatedAt: boxSales.updatedAt,
      legalName: customers.legalName,
      inn: customers.inn
    })
    .from(boxSales)
    .innerJoin(customers, eq(customers.id, boxSales.customerId))
    .where(whereExpr)
    .orderBy(desc(boxSales.soldAt), desc(boxSales.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  return { items: rows.map(mapListRow), total };
}

export async function findBoxSaleById(id: string): Promise<BoxSaleListItem | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: boxSales.id,
      customerId: boxSales.customerId,
      instanceId: boxSales.instanceId,
      licenseId: boxSales.licenseId,
      packageSku: boxSales.packageSku,
      modules: boxSales.modules,
      listPriceRub: boxSales.listPriceRub,
      soldPriceRub: boxSales.soldPriceRub,
      soldAt: boxSales.soldAt,
      contractRef: boxSales.contractRef,
      salesUserId: boxSales.salesUserId,
      notes: boxSales.notes,
      createdAt: boxSales.createdAt,
      updatedAt: boxSales.updatedAt,
      legalName: customers.legalName,
      inn: customers.inn
    })
    .from(boxSales)
    .innerJoin(customers, eq(customers.id, boxSales.customerId))
    .where(eq(boxSales.id, id))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  return mapListRow(rows[0]);
}

export async function createBoxSale(data: {
  customerId: string;
  instanceId: string | null;
  licenseId: string | null;
  packageSku: string;
  modules: string[];
  listPriceRub: string;
  soldPriceRub: string;
  soldAt: string;
  contractRef: string | null;
  salesUserId: string;
  notes: string | null;
}): Promise<BoxSaleListItem> {
  const db = getDrizzleDb();
  const id = randomUUID();

  await db.insert(boxSales).values({
    id,
    customerId: data.customerId,
    instanceId: data.instanceId,
    licenseId: data.licenseId,
    packageSku: data.packageSku,
    modules: data.modules,
    listPriceRub: data.listPriceRub,
    soldPriceRub: data.soldPriceRub,
    soldAt: sql`DATE(${data.soldAt})`,
    contractRef: data.contractRef,
    salesUserId: data.salesUserId,
    notes: data.notes,
    createdAt: sql`UTC_TIMESTAMP()`,
    updatedAt: sql`UTC_TIMESTAMP()`
  });

  const created = await findBoxSaleById(id);
  if (!created) {
    throw new Error("Failed to create box sale");
  }

  return created;
}

export async function createBoxSaleWithNewInstance(data: {
  customerId: string;
  licenseId: string | null;
  packageSku: string;
  modules: string[];
  listPriceRub: string;
  soldPriceRub: string;
  soldAt: string;
  contractRef: string | null;
  salesUserId: string;
  notes: string | null;
}): Promise<BoxSaleListItem> {
  const db = getDrizzleDb();
  return db.transaction(async (tx) => {
    const instanceId = randomUUID();
    const saleId = randomUUID();

    await tx.insert(instances).values({
      id: instanceId,
      customerId: data.customerId,
      hostname: null,
      deployUrl: null,
      integrationTokenHash: buildPendingTokenHash(instanceId),
      integrationTokenIssuedAt: sql`UTC_TIMESTAMP()`,
      instanceStatus: "planned",
      notes: null,
      createdAt: sql`UTC_TIMESTAMP()`,
      updatedAt: sql`UTC_TIMESTAMP()`
    });

    await tx.insert(boxSales).values({
      id: saleId,
      customerId: data.customerId,
      instanceId,
      licenseId: data.licenseId,
      packageSku: data.packageSku,
      modules: data.modules,
      listPriceRub: data.listPriceRub,
      soldPriceRub: data.soldPriceRub,
      soldAt: sql`DATE(${data.soldAt})`,
      contractRef: data.contractRef,
      salesUserId: data.salesUserId,
      notes: data.notes,
      createdAt: sql`UTC_TIMESTAMP()`,
      updatedAt: sql`UTC_TIMESTAMP()`
    });

    const rows = await tx
      .select({
        id: boxSales.id,
        customerId: boxSales.customerId,
        instanceId: boxSales.instanceId,
        licenseId: boxSales.licenseId,
        packageSku: boxSales.packageSku,
        modules: boxSales.modules,
        listPriceRub: boxSales.listPriceRub,
        soldPriceRub: boxSales.soldPriceRub,
        soldAt: boxSales.soldAt,
        contractRef: boxSales.contractRef,
        salesUserId: boxSales.salesUserId,
        notes: boxSales.notes,
        createdAt: boxSales.createdAt,
        updatedAt: boxSales.updatedAt,
        legalName: customers.legalName,
        inn: customers.inn
      })
      .from(boxSales)
      .innerJoin(customers, eq(customers.id, boxSales.customerId))
      .where(eq(boxSales.id, saleId))
      .limit(1);

    if (rows.length === 0) {
      throw new Error("Failed to create box sale with instance");
    }

    return mapListRow(rows[0]);
  });
}

export async function updateBoxSale(
  id: string,
  data: Partial<{
    instanceId: string | null;
    licenseId: string | null;
    soldPriceRub: string;
    soldAt: string;
    contractRef: string | null;
    notes: string | null;
  }>
): Promise<BoxSaleListItem | null> {
  const existing = await findBoxSaleById(id);
  if (!existing) {
    return null;
  }

  const db = getDrizzleDb();
  await db
    .update(boxSales)
    .set({
      instanceId: data.instanceId !== undefined ? data.instanceId : existing.instanceId,
      licenseId: data.licenseId !== undefined ? data.licenseId : existing.licenseId,
      soldPriceRub: data.soldPriceRub ?? existing.soldPriceRub,
      soldAt: sql`DATE(${data.soldAt ?? existing.soldAt})`,
      contractRef: data.contractRef !== undefined ? data.contractRef : existing.contractRef,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      updatedAt: sql`UTC_TIMESTAMP()`
    })
    .where(eq(boxSales.id, id));

  return findBoxSaleById(id);
}

export async function getBoxSalesStats(params: {
  from?: string;
  to?: string;
}): Promise<{
  totalCount: number;
  revenueRub: string;
  byPackage: Array<{ packageSku: string; count: number; revenueRub: string }>;
  avgSoldPriceRub: string;
}> {
  const db = getDrizzleDb();
  const conditions = buildListConditions(params);
  const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

  const totalRows = await db
    .select({
      totalCount: sql<number>`count(*)`,
      revenueRub: sql<number | string>`coalesce(sum(${boxSales.soldPriceRub}), 0)`
    })
    .from(boxSales)
    .innerJoin(customers, eq(customers.id, boxSales.customerId))
    .where(whereExpr);

  const totalCount = Number(totalRows[0]?.totalCount ?? 0);
  const revenueRub = formatRubDecimal(totalRows[0]?.revenueRub ?? 0);
  const avgSoldPriceRub =
    totalCount === 0
      ? "0.00"
      : formatRubDecimal(Number(revenueRub) / totalCount);

  const packageRows = await db
    .select({
      packageSku: boxSales.packageSku,
      count: sql<number>`count(*)`,
      revenueRub: sql<number | string>`coalesce(sum(${boxSales.soldPriceRub}), 0)`
    })
    .from(boxSales)
    .innerJoin(customers, eq(customers.id, boxSales.customerId))
    .where(whereExpr)
    .groupBy(boxSales.packageSku)
    .orderBy(boxSales.packageSku);

  return {
    totalCount,
    revenueRub,
    avgSoldPriceRub,
    byPackage: packageRows.map((row) => ({
      packageSku: String(row.packageSku),
      count: Number(row.count),
      revenueRub: formatRubDecimal(row.revenueRub)
    }))
  };
}

export async function boxSaleExists(id: string): Promise<boolean> {
  const db = getDrizzleDb();
  const rows = await db
    .select({ id: boxSales.id })
    .from(boxSales)
    .where(eq(boxSales.id, id))
    .limit(1);
  return rows.length > 0;
}
