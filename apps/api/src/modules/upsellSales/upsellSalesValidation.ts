import { getUpsellCatalogEntry } from "../sales/skuCatalog.js";
import {
  isValidDateOnly,
  isValidDecimalRub
} from "../../utils/salesFormat.js";

const SKU_CATEGORIES = new Set([
  "license_upgrade",
  "deploy",
  "dev",
  "support",
  "legal",
  "other"
]);

export type UpsellSaleInput = {
  customerId?: string;
  instanceId?: string | null;
  sku?: string;
  skuCategory?: string;
  title?: string;
  listPriceRub?: string;
  soldPriceRub?: string;
  soldAt?: string;
  contractRef?: string | null;
  linkedBoxSaleId?: string | null;
  notes?: string | null;
};

export type UpsellSaleListQuery = {
  q?: string;
  customerId?: string;
  instanceId?: string;
  sku?: string;
  skuCategory?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; details: Record<string, string> };

export type UpsellSaleCreateData = {
  customerId: string;
  instanceId: string | null;
  sku: string;
  skuCategory:
    | "license_upgrade"
    | "deploy"
    | "dev"
    | "support"
    | "legal"
    | "other";
  title: string;
  listPriceRub: string;
  soldPriceRub: string;
  soldAt: string;
  contractRef: string | null;
  linkedBoxSaleId: string | null;
  notes: string | null;
};

export type UpsellSalePatchData = Partial<{
  instanceId: string | null;
  soldPriceRub: string;
  soldAt: string;
  contractRef: string | null;
  linkedBoxSaleId: string | null;
  notes: string | null;
}>;

export type UpsellSaleStatsQuery = {
  from?: string;
  to?: string;
};

function validateOptionalDate(
  value: string | undefined,
  field: string,
  details: Record<string, string>
): void {
  if (value === undefined || value === "") {
    return;
  }
  if (!isValidDateOnly(value)) {
    details[field] = `${field} must be YYYY-MM-DD`;
  }
}

export function validateUpsellSaleListQuery(
  query: UpsellSaleListQuery
): ValidationResult<UpsellSaleListQuery> {
  const details: Record<string, string> = {};
  validateOptionalDate(query.from, "from", details);
  validateOptionalDate(query.to, "to", details);

  if (query.skuCategory && !SKU_CATEGORIES.has(query.skuCategory)) {
    details.skuCategory = "Invalid skuCategory";
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return { ok: true, data: query };
}

export function validateUpsellSaleStatsQuery(
  query: UpsellSaleStatsQuery
): ValidationResult<UpsellSaleStatsQuery> {
  const details: Record<string, string> = {};
  validateOptionalDate(query.from, "from", details);
  validateOptionalDate(query.to, "to", details);

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return { ok: true, data: query };
}

export function validateUpsellSaleCreate(
  input: UpsellSaleInput
): ValidationResult<UpsellSaleCreateData> {
  const details: Record<string, string> = {};
  const customerId = input.customerId?.trim() ?? "";

  if (!customerId) {
    details.customerId = "customerId is required";
  }

  const sku = input.sku?.trim() ?? "";
  if (!sku) {
    details.sku = "sku is required";
  }

  const catalog = sku ? getUpsellCatalogEntry(sku) : null;
  if (sku && !catalog) {
    details.sku = "Unknown sku";
  }

  if (catalog) {
    if (
      input.skuCategory !== undefined &&
      input.skuCategory.trim() !== catalog.skuCategory
    ) {
      details.skuCategory = "skuCategory is derived from catalog sku";
    }
    if (input.title !== undefined && input.title.trim() !== catalog.title) {
      details.title = "title is derived from catalog sku";
    }
    if (
      input.listPriceRub !== undefined &&
      catalog.listPriceRub !== null &&
      input.listPriceRub !== catalog.listPriceRub
    ) {
      details.listPriceRub = "listPriceRub is derived from catalog sku";
    }
  }

  const skuCategory = catalog?.skuCategory ?? input.skuCategory?.trim() ?? "";
  if (!SKU_CATEGORIES.has(skuCategory)) {
    details.skuCategory = "skuCategory is required and must be valid";
  }

  const title = catalog?.title ?? input.title?.trim() ?? "";
  if (!title) {
    details.title = "title is required";
  }

  if (!input.soldPriceRub || !isValidDecimalRub(input.soldPriceRub)) {
    details.soldPriceRub = "soldPriceRub must be a decimal string like 45000.00";
  }

  if (!input.soldAt || !isValidDateOnly(input.soldAt)) {
    details.soldAt = "soldAt must be YYYY-MM-DD";
  }

  if (
    !catalog &&
    input.listPriceRub !== undefined &&
    !isValidDecimalRub(input.listPriceRub)
  ) {
    details.listPriceRub = "listPriceRub must be a decimal string like 45000.00";
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  const listPriceRub =
    catalog?.listPriceRub ?? input.listPriceRub ?? input.soldPriceRub!;

  return {
    ok: true,
    data: {
      customerId,
      instanceId: input.instanceId?.trim() || null,
      sku,
      skuCategory: skuCategory as UpsellSaleCreateData["skuCategory"],
      title,
      listPriceRub,
      soldPriceRub: input.soldPriceRub!,
      soldAt: input.soldAt!,
      contractRef: input.contractRef?.trim() || null,
      linkedBoxSaleId: input.linkedBoxSaleId?.trim() || null,
      notes: input.notes?.trim() || null
    }
  };
}

export function validateUpsellSalePatch(
  input: UpsellSaleInput
): ValidationResult<UpsellSalePatchData> {
  const details: Record<string, string> = {};

  if (input.soldPriceRub !== undefined && !isValidDecimalRub(input.soldPriceRub)) {
    details.soldPriceRub = "soldPriceRub must be a decimal string like 45000.00";
  }

  if (input.soldAt !== undefined && !isValidDateOnly(input.soldAt)) {
    details.soldAt = "soldAt must be YYYY-MM-DD";
  }

  if (
    input.instanceId === undefined &&
    input.soldPriceRub === undefined &&
    input.soldAt === undefined &&
    input.contractRef === undefined &&
    input.linkedBoxSaleId === undefined &&
    input.notes === undefined
  ) {
    details._ = "At least one field is required";
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  const patch: UpsellSalePatchData = {};
  if (input.instanceId !== undefined) {
    patch.instanceId = input.instanceId?.trim() || null;
  }
  if (input.soldPriceRub !== undefined) {
    patch.soldPriceRub = input.soldPriceRub;
  }
  if (input.soldAt !== undefined) {
    patch.soldAt = input.soldAt;
  }
  if (input.contractRef !== undefined) {
    patch.contractRef = input.contractRef?.trim() || null;
  }
  if (input.linkedBoxSaleId !== undefined) {
    patch.linkedBoxSaleId = input.linkedBoxSaleId?.trim() || null;
  }
  if (input.notes !== undefined) {
    patch.notes = input.notes?.trim() || null;
  }

  return { ok: true, data: patch };
}
