export type LicenseStatus =
  | "draft"
  | "issued"
  | "active"
  | "grace"
  | "expired"
  | "revoked";

export type LicenseInput = {
  instanceId?: string;
  package?: string;
  modules?: string[];
  validFrom?: string;
  validUntil?: string;
  subscriptionYear?: number;
  boxSaleId?: string | null;
  status?: string;
};

export type LicenseListQuery = {
  customerId?: string;
  instanceId?: string;
  status?: string;
  page?: string;
  limit?: string;
};

const MODULES = new Set(["point", "promo", "pro", "ticket"]);
const STATUSES = new Set(["draft", "issued", "active", "grace", "expired", "revoked"]);
const PACKAGES = new Set(["regpoint_point", "regpoint_promo", "regpoint_pro", "regpoint_ticket"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validateUuid(value: string | undefined, field: string): string | null {
  if (!value?.trim()) {
    return `${field} is required`;
  }
  if (!UUID_PATTERN.test(value.trim())) {
    return `${field} must be a UUID`;
  }
  return null;
}

function normalizeModules(modules: string[] | undefined): string[] | null {
  if (!modules || modules.length === 0) {
    return null;
  }
  const normalized = Array.from(new Set(modules.map((item) => item.trim()).filter(Boolean)));
  return normalized.length > 0 ? normalized : null;
}

export function validateLicensesListQuery(query: LicenseListQuery):
  | { ok: true }
  | { ok: false; details: Record<string, string> } {
  const details: Record<string, string> = {};

  if (query.customerId?.trim() && !UUID_PATTERN.test(query.customerId.trim())) {
    details.customerId = "customerId must be a UUID";
  }
  if (query.instanceId?.trim() && !UUID_PATTERN.test(query.instanceId.trim())) {
    details.instanceId = "instanceId must be a UUID";
  }
  if (query.status?.trim() && !STATUSES.has(query.status.trim())) {
    details.status = "status must be one of: draft, issued, active, grace, expired, revoked";
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }
  return { ok: true };
}

export function validateLicenseCreate(input: LicenseInput):
  | { ok: true; data: Required<Pick<LicenseInput, "package" | "modules" | "validFrom" | "validUntil">> & LicenseInput }
  | { ok: false; details: Record<string, string> } {
  const details: Record<string, string> = {};

  const packageSlug = input.package?.trim() ?? "";
  if (!packageSlug) {
    details.package = "package is required";
  } else if (!PACKAGES.has(packageSlug)) {
    details.package = "package must be one of: regpoint_point, regpoint_promo, regpoint_pro, regpoint_ticket";
  }

  const normalizedModules = normalizeModules(input.modules);
  if (!normalizedModules) {
    details.modules = "modules are required";
  } else {
    const invalidModule = normalizedModules.find((module) => !MODULES.has(module));
    if (invalidModule) {
      details.modules = "modules can include only: point, promo, pro, ticket";
    }
  }

  if (!input.validFrom?.trim() || !DATE_ONLY_PATTERN.test(input.validFrom.trim())) {
    details.validFrom = "validFrom must be YYYY-MM-DD";
  }
  if (!input.validUntil?.trim() || !DATE_ONLY_PATTERN.test(input.validUntil.trim())) {
    details.validUntil = "validUntil must be YYYY-MM-DD";
  }
  if (
    input.validFrom?.trim() &&
    input.validUntil?.trim() &&
    DATE_ONLY_PATTERN.test(input.validFrom.trim()) &&
    DATE_ONLY_PATTERN.test(input.validUntil.trim()) &&
    input.validUntil.trim() < input.validFrom.trim()
  ) {
    details.validUntil = "validUntil must be greater than or equal to validFrom";
  }

  if (input.instanceId?.trim()) {
    const err = validateUuid(input.instanceId, "instanceId");
    if (err) {
      details.instanceId = err;
    }
  }
  if (input.boxSaleId?.trim()) {
    const err = validateUuid(input.boxSaleId, "boxSaleId");
    if (err) {
      details.boxSaleId = err;
    }
  }
  if (!input.instanceId?.trim() && !input.boxSaleId?.trim()) {
    details.instanceId = "instanceId or boxSaleId is required";
  }

  if (input.subscriptionYear !== undefined) {
    if (!Number.isInteger(input.subscriptionYear) || input.subscriptionYear <= 0) {
      details.subscriptionYear = "subscriptionYear must be a positive integer";
    }
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    data: {
      ...input,
      package: packageSlug,
      modules: normalizedModules!,
      validFrom: input.validFrom!.trim(),
      validUntil: input.validUntil!.trim()
    }
  };
}

export function validateLicensePatch(input: LicenseInput):
  | { ok: true; data: { status?: LicenseStatus; validUntil?: string; modules?: string[] } }
  | { ok: false; details: Record<string, string> } {
  const details: Record<string, string> = {};

  const hasAnyField =
    input.status !== undefined || input.validUntil !== undefined || input.modules !== undefined;
  if (!hasAnyField) {
    details._ = "At least one field is required: status, validUntil, modules";
  }

  if (input.status !== undefined) {
    const normalized = input.status.trim();
    if (!STATUSES.has(normalized)) {
      details.status = "status must be one of: draft, issued, active, grace, expired, revoked";
    }
  }

  if (input.validUntil !== undefined) {
    const normalized = input.validUntil?.trim() ?? "";
    if (!DATE_ONLY_PATTERN.test(normalized)) {
      details.validUntil = "validUntil must be YYYY-MM-DD";
    }
  }

  if (input.modules !== undefined) {
    const normalizedModules = normalizeModules(input.modules);
    if (!normalizedModules) {
      details.modules = "modules must not be empty";
    } else {
      const invalidModule = normalizedModules.find((module) => !MODULES.has(module));
      if (invalidModule) {
        details.modules = "modules can include only: point, promo, pro, ticket";
      }
    }
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    data: {
      status: input.status?.trim() as LicenseStatus | undefined,
      validUntil: input.validUntil?.trim(),
      modules: input.modules ? normalizeModules(input.modules) ?? undefined : undefined
    }
  };
}
