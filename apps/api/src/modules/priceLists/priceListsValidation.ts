import { isValidDateOnly, isValidDecimalRub } from "../../utils/salesFormat.js";

export type PriceListInput = {
  title?: string;
  effectiveFrom?: string;
  effectiveUntil?: string | null;
  isPublished?: boolean;
  currency?: string;
};

export type PriceListItemInput = {
  sku?: string;
  itemType?: "package" | "upsell" | "subscription_renewal";
  title?: string;
  priceRub?: string | null;
  priceNote?: string | null;
  modules?: string[];
  subscriptionRenewalRub?: string | null;
  sortOrder?: number;
};

export type ImportCanonInput = {
  priceListId?: string;
  title?: string;
  effectiveFrom?: string;
};

export type PriceListListQuery = {
  page?: string;
  limit?: string;
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; details: Record<string, string> };

const ITEM_TYPES = new Set(["package", "upsell", "subscription_renewal"]);

function validateOptionalDate(
  value: string | null | undefined,
  field: string,
  details: Record<string, string>
): void {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (!isValidDateOnly(value)) {
    details[field] = `${field} must be YYYY-MM-DD`;
  }
}

function validateOptionalPrice(
  value: string | null | undefined,
  field: string,
  details: Record<string, string>
): void {
  if (value === undefined || value === null) {
    return;
  }
  if (!isValidDecimalRub(value)) {
    details[field] = `${field} must be a decimal string like 50000.00`;
  }
}

export function validatePriceListListQuery(
  query: PriceListListQuery
): ValidationResult<PriceListListQuery> {
  return { ok: true, data: query };
}

export function validatePriceListCreate(
  input: PriceListInput
): ValidationResult<{
  title: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isPublished: boolean;
  currency: string;
}> {
  const details: Record<string, string> = {};
  const title = input.title?.trim() ?? "";

  if (!title) {
    details.title = "title is required";
  }

  if (!input.effectiveFrom || !isValidDateOnly(input.effectiveFrom)) {
    details.effectiveFrom = "effectiveFrom must be YYYY-MM-DD";
  }

  validateOptionalDate(input.effectiveUntil, "effectiveUntil", details);

  const currency = input.currency?.trim() || "RUB";
  if (currency.length !== 3) {
    details.currency = "currency must be a 3-letter code";
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    data: {
      title,
      effectiveFrom: input.effectiveFrom!,
      effectiveUntil: input.effectiveUntil?.trim() || null,
      isPublished: input.isPublished === true,
      currency: currency.toUpperCase()
    }
  };
}

