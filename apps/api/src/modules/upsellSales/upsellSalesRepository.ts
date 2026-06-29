import { randomUUID } from "node:crypto";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { getDrizzleDb } from "../../db/client.js";
import { customers, upsellSales } from "../../db/schema.js";
import { formatRubDecimal } from "../../utils/salesFormat.js";

type UpsellSkuCategory =
  | "license_upgrade"
  | "deploy"
  | "dev"
  | "support"
  | "legal"
  | "other";

export type UpsellSaleRecord = {
  id: string;
  customerId: string;
  instanceId: string | null;
  sku: string;
  skuCategory: string;
  title: string;
  listPriceRub: string;
  soldPriceRub: string;
  soldAt: string;
  contractRef: string | null;
  salesUserId: string;
  linkedBoxSaleId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsellSaleListItem = UpsellSaleRecord & {
  customer: {
    legalName: string;
    inn: string | null;
  };
};

type UpsellSaleRow = {
  id: string;
  customerId: string;
  instanceId: string | null;
  sku: string;
  skuCategory: string;
  title: string;
  listPriceRub: string | number;
  soldPriceRub: string | number;
  soldAt: Date | string;
  contractRef: string | null;
  salesUserId: string;
  linkedBoxSaleId: string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  legalName: string;
  inn: string | null;
};

function toIsoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: UpsellSaleRow): UpsellSaleRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    instanceId: row.instanceId,
    sku: row.sku,
    skuCategory: row.skuCategory,
    title: row.title,
    listPriceRub: formatRubDecimal(row.listPriceRub),
    soldPriceRub: formatRubDecimal(row.soldPriceRub),
    soldAt: toIsoDate(row.soldAt),
    contractRef: row.contractRef,
    salesUserId: row.salesUserId,
    linkedBoxSaleId: row.linkedBoxSaleId,
    notes: row.notes,
    createdAt: toIsoTimestamp(row.createdAt),
    updatedAt: toIsoTimestamp(row.updatedAt)
  };
}

function mapListRow(row: UpsellSaleRow): UpsellSaleListItem {
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
  sku?: string;
  skuCategory?: string;
  from?: string;
  to?: string;
}): SQL<unknown>[] {
  const conditions: SQL<unknown>[] = [];

  if (params.customerId?.trim()) {
    conditions.push(eq(upsellSales.customerId, params.customerId.trim()));
  }

  if (params.instanceId?.trim()) {
    conditions.push(eq(upsellSales.instanceId, params.instanceId.trim()));
  }

  if (params.sku?.trim()) {
    conditions.push(eq(upsellSales.sku, params.sku.trim()));
  }

  if (params.skuCategory?.trim()) {
    conditions.push(eq(upsellSales.skuCategory, params.skuCategory.trim() as UpsellSkuCategory));
  }

  if (params.from?.trim()) {
    conditions.push(sql`${upsellSales.soldAt} >= DATE(${params.from.trim()})`);
  }

  if (params.to?.trim()) {
    conditions.push(sql`${upsellSales.soldAt} <= DATE(${params.to.trim()})`);
  }

  if (params.q?.trim()) {
    const term = `%${params.q.trim()}%`;
    conditions.push(
      or(
        like(customers.legalName, term),
        like(customers.inn, term),
        like(upsellSales.sku, term),
        like(upsellSales.title, term)
      )!
    );
  }
  return conditions;
}

