import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { getDbPool, withTransaction } from "../../db/client.js";
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

type BoxSaleRow = RowDataPacket & {
  id: string;
  customer_id: string;
  instance_id: string | null;
  license_id: string | null;
  package_sku: string;
  modules: string | Buffer;
  list_price_rub: string | number;
  sold_price_rub: string | number;
  sold_at: Date;
  contract_ref: string | null;
  sales_user_id: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  legal_name?: string;
  inn?: string | null;
};

function parseModules(value: string | Buffer): string[] {
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString()) as string[];
  }
  if (typeof value === "string") {
    return JSON.parse(value) as string[];
  }
  return [];
}

function mapRow(row: BoxSaleRow): BoxSaleRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    instanceId: row.instance_id,
    licenseId: row.license_id,
    packageSku: row.package_sku,
    modules: parseModules(row.modules),
    listPriceRub: formatRubDecimal(row.list_price_rub),
    soldPriceRub: formatRubDecimal(row.sold_price_rub),
    soldAt: row.sold_at.toISOString().slice(0, 10),
    contractRef: row.contract_ref,
    salesUserId: row.sales_user_id,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function mapListRow(row: BoxSaleRow): BoxSaleListItem {
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
  packageSku?: string;
  from?: string;
  to?: string;
}): { whereClause: string; values: string[] } {
  const conditions: string[] = [];
  const values: string[] = [];

  if (params.customerId?.trim()) {
    conditions.push("bs.customer_id = ?");
    values.push(params.customerId.trim());
  }

  if (params.instanceId?.trim()) {
    conditions.push("bs.instance_id = ?");
    values.push(params.instanceId.trim());
  }

  if (params.packageSku?.trim()) {
    conditions.push("bs.package_sku = ?");
    values.push(params.packageSku.trim());
  }

  if (params.from?.trim()) {
    conditions.push("bs.sold_at >= ?");
    values.push(params.from.trim());
  }

  if (params.to?.trim()) {
    conditions.push("bs.sold_at <= ?");
    values.push(params.to.trim());
  }

  if (params.q?.trim()) {
    const term = `%${params.q.trim()}%`;
    conditions.push(
      "(c.legal_name LIKE ? OR c.inn LIKE ? OR bs.package_sku LIKE ? OR bs.contract_ref LIKE ?)"
    );
    values.push(term, term, term, term);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return { whereClause, values };
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
  const db = getDbPool();
  const { whereClause, values } = buildListConditions(params);

  const [countRows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM box_sales bs
     INNER JOIN customers c ON c.id = bs.customer_id
     ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await db.execute<BoxSaleRow[]>(
    `SELECT bs.id, bs.customer_id, bs.instance_id, bs.license_id, bs.package_sku,
            bs.modules, bs.list_price_rub, bs.sold_price_rub, bs.sold_at,
            bs.contract_ref, bs.sales_user_id, bs.notes, bs.created_at, bs.updated_at,
            c.legal_name, c.inn
     FROM box_sales bs
     INNER JOIN customers c ON c.id = bs.customer_id
     ${whereClause}
     ORDER BY bs.sold_at DESC, bs.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, String(params.limit), String(params.offset)]
  );

  return { items: rows.map(mapListRow), total };
}

export async function findBoxSaleById(id: string): Promise<BoxSaleListItem | null> {
  const db = getDbPool();
  const [rows] = await db.execute<BoxSaleRow[]>(
    `SELECT bs.id, bs.customer_id, bs.instance_id, bs.license_id, bs.package_sku,
            bs.modules, bs.list_price_rub, bs.sold_price_rub, bs.sold_at,
            bs.contract_ref, bs.sales_user_id, bs.notes, bs.created_at, bs.updated_at,
            c.legal_name, c.inn
     FROM box_sales bs
     INNER JOIN customers c ON c.id = bs.customer_id
     WHERE bs.id = ?
     LIMIT 1`,
    [id]
  );

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
  const db = getDbPool();
  const id = randomUUID();

  await db.execute(
    `INSERT INTO box_sales (
       id, customer_id, instance_id, license_id, package_sku, modules,
       list_price_rub, sold_price_rub, sold_at, contract_ref, sales_user_id, notes
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.customerId,
      data.instanceId,
      data.licenseId,
      data.packageSku,
      JSON.stringify(data.modules),
      data.listPriceRub,
      data.soldPriceRub,
      data.soldAt,
      data.contractRef,
      data.salesUserId,
      data.notes
    ]
  );

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
  return withTransaction(async (connection) => {
    const instanceId = randomUUID();
    const saleId = randomUUID();

    await connection.execute(
      `INSERT INTO instances (
         id, customer_id, hostname, deploy_url, integration_token_hash, instance_status, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        instanceId,
        data.customerId,
        null,
        null,
        buildPendingTokenHash(instanceId),
        "planned",
        null
      ]
    );

    await connection.execute(
      `INSERT INTO box_sales (
         id, customer_id, instance_id, license_id, package_sku, modules,
         list_price_rub, sold_price_rub, sold_at, contract_ref, sales_user_id, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleId,
        data.customerId,
        instanceId,
        data.licenseId,
        data.packageSku,
        JSON.stringify(data.modules),
        data.listPriceRub,
        data.soldPriceRub,
        data.soldAt,
        data.contractRef,
        data.salesUserId,
        data.notes
      ]
    );

    const [rows] = await connection.execute<BoxSaleRow[]>(
      `SELECT bs.id, bs.customer_id, bs.instance_id, bs.license_id, bs.package_sku,
              bs.modules, bs.list_price_rub, bs.sold_price_rub, bs.sold_at,
              bs.contract_ref, bs.sales_user_id, bs.notes, bs.created_at, bs.updated_at,
              c.legal_name, c.inn
       FROM box_sales bs
       INNER JOIN customers c ON c.id = bs.customer_id
       WHERE bs.id = ?
       LIMIT 1`,
      [saleId]
    );

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

  const db = getDbPool();
  await db.execute(
    `UPDATE box_sales SET
       instance_id = ?,
       license_id = ?,
       sold_price_rub = ?,
       sold_at = ?,
       contract_ref = ?,
       notes = ?
     WHERE id = ?`,
    [
      data.instanceId !== undefined ? data.instanceId : existing.instanceId,
      data.licenseId !== undefined ? data.licenseId : existing.licenseId,
      data.soldPriceRub ?? existing.soldPriceRub,
      data.soldAt ?? existing.soldAt,
      data.contractRef !== undefined ? data.contractRef : existing.contractRef,
      data.notes !== undefined ? data.notes : existing.notes,
      id
    ]
  );

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
  const db = getDbPool();
  const { whereClause, values } = buildListConditions(params);

  const [totalRows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS totalCount, COALESCE(SUM(bs.sold_price_rub), 0) AS revenueRub
     FROM box_sales bs
     INNER JOIN customers c ON c.id = bs.customer_id
     ${whereClause}`,
    values
  );

  const totalCount = Number(totalRows[0]?.totalCount ?? 0);
  const revenueRub = formatRubDecimal(totalRows[0]?.revenueRub ?? 0);
  const avgSoldPriceRub =
    totalCount === 0
      ? "0.00"
      : formatRubDecimal(Number(revenueRub) / totalCount);

  const [packageRows] = await db.execute<RowDataPacket[]>(
    `SELECT bs.package_sku AS packageSku,
            COUNT(*) AS count,
            COALESCE(SUM(bs.sold_price_rub), 0) AS revenueRub
     FROM box_sales bs
     INNER JOIN customers c ON c.id = bs.customer_id
     ${whereClause}
     GROUP BY bs.package_sku
     ORDER BY bs.package_sku ASC`,
    values
  );

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
  const db = getDbPool();
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT id FROM box_sales WHERE id = ? LIMIT 1",
    [id]
  );
  return rows.length > 0;
}
