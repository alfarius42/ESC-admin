import { buildPaginationMeta, getPaginationParams } from "../../utils/pagination.js";
import {
  addPriceListItem,
  createPriceList,
  deletePriceListItem,
  findPriceListById,
  findPublishedPriceList,
  importCanonToPriceList,
  listPriceLists,
  publishPriceList,
  updatePriceList,
  updatePriceListItem
} from "./priceListsRepository.js";
import {
  validateImportCanonInput,
  validatePriceListCreate,
  validatePriceListItemCreate,
  validatePriceListItemPatch,
  validatePriceListListQuery,
  validatePriceListPatch,
  type ImportCanonInput,
  type PriceListInput,
  type PriceListItemInput,
  type PriceListListQuery
} from "./priceListsValidation.js";

export async function getPriceListsList(query: PriceListListQuery) {
  const validation = validatePriceListListQuery(query);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const { page, limit, offset } = getPaginationParams(query);
  const { items, total } = await listPriceLists({ offset, limit });

  return {
    items,
    meta: buildPaginationMeta(page, limit, total)
  };
}

export async function getPriceListDetail(id: string) {
  return findPriceListById(id);
}

export async function getCurrentPriceList() {
  return findPublishedPriceList();
}

export async function createPriceListRecord(input: PriceListInput) {
  const validation = validatePriceListCreate(input);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const priceList = await createPriceList(validation.data);
  return { priceList } as const;
}

export async function patchPriceListRecord(id: string, input: PriceListInput) {
  const validation = validatePriceListPatch(input);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const existing = await findPriceListById(id);
  if (!existing) {
    return { notFound: true } as const;
  }

  if (existing.isPublished) {
    return {
      conflict: true,
      message: "Published price list cannot be edited"
    } as const;
  }

  const priceList = await updatePriceList(id, validation.data);
  if (!priceList) {
    return { notFound: true } as const;
  }

  return { priceList } as const;
}

export async function publishPriceListRecord(id: string) {
  const existing = await findPriceListById(id);
  if (!existing) {
    return { notFound: true } as const;
  }

  if (existing.items.length === 0) {
    return {
      error: { items: "Cannot publish an empty price list" }
    } as const;
  }

  const priceList = await publishPriceList(id);
  if (!priceList) {
    return { notFound: true } as const;
  }

  return { priceList } as const;
}

export async function createPriceListItemRecord(
  priceListId: string,
  input: PriceListItemInput
) {
  const validation = validatePriceListItemCreate(input);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const list = await findPriceListById(priceListId);
  if (!list) {
    return { notFound: true } as const;
  }

  if (list.isPublished) {
    return {
      conflict: true,
      message: "Published price list cannot be edited"
    } as const;
  }

  const duplicateSku = list.items.some((item) => item.sku === validation.data.sku);
  if (duplicateSku) {
    return {
      error: { sku: "SKU already exists in this price list" }
    } as const;
  }

  const item = await addPriceListItem(priceListId, validation.data);
  if (!item) {
    return { conflict: true, message: "Failed to add item" } as const;
  }

  return { item } as const;
}

export async function patchPriceListItemRecord(
  priceListId: string,
  itemId: string,
  input: PriceListItemInput
) {
  const validation = validatePriceListItemPatch(input);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const list = await findPriceListById(priceListId);
  if (!list) {
    return { notFound: true } as const;
  }

  if (list.isPublished) {
    return {
      conflict: true,
      message: "Published price list cannot be edited"
    } as const;
  }

  const item = await updatePriceListItem(priceListId, itemId, validation.data);
  if (!item) {
    return { notFound: true } as const;
  }

  return { item } as const;
}

export async function removePriceListItemRecord(priceListId: string, itemId: string) {
  const list = await findPriceListById(priceListId);
  if (!list) {
    return { notFound: true } as const;
  }

  if (list.isPublished) {
    return {
      conflict: true,
      message: "Published price list cannot be edited"
    } as const;
  }

  const deleted = await deletePriceListItem(priceListId, itemId);
  if (!deleted) {
    return { notFound: true } as const;
  }

  return { deleted: true } as const;
}

export async function importCanonPriceList(input: ImportCanonInput) {
  const validation = validateImportCanonInput(input);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const result = await importCanonToPriceList(validation.data);
  if (!result) {
    return {
      notFound: true,
      message: "Target price list not found or already published"
    } as const;
  }

  return result;
}