export async function listUpsellSales(params: {
  q?: string;
  customerId?: string;
  instanceId?: string;
  sku?: string;
  skuCategory?: string;
  from?: string;
  to?: string;
  offset: number;
  limit: number;
}): Promise<{ items: UpsellSaleListItem[]; total: number }> {
  const db = getDrizzleDb();
  const conditions = buildListConditions(params);
  const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

  const countRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(upsellSales)
    .innerJoin(customers, eq(customers.id, upsellSales.customerId))
    .where(whereExpr);
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await db
    .select({
      id: upsellSales.id,
      customerId: upsellSales.customerId,
      instanceId: upsellSales.instanceId,
      sku: upsellSales.sku,
      skuCategory: upsellSales.skuCategory,
      title: upsellSales.title,
      listPriceRub: upsellSales.listPriceRub,
      soldPriceRub: upsellSales.soldPriceRub,
      soldAt: upsellSales.soldAt,
      contractRef: upsellSales.contractRef,
      salesUserId: upsellSales.salesUserId,
      linkedBoxSaleId: upsellSales.linkedBoxSaleId,
      notes: upsellSales.notes,
      createdAt: upsellSales.createdAt,
      updatedAt: upsellSales.updatedAt,
      legalName: customers.legalName,
      inn: customers.inn
    })
    .from(upsellSales)
    .innerJoin(customers, eq(customers.id, upsellSales.customerId))
    .where(whereExpr)
    .orderBy(desc(upsellSales.soldAt), desc(upsellSales.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  return { items: rows.map(mapListRow), total };
}

export async function findUpsellSaleById(
  id: string
): Promise<UpsellSaleListItem | null> {
  const db = getDrizzleDb();
  const rows = await db
    .select({
      id: upsellSales.id,
      customerId: upsellSales.customerId,
      instanceId: upsellSales.instanceId,
      sku: upsellSales.sku,
      skuCategory: upsellSales.skuCategory,
      title: upsellSales.title,
      listPriceRub: upsellSales.listPriceRub,
      soldPriceRub: upsellSales.soldPriceRub,
      soldAt: upsellSales.soldAt,
      contractRef: upsellSales.contractRef,
      salesUserId: upsellSales.salesUserId,
      linkedBoxSaleId: upsellSales.linkedBoxSaleId,
      notes: upsellSales.notes,
      createdAt: upsellSales.createdAt,
      updatedAt: upsellSales.updatedAt,
      legalName: customers.legalName,
      inn: customers.inn
    })
    .from(upsellSales)
    .innerJoin(customers, eq(customers.id, upsellSales.customerId))
    .where(eq(upsellSales.id, id))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  return mapListRow(rows[0]);
}

export async function createUpsellSale(data: {
  customerId: string;
  instanceId: string | null;
  sku: string;
  skuCategory: string;
  title: string;
  listPriceRub: string;
  soldPriceRub: string;
  soldAt: string;
  contractRef: string | null;
  salesUserId: string;
  linkedBoxSaleId: string | null;
  notes: string | null;
}): Promise<UpsellSaleListItem> {
  const db = getDrizzleDb();
  const id = randomUUID();

  await db.insert(upsellSales).values({
    id,
    customerId: data.customerId,
    instanceId: data.instanceId,
    sku: data.sku,
    skuCategory: data.skuCategory as UpsellSkuCategory,
    title: data.title,
    listPriceRub: data.listPriceRub,
    soldPriceRub: data.soldPriceRub,
    soldAt: sql`DATE(${data.soldAt})`,
    contractRef: data.contractRef,
    salesUserId: data.salesUserId,
    linkedBoxSaleId: data.linkedBoxSaleId,
    notes: data.notes,
    createdAt: sql`UTC_TIMESTAMP()`,
    updatedAt: sql`UTC_TIMESTAMP()`
  });

  const created = await findUpsellSaleById(id);
  if (!created) {
    throw new Error("Failed to create upsell sale");
  }

  return created;
}

export async function updateUpsellSale(
  id: string,
  data: Partial<{
    instanceId: string | null;
    soldPriceRub: string;
    soldAt: string;
    contractRef: string | null;
    linkedBoxSaleId: string | null;
    notes: string | null;
  }>
): Promise<UpsellSaleListItem | null> {
  const existing = await findUpsellSaleById(id);
  if (!existing) {
    return null;
  }

  const db = getDrizzleDb();
  await db
    .update(upsellSales)
    .set({
      instanceId: data.instanceId !== undefined ? data.instanceId : existing.instanceId,
      soldPriceRub: data.soldPriceRub ?? existing.soldPriceRub,
      soldAt: sql`DATE(${data.soldAt ?? existing.soldAt})`,
      contractRef: data.contractRef !== undefined ? data.contractRef : existing.contractRef,
      linkedBoxSaleId:
        data.linkedBoxSaleId !== undefined ? data.linkedBoxSaleId : existing.linkedBoxSaleId,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      updatedAt: sql`UTC_TIMESTAMP()`
    })
    .where(eq(upsellSales.id, id));

  return findUpsellSaleById(id);
}

export async function getUpsellSalesStats(params: {
  from?: string;
  to?: string;
}): Promise<{
  totalCount: number;
  revenueRub: string;
  byCategory: Array<{ skuCategory: string; count: number; revenueRub: string }>;
  bySku: Array<{ sku: string; count: number; revenueRub: string }>;
}> {
  const db = getDrizzleDb();
  const conditions = buildListConditions(params);
  const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

  const totalRows = await db
    .select({
      totalCount: sql<number>`count(*)`,
      revenueRub: sql<number | string>`coalesce(sum(${upsellSales.soldPriceRub}), 0)`
    })
    .from(upsellSales)
    .innerJoin(customers, eq(customers.id, upsellSales.customerId))
    .where(whereExpr);

  const totalCount = Number(totalRows[0]?.totalCount ?? 0);
  const revenueRub = formatRubDecimal(totalRows[0]?.revenueRub ?? 0);

  const categoryRows = await db
    .select({
      skuCategory: upsellSales.skuCategory,
      count: sql<number>`count(*)`,
      revenueRub: sql<number | string>`coalesce(sum(${upsellSales.soldPriceRub}), 0)`
    })
    .from(upsellSales)
    .innerJoin(customers, eq(customers.id, upsellSales.customerId))
    .where(whereExpr)
    .groupBy(upsellSales.skuCategory)
    .orderBy(upsellSales.skuCategory);

  const skuRows = await db
    .select({
      sku: upsellSales.sku,
      count: sql<number>`count(*)`,
      revenueRub: sql<number | string>`coalesce(sum(${upsellSales.soldPriceRub}), 0)`
    })
    .from(upsellSales)
    .innerJoin(customers, eq(customers.id, upsellSales.customerId))
    .where(whereExpr)
    .groupBy(upsellSales.sku)
    .orderBy(upsellSales.sku);

  return {
    totalCount,
    revenueRub,
    byCategory: categoryRows.map((row) => ({
      skuCategory: String(row.skuCategory),
      count: Number(row.count),
      revenueRub: formatRubDecimal(row.revenueRub)
    })),
    bySku: skuRows.map((row) => ({
      sku: String(row.sku),
      count: Number(row.count),
      revenueRub: formatRubDecimal(row.revenueRub)
    }))
  };
}
