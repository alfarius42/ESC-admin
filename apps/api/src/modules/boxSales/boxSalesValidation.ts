import { getPackageCatalogEntry } from "../sales/skuCatalog.js";
import {
  isValidDateOnly,
  isValidDecimalRub
} from "../../utils/salesFormat.js";

export type BoxSaleInput = {
  customerId?: string;
  instanceId?: string | null;
  licenseId?: string | null;
  packageSku?: string;
  modules?: string[];
  listPriceRub?: string;
  soldPriceRub?: string;
  soldAt?: string;
  contractRef?: string | null;
  notes?: string | null;
  createInstance?: boolean;
};

export type BoxSaleListQuery = {
  q?: string;
  customerId?: string;
  instanceId?: string;
  packageSku?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; details: Record<string, string> };

export type BoxSaleCreateData = {
  customerId: string;
  instanceId: string | null;
  licenseId: string | null;
  packageSku: string;
  modules: string[];
  listPriceRub: string;
  soldPriceRub: string;
  soldAt: string;
  contractRef: string | null;
  notes: string | null;
  createInstance: boolean;
};

export type BoxSalePatchData = Partial<{
  instanceId: string | null;
  licenseId: string | null;
  soldPriceRub: string;
  soldAt: string;
  contractRef: string | null;
  notes: string | null;
}>;

export type BoxSaleStatsQuery = {
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

export function validateBoxSaleListQuery(
  query: BoxSaleListQuery
): ValidationResult<BoxSaleListQuery> {
  const details: Record<string, string> = {};
  validateOptionalDate(query.from, "from", details);
  validateOptionalDate(query.to, "to", details);

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return { ok: true, data: query };
}

export function validateBoxSaleStatsQuery(
  query: BoxSaleStatsQuery
): ValidationResult<BoxSaleStatsQuery> {
  const details: Record<string, string> = {};
  validateOptionalDate(query.from, "from", details);
  validateOptionalDate(query.to, "to", details);

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return { ok: true, data: query };
}

export function validateBoxSaleCreate(
  input: BoxSaleInput
): ValidationResult<BoxSaleCreateData> {
  const details: Record<string, string> = {};
  const customerId = input.customerId?.trim() ?? "";

  if (!customerId) {
    details.customerId = "customerId is required";
  }

  const packageSku = input.packageSku?.trim() ?? "";
  if (!packageSku) {
    details.packageSku = "packageSku is required";
  } else if (!getPackageCatalogEntry(packageSku)) {
    details.packageSku = "Unknown packageSku";
  }

  if (!input.soldPriceRub || !isValidDecimalRub(input.soldPriceRub)) {
    details.soldPriceRub = "soldPriceRub must be a decimal string like 180000.00";
  }

  if (!input.soldAt || !isValidDateOnly(input.soldAt)) {
    details.soldAt = "soldAt must be YYYY-MM-DD";
  }

  if (input.listPriceRub !== undefined && !isValidDecimalRub(input.listPriceRub)) {
    details.listPriceRub = "listPriceRub must be a decimal string like 180000.00";
  }

  const catalog = packageSku ? getPackageCatalogEntry(packageSku) : null;

  if (input.modules !== undefined && input.modules.length > 0 && catalog) {
    const clientModules = [...input.modules].sort().join(",");
    const catalogModules = [...catalog.modules].sort().join(",");
    if (clientModules !== catalogModules) {
      details.modules = "modules are derived from packageSku and cannot be overridden";
    }
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  const listPriceRub =
    input.listPriceRub ??
    catalog!.listPriceRub ??
    input.soldPriceRub!;

  return {
    ok: true,
    data: {
      customerId,
      instanceId: input.instanceId?.trim() || null,
      licenseId: input.licenseId?.trim() || null,
      packageSku,
      modules: catalog!.modules,
      listPriceRub,
      soldPriceRub: input.soldPriceRub!,
      soldAt: input.soldAt!,
      contractRef: input.contractRef?.trim() || null,
      notes: input.notes?.trim() || null,
      createInstance: input.createInstance === true
    }
  };
}

export function validateBoxSalePatch(
  input: BoxSaleInput
): ValidationResult<BoxSalePatchData> {
  const details: Record<string, string> = {};

  if (input.soldPriceRub !== undefined && !isValidDecimalRub(input.soldPriceRub)) {
    details.soldPriceRub = "soldPriceRub must be a decimal string like 180000.00";
  }

  if (input.soldAt !== undefined && !isValidDateOnly(input.soldAt)) {
    details.soldAt = "soldAt must be YYYY-MM-DD";
  }

  if (
    input.instanceId === undefined &&
    input.licenseId === undefined &&
    input.soldPriceRub === undefined &&
    input.soldAt === undefined &&
    input.contractRef === undefined &&
    input.notes === undefined
  ) {
    details._ = "At least one field is required";
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  const patch: BoxSalePatchData = {};
  if (input.instanceId !== undefined) {
    patch.instanceId = input.instanceId?.trim() || null;
  }
  if (input.licenseId !== undefined) {
    patch.licenseId = input.licenseId?.trim() || null;
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
  if (input.notes !== undefined) {
    patch.notes = input.notes?.trim() || null;
  }

  return { ok: true, data: patch };
}