export function validatePriceListPatch(
  input: PriceListInput
): ValidationResult<{
  title?: string;
  effectiveFrom?: string;
  effectiveUntil?: string | null;
  currency?: string;
}> {
  const details: Record<string, string> = {};

  if (
    input.title === undefined &&
    input.effectiveFrom === undefined &&
    input.effectiveUntil === undefined &&
    input.currency === undefined
  ) {
    details._ = "At least one field is required";
  }

  if (input.title !== undefined && input.title.trim().length === 0) {
    details.title = "title cannot be empty";
  }

  if (input.effectiveFrom !== undefined && !isValidDateOnly(input.effectiveFrom)) {
    details.effectiveFrom = "effectiveFrom must be YYYY-MM-DD";
  }

  validateOptionalDate(input.effectiveUntil, "effectiveUntil", details);

  if (input.currency !== undefined && input.currency.trim().length !== 3) {
    details.currency = "currency must be a 3-letter code";
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  const patch: {
    title?: string;
    effectiveFrom?: string;
    effectiveUntil?: string | null;
    currency?: string;
  } = {};

  if (input.title !== undefined) {
    patch.title = input.title.trim();
  }
  if (input.effectiveFrom !== undefined) {
    patch.effectiveFrom = input.effectiveFrom;
  }
  if (input.effectiveUntil !== undefined) {
    patch.effectiveUntil = input.effectiveUntil?.trim() || null;
  }
  if (input.currency !== undefined) {
    patch.currency = input.currency.trim().toUpperCase();
  }

  return { ok: true, data: patch };
}

export function validatePriceListItemCreate(
  input: PriceListItemInput
): ValidationResult<{
  sku: string;
  itemType: "package" | "upsell" | "subscription_renewal";
  title: string;
  priceRub: string | null;
  priceNote: string | null;
  modules: string[];
  subscriptionRenewalRub: string | null;
  sortOrder: number;
}> {
  const details: Record<string, string> = {};
  const sku = input.sku?.trim() ?? "";
  const title = input.title?.trim() ?? "";

  if (!sku) {
    details.sku = "sku is required";
  }

  if (!input.itemType || !ITEM_TYPES.has(input.itemType)) {
    details.itemType = "itemType must be package, upsell, or subscription_renewal";
  }

  if (!title) {
    details.title = "title is required";
  }

  validateOptionalPrice(input.priceRub, "priceRub", details);
  validateOptionalPrice(input.subscriptionRenewalRub, "subscriptionRenewalRub", details);

  if (input.modules !== undefined && !Array.isArray(input.modules)) {
    details.modules = "modules must be an array";
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    data: {
      sku,
      itemType: input.itemType!,
      title,
      priceRub: input.priceRub ?? null,
      priceNote: input.priceNote?.trim() || null,
      modules: input.modules ?? [],
      subscriptionRenewalRub: input.subscriptionRenewalRub ?? null,
      sortOrder: input.sortOrder ?? 0
    }
  };
}

export function validatePriceListItemPatch(
  input: PriceListItemInput
): ValidationResult<Partial<{
  itemType: "package" | "upsell" | "subscription_renewal";
  title: string;
  priceRub: string | null;
  priceNote: string | null;
  modules: string[];
  subscriptionRenewalRub: string | null;
  sortOrder: number;
}>> {
  const details: Record<string, string> = {};

  if (
    input.itemType === undefined &&
    input.title === undefined &&
    input.priceRub === undefined &&
    input.priceNote === undefined &&
    input.modules === undefined &&
    input.subscriptionRenewalRub === undefined &&
    input.sortOrder === undefined
  ) {
    details._ = "At least one field is required";
  }

  if (input.itemType !== undefined && !ITEM_TYPES.has(input.itemType)) {
    details.itemType = "itemType must be package, upsell, or subscription_renewal";
  }

  if (input.title !== undefined && input.title.trim().length === 0) {
    details.title = "title cannot be empty";
  }

  validateOptionalPrice(input.priceRub, "priceRub", details);
  validateOptionalPrice(input.subscriptionRenewalRub, "subscriptionRenewalRub", details);

  if (input.modules !== undefined && !Array.isArray(input.modules)) {
    details.modules = "modules must be an array";
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  const patch: Partial<{
    itemType: "package" | "upsell" | "subscription_renewal";
    title: string;
    priceRub: string | null;
    priceNote: string | null;
    modules: string[];
    subscriptionRenewalRub: string | null;
    sortOrder: number;
  }> = {};

  if (input.itemType !== undefined) {
    patch.itemType = input.itemType;
  }
  if (input.title !== undefined) {
    patch.title = input.title.trim();
  }
  if (input.priceRub !== undefined) {
    patch.priceRub = input.priceRub;
  }
  if (input.priceNote !== undefined) {
    patch.priceNote = input.priceNote?.trim() || null;
  }
  if (input.modules !== undefined) {
    patch.modules = input.modules;
  }
  if (input.subscriptionRenewalRub !== undefined) {
    patch.subscriptionRenewalRub = input.subscriptionRenewalRub;
  }
  if (input.sortOrder !== undefined) {
    patch.sortOrder = input.sortOrder;
  }

  return { ok: true, data: patch };
}

export function validateImportCanonInput(
  input: ImportCanonInput
): ValidationResult<ImportCanonInput> {
  const details: Record<string, string> = {};
  validateOptionalDate(input.effectiveFrom, "effectiveFrom", details);

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return { ok: true, data: input };
}
