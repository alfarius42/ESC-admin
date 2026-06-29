import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { getDbPool } from "../../db/client.js";
import { formatRubDecimal } from "../../utils/salesFormat.js";

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

type UpsellSaleRow = RowDataPacket & {
  id: string;
  customer_id: string;
  instance_id: string | null;
  sku: string;
  sku_category: string;
  title: string;
  list_price_rub: string | number;
  sold_price_rub: string | number;
  sold_at: Date;
  contract_ref: string | null;
  sales_user_id: string;
  linked_box_sale_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  legal_name?: string;
  inn?: string | null;
};

function mapRow(row: UpsellSaleRow): UpsellSaleRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    instanceId: row.instance_id,
    sku: row.sku,
    skuCategory: row.sku_category,
    title: row.title,
    listPriceRub: formatRubDecimal(row.list_price_rub),
    soldPriceRub: formatRubDecimal(row.sold_price_rub),
    soldAt: row.sold_at.toISOString().slice(0, 10),
    contractRef: row.contract_ref,
    salesUserId: row.sales_user_id,
    linkedBoxSaleId: row.linked_box_sale_id,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function mapListRow(row: UpsellSaleRow): UpsellSaleListItem {
  return {
    ...mapRow(row),
    customer: {
      legalName: row.legal_name ?? "",
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
}): { whereClause: string; values: string[] } {
  const conditions: string[] = [];
  const values: string[] = [];

  if (params.customerId?.trim()) {
    conditions.push("us.customer_id = ?");
    values.push(params.customerId.trim());
  }

  if (params.instanceId?.trim()) {
    conditions.push("us.instance_id = ?");
    values.push(params.instanceId.trim());
  }

  if (params.sku?.trim()) {
    conditions.push("us.sku = ?");
    values.push(params.sku.trim());
  }

  if (params.skuCategory?.trim()) {
    conditions.push("us.sku_category = ?");
    values.push(params.skuCategory.trim());
  }

  if (params.from?.trim()) {
    conditions.push("us.sold_at >= ?");
    values.push(params.from.trim());
  }

  if (params.to?.trim()) {
    conditions.push("us.sold_at <= ?");
    values.push(params.to.trim());
  }

  if (params.q?.trim()) {
    const term = `%${params.q.trim()}%`;
    conditions.push(
      "(c.legal_name LIKE ? OR c.inn LIKE ? OR us.sku LIKE ? OR us.title LIKE ?)"
    );
    values.push(term, term, term, term);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return { whereClause, values };
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
  const db = getDbPool();
  const { whereClause, values } = buildListConditions(params);

  const [countRows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM upsell_sales us
     INNER JOIN customers c ON c.id = us.customer_id
     ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await db.execute<UpsellSaleRow[]>(
    `SELECT us.id, us.customer_id, us.instance_id, us.sku, us.sku_category, us.title,
            us.list_price_rub, us.sold_price_rub, us.sold_at, us.contract_ref,
            us.sales_user_id, us.linked_box_sale_id, us.notes, us.created_at, us.updated_at,
            c.legal_name, c.inn
     FROM upsell_sales us
     INNER JOIN customers c ON c.id = us.customer_id
     ${whereClause}
     ORDER BY us.sold_at DESC, us.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, String(params.limit), String(params.offset)]
  );

  return { items: rows.map(mapListRow), total };
}

export async function findUpsellSaleById(
  id: string
): Promise<UpsellSaleListItem | null> {
  const db = getDbPool();
  const [rows] = await db.execute<UpsellSaleRow[]>(
    `SELECT us.id, us.customer_id, us.instance_id, us.sku, us.sku_category, us.title,
            us.list_price_rub, us.sold_price_rub, us.sold_at, us.contract_ref,
            us.sales_user_id, us.linked_box_sale_id, us.notes, us.created_at, us.updated_at,
            c.legal_name, c.inn
     FROM upsell_sales us
     INNER JOIN customers c ON c.id = us.customer_id
     WHERE us.id = ?
     LIMIT 1`,
    [id]
  );

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
  const db = getDbPool();
  const id = randomUUID();

  await db.execute(
    `INSERT INTO upsell_sales (
       id, customer_id, instance_id, sku, sku_category, title,
       list_price_rub, sold_price_rub, sold_at, contract_ref,
       sales_user_id, linked_box_sale_id, notes
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.customerId,
      data.instanceId,
      data.sku,
      data.skuCategory,
      data.title,
      data.listPriceRub,
      data.soldPriceRub,
      data.soldAt,
      data.contractRef,
      data.salesUserId,
      data.linkedBoxSaleId,
      data.notes
    ]
  );

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

  const db = getDbPool();
  await db.execute(
    `UPDATE upsell_sales SET
       instance_id = ?,
       sold_price_rub = ?,
       sold_at = ?,
       contract_ref = ?,
       linked_box_sale_id = ?,
       notes = ?
     WHERE id = ?`,
    [
      data.instanceId !== undefined ? data.instanceId : existing.instanceId,
      data.soldPriceRub ?? existing.soldPriceRub,
      data.soldAt ?? existing.soldAt,
      data.contractRef !== undefined ? data.contractRef : existing.contractRef,
      data.linkedBoxSaleId !== undefined
        ? data.linkedBoxSaleId
        : existing.linkedBoxSaleId,
      data.notes !== undefined ? data.notes : existing.notes,
      id
    ]
  );

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
  const db = getDbPool();
  const { whereClause, values } = buildListConditions(params);

  const [totalRows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS totalCount, COALESCE(SUM(us.sold_price_rub), 0) AS revenueRub
     FROM upsell_sales us
     INNER JOIN customers c ON c.id = us.customer_id
     ${whereClause}`,
    values
  );

  const totalCount = Number(totalRows[0]?.totalCount ?? 0);
  const revenueRub = formatRubDecimal(totalRows[0]?.revenueRub ?? 0);

  const [categoryRows] = await db.execute<RowDataPacket[]>(
    `SELECT us.sku_category AS skuCategory,
            COUNT(*) AS count,
            COALESCE(SUM(us.sold_price_rub), 0) AS revenueRub
     FROM upsell_sales us
     INNER JOIN customers c ON c.id = us.customer_id
     ${whereClause}
     GROUP BY us.sku_category
     ORDER BY us.sku_category ASC`,
    values
  );

  const [skuRows] = await db.execute<RowDataPacket[]>(
    `SELECT us.sku,
            COUNT(*) AS count,
            COALESCE(SUM(us.sold_price_rub), 0) AS revenueRub
     FROM upsell_sales us
     INNER JOIN customers c ON c.id = us.customer_id
     ${whereClause}
     GROUP BY us.sku
     ORDER BY us.sku ASC`,
    values
  );

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
