import { randomUUID } from "node:crypto";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { getDrizzleDb } from "../../db/client.js";
import { priceListItems, priceLists } from "../../db/schema.js";
import { formatRubDecimal } from "../../utils/salesFormat.js";
import { CANON_PRICE_ITEMS } from "./canonCatalog.js";

export type PriceListRecord = {
  id: string;
  title: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isPublished: boolean;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type PriceListItemRecord = {
  id: string;
  priceListId: string;
  sku: string;
  itemType: "package" | "upsell" | "subscription_renewal";
  title: string;
  priceRub: string | null;
  priceNote: string | null;
  modules: string[];
  subscriptionRenewalRub: string | null;
  sortOrder: number;
};

export type PriceListDetail = PriceListRecord & {
  items: PriceListItemRecord[];
};

type PriceListRow = {
  id: string;
  title: string;
  effectiveFrom: Date | string;
  effectiveUntil: Date | string | null;
  isPublished: boolean | number;
  currency: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type PriceListItemRow = {
  id: string;
  priceListId: string;
  sku: string;
  itemType: "package" | "upsell" | "subscription_renewal";
  title: string;
  priceRub: string | number | null;
  priceNote: string | null;
  modules: unknown;
  subscriptionRenewalRub: string | number | null;
  sortOrder: number;
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

function toIsoDate(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapPriceList(row: PriceListRow): PriceListRecord {
  return {
    id: row.id,
    title: row.title,
    effectiveFrom: toIsoDate(row.effectiveFrom)!,
    effectiveUntil: toIsoDate(row.effectiveUntil),
    isPublished: Boolean(row.isPublished),
    currency: row.currency,
    createdAt: toIsoTimestamp(row.createdAt),
    updatedAt: toIsoTimestamp(row.updatedAt)
  };
}

function mapPriceListItem(row: PriceListItemRow): PriceListItemRecord {
  return {
    id: row.id,
    priceListId: row.priceListId,
    sku: row.sku,
    itemType: row.itemType,
    title: row.title,
    priceRub: row.priceRub === null ? null : formatRubDecimal(row.priceRub),
    priceNote: row.priceNote,
    modules: parseModules(row.modules),
    subscriptionRenewalRub:
      row.subscriptionRenewalRub === null
        ? null
        : formatRubDecimal(row.subscriptionRenewalRub),
    sortOrder: row.sortOrder
  };
}

export async function listPriceLists(params: {
  offset: number;
  limit: number;
}): Promise<{ items: PriceListRecord[]; total: number }> {
  const db = getDrizzleDb();

  const countRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(priceLists);
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await db
    .select()
    .from(priceLists)
    .orderBy(desc(priceLists.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  return { items: rows.map(mapPriceList), total };
}

export async function findPriceListById(id: string): Promise<PriceListDetail | null> {
  const db = getDrizzleDb();
  const listRows = await db
    .select()
    .from(priceLists)
    .where(eq(priceLists.id, id))
    .limit(1);

  if (listRows.length === 0) {
    return null;
  }

  const itemRows = await db
    .select()
    .from(priceListItems)
    .where(eq(priceListItems.priceListId, id))
    .orderBy(priceListItems.sortOrder, priceListItems.sku);

  return {
    ...mapPriceList(listRows[0]),
    items: itemRows.map(mapPriceListItem)
  };
}

export async function findPublishedPriceList(): Promise<PriceListDetail | null> {
  const db = getDrizzleDb();
  const listRows = await db
    .select()
    .from(priceLists)
    .where(eq(priceLists.isPublished, true))
    .orderBy(desc(priceLists.updatedAt))
    .limit(1);

  if (listRows.length === 0) {
    return null;
  }

  return findPriceListById(listRows[0].id);
}

export async function createPriceList(data: {
  title: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isPublished: boolean;
  currency: string;
}): Promise<PriceListRecord> {
  const db = getDrizzleDb();
  const id = randomUUID();

  await db.insert(priceLists).values({
    id,
    title: data.title,
    effectiveFrom: sql`DATE(${data.effectiveFrom})`,
    effectiveUntil: data.effectiveUntil
      ? sql`DATE(${data.effectiveUntil})`
      : null,
    isPublished: data.isPublished,
    currency: data.currency,
    createdAt: sql`UTC_TIMESTAMP()`,
    updatedAt: sql`UTC_TIMESTAMP()`
  });

  const created = await findPriceListById(id);
  if (!created) {
    throw new Error("Failed to create price list");
  }

  return created;
}

export async function updatePriceList(
  id: string,
  data: Partial<{
    title: string;
    effectiveFrom: string;
    effectiveUntil: string | null;
    currency: string;
  }>
): Promise<PriceListRecord | null> {
  const existing = await findPriceListById(id);
  if (!existing) {
    return null;
  }

  if (existing.isPublished) {
    return null;
  }

  const db = getDrizzleDb();
  await db
    .update(priceLists)
    .set({
      title: data.title ?? existing.title,
      effectiveFrom: sql`DATE(${data.effectiveFrom ?? existing.effectiveFrom})`,
      effectiveUntil:
        data.effectiveUntil !== undefined
          ? data.effectiveUntil
            ? sql`DATE(${data.effectiveUntil})`
            : null
          : existing.effectiveUntil
            ? sql`DATE(${existing.effectiveUntil})`
            : null,
      currency: data.currency ?? existing.currency,
      updatedAt: sql`UTC_TIMESTAMP()`
    })
    .where(eq(priceLists.id, id));

  const updated = await findPriceListById(id);
  if (!updated) {
    return null;
  }

  const { items: _items, ...record } = updated;
  return record;
}

export async function publishPriceList(id: string): Promise<PriceListRecord | null> {
  const existing = await findPriceListById(id);
  if (!existing) {
    return null;
  }

  const db = getDrizzleDb();
  await db.transaction(async (tx) => {
    await tx
      .update(priceLists)
      .set({ isPublished: false, updatedAt: sql`UTC_TIMESTAMP()` })
      .where(and(eq(priceLists.isPublished, true), ne(priceLists.id, id)));

    await tx
      .update(priceLists)
      .set({ isPublished: true, updatedAt: sql`UTC_TIMESTAMP()` })
      .where(eq(priceLists.id, id));
  });

  const published = await findPriceListById(id);
  if (!published) {
    return null;
  }

  const { items: _items, ...record } = published;
  return record;
}

export async function addPriceListItem(
  priceListId: string,
  data: Omit<PriceListItemRecord, "id" | "priceListId">
): Promise<PriceListItemRecord | null> {
  const list = await findPriceListById(priceListId);
  if (!list || list.isPublished) {
    return null;
  }

  const db = getDrizzleDb();
  const id = randomUUID();

  try {
    await db.insert(priceListItems).values({
      id,
      priceListId,
      sku: data.sku,
      itemType: data.itemType,
      title: data.title,
      priceRub: data.priceRub,
      priceNote: data.priceNote,
      modules: data.modules,
      subscriptionRenewalRub: data.subscriptionRenewalRub,
      sortOrder: data.sortOrder
    });
  } catch {
    return null;
  }

  const rows = await db
    .select()
    .from(priceListItems)
    .where(eq(priceListItems.id, id))
    .limit(1);

  return rows.length > 0 ? mapPriceListItem(rows[0]) : null;
}

export async function updatePriceListItem(
  priceListId: string,
  itemId: string,
  data: Partial<Omit<PriceListItemRecord, "id" | "priceListId" | "sku">>
): Promise<PriceListItemRecord | null> {
  const list = await findPriceListById(priceListId);
  if (!list || list.isPublished) {
    return null;
  }

  const existing = list.items.find((item) => item.id === itemId);
  if (!existing) {
    return null;
  }

  const db = getDrizzleDb();
  await db
    .update(priceListItems)
    .set({
      title: data.title ?? existing.title,
      itemType: data.itemType ?? existing.itemType,
      priceRub: data.priceRub !== undefined ? data.priceRub : existing.priceRub,
      priceNote: data.priceNote !== undefined ? data.priceNote : existing.priceNote,
      modules: data.modules ?? existing.modules,
      subscriptionRenewalRub:
        data.subscriptionRenewalRub !== undefined
          ? data.subscriptionRenewalRub
          : existing.subscriptionRenewalRub,
      sortOrder: data.sortOrder ?? existing.sortOrder
    })
    .where(and(eq(priceListItems.id, itemId), eq(priceListItems.priceListId, priceListId)));

  const rows = await db
    .select()
    .from(priceListItems)
    .where(eq(priceListItems.id, itemId))
    .limit(1);

  return rows.length > 0 ? mapPriceListItem(rows[0]) : null;
}

export async function deletePriceListItem(
  priceListId: string,
  itemId: string
): Promise<boolean> {
  const list = await findPriceListById(priceListId);
  if (!list || list.isPublished) {
    return false;
  }

  const existing = list.items.find((item) => item.id === itemId);
  if (!existing) {
    return false;
  }

  const db = getDrizzleDb();
  await db
    .delete(priceListItems)
    .where(and(eq(priceListItems.id, itemId), eq(priceListItems.priceListId, priceListId)));

  return true;
}

export async function importCanonToPriceList(params: {
  priceListId?: string;
  title?: string;
  effectiveFrom?: string;
}): Promise<{ priceListId: string; itemsCreated: number } | null> {
  const db = getDrizzleDb();
  let priceListId = params.priceListId?.trim();

  if (priceListId) {
    const existing = await findPriceListById(priceListId);
    if (!existing || existing.isPublished) {
      return null;
    }

    await db.delete(priceListItems).where(eq(priceListItems.priceListId, priceListId));
  } else {
    const year = new Date().getUTCFullYear();
    const created = await createPriceList({
      title: params.title?.trim() || `Прайс ${year}`,
      effectiveFrom: params.effectiveFrom ?? `${year}-01-01`,
      effectiveUntil: null,
      isPublished: false,
      currency: "RUB"
    });
    priceListId = created.id;
  }

  let itemsCreated = 0;
  for (const item of CANON_PRICE_ITEMS) {
    await db.insert(priceListItems).values({
      id: randomUUID(),
      priceListId,
      sku: item.sku,
      itemType: item.itemType,
      title: item.title,
      priceRub: item.priceRub,
      priceNote: item.priceNote,
      modules: item.modules,
      subscriptionRenewalRub: item.subscriptionRenewalRub,
      sortOrder: item.sortOrder
    });
    itemsCreated += 1;
  }

  await db
    .update(priceLists)
    .set({ updatedAt: sql`UTC_TIMESTAMP()` })
    .where(eq(priceLists.id, priceListId));

  return { priceListId, itemsCreated };
}
