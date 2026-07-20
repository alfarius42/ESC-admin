import {
  signPayload,
  type ActivationPayload,
  type CodeType as SigningCodeType,
  type PackageSlug as SigningPackageSlug,
  type ProductModule
} from "@esc-admin/license-signing";
import { createHash } from "node:crypto";
import { env } from "../../config/environment.js";
import { encryptTextAtRest } from "../../utils/cryptoAtRest.js";
import { checkPilotEligibility } from "../pilot/pilotEligibility.js";
import {
  appendAuditLog,
  countLicenseCodesByTypeAndStatus,
  findLicenseIssueContext,
  hasLinkedReissueUpsellForCustomer,
  insertActivationCodeAndMarkIssued
} from "./licensesRepository.js";

const CODE_TYPES = new Set(["initial", "addon", "renewal", "pilot", "reissue"]);
const MODULE_SET = new Set(["point", "promo", "pro", "ticket"]);

export type IssueCodeInput = {
  codeType?: string;
  modules?: string[];
  validUntil?: string | null;
  targetInstanceId?: string | null;
  pilotUntil?: string | null;
};

type SupportedCodeType = "initial" | "addon" | "renewal" | "pilot" | "reissue";
type SupportedModule = "point" | "promo" | "pro" | "ticket";
type SupportedPackage =
  | "regpoint_point"
  | "regpoint_promo"
  | "regpoint_pro"
  | "regpoint_ticket";

type IssueWarningCode =
  | "ACTIVE_PILOT_EXISTS"
  | "MISSING_REISSUE_UPSELL"
  | "CUSTOM_VALID_UNTIL_APPLIED";

type BusinessValidationResult =
  | { ok: true; warnings: IssueWarningCode[] }
  | { ok: false; error: Record<string, string> }
  | {
      ok: false;
      conflict: true;
      reason: string;
      details: Record<string, string>;
    };

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toIsoEndOfDay(dateOnly: string): string {
  return new Date(`${dateOnly}T23:59:59.000Z`).toISOString();
}

function addDays(dateOnly: string, days: number): string {
  const base = new Date(`${dateOnly}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function normalizeTargetInstanceId(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length === 0 ? null : normalized;
}

function normalizeModules(modules: string[] | undefined): SupportedModule[] | null {
  if (!modules || modules.length === 0) {
    return null;
  }

  const unique = Array.from(new Set(modules.map((item) => item.trim()).filter(Boolean)));
  if (unique.length === 0) {
    return null;
  }

  const invalid = unique.find((item) => !MODULE_SET.has(item));
  if (invalid) {
    return [];
  }

  return unique as SupportedModule[];
}

function mergeModules(
  current: SupportedModule[],
  incoming: SupportedModule[]
): SupportedModule[] {
  return Array.from(new Set([...current, ...incoming]));
}

function isSubset(subset: SupportedModule[], superset: SupportedModule[]): boolean {
  return subset.every((item) => superset.includes(item));
}

function maxValidUntil(current: string | null, incoming: string | null): string | null {
  if (!current) {
    return incoming;
  }
  if (!incoming) {
    return current;
  }
  return new Date(current) >= new Date(incoming) ? current : incoming;
}

function toHashPrefix(code: string): string {
  return createHash("sha256").update(code).digest("hex").slice(0, 16);
}

function buildEmailTemplate(data: {
  activationCode: string;
  validUntil: string | null;
  codeType: SupportedCodeType;
}): string {
  const validUntilText = data.validUntil ?? "без ограничений";
  return [
    "Здравствуйте!",
    "",
    "Код активации Регпоинт:",
    "",
    data.activationCode,
    "",
    `Тип кода: ${data.codeType}`,
    `Срок: ${validUntilText}`,
    "",
    "Support: support@vendor.local"
  ].join("\n");
}

function isSupportedPackage(value: string): value is SupportedPackage {
  return (
    value === "regpoint_point" ||
    value === "regpoint_promo" ||
    value === "regpoint_pro" ||
    value === "regpoint_ticket"
  );
}

export async function issueLicenseCode(
  licenseId: string,
  input: IssueCodeInput
) {
  const codeType = input.codeType?.trim();
  if (!codeType) {
    return { error: { codeType: "codeType is required" } } as const;
  }

  if (!CODE_TYPES.has(codeType)) {
    return {
      error: {
        codeType: "codeType must be one of: initial, addon, renewal, pilot, reissue"
      }
    } as const;
  }

  const parsedModules = normalizeModules(input.modules);
  if (parsedModules?.length === 0) {
    return {
      error: { modules: "modules can include only: point, promo, pro, ticket" }
    } as const;
  }

  const targetInstanceId = normalizeTargetInstanceId(input.targetInstanceId);
  if (targetInstanceId && targetInstanceId.length !== 24) {
    return {
      error: { targetInstanceId: "targetInstanceId must be 24 characters" }
    } as const;
  }

  const license = await findLicenseIssueContext(licenseId);
  if (!license) {
    return { notFound: true } as const;
  }

  if (!isSupportedPackage(license.packageSlug)) {
    return {
      error: { package: "Unsupported package slug on license" }
    } as const;
  }

  const licenseModules = normalizeModules(license.modules);
  if (!licenseModules || licenseModules.length === 0) {
    return {
      error: { modules: "License has invalid modules state" }
    } as const;
  }

  if (!env.licensePrivateKey?.trim()) {
    return {
      internalError: "LICENSE_PRIVATE_KEY is required to issue codes"
    } as const;
  }

  if (!env.codesEncryptionKey?.trim()) {
    return {
      internalError: "CODES_ENCRYPTION_KEY is required to issue codes"
    } as const;
  }

  const typedCodeType = codeType as SupportedCodeType;

  let pilotEligibility:
    | Awaited<ReturnType<typeof checkPilotEligibility>>
    | null = null;
  if (codeType === "pilot") {
    pilotEligibility = await checkPilotEligibility(license.customerId);
    if (!pilotEligibility) {
      return { notFound: true } as const;
    }

    if (!pilotEligibility.eligible) {
      return {
        conflict: true,
        reasons: pilotEligibility.reasons,
        details: pilotEligibility.details
      } as const;
    }
  }

  let finalModules: SupportedModule[] = licenseModules;
  let finalValidUntil: string | null = toIsoEndOfDay(license.validUntil);
  let finalPilotUntil: string | null = null;
  const warnings: IssueWarningCode[] = [];

  if (typedCodeType === "initial") {
    finalModules = parsedModules ?? licenseModules;
    if (input.validUntil?.trim()) {
      if (!isDateOnly(input.validUntil.trim())) {
        return { error: { validUntil: "validUntil must be YYYY-MM-DD" } } as const;
      }
      finalValidUntil = toIsoEndOfDay(input.validUntil.trim());
      warnings.push("CUSTOM_VALID_UNTIL_APPLIED");
    }
  }

  if (typedCodeType === "addon") {
    if (!parsedModules || parsedModules.length === 0) {
      return {
        error: { modules: "modules are required for addon code" }
      } as const;
    }
    finalModules = mergeModules(licenseModules, parsedModules);
    const licenseValidUntil = toIsoEndOfDay(license.validUntil);
    if (input.validUntil?.trim()) {
      if (!isDateOnly(input.validUntil.trim())) {
        return { error: { validUntil: "validUntil must be YYYY-MM-DD" } } as const;
      }
      finalValidUntil = maxValidUntil(
        licenseValidUntil,
        toIsoEndOfDay(input.validUntil.trim())
      );
      warnings.push("CUSTOM_VALID_UNTIL_APPLIED");
    } else {
      finalValidUntil = licenseValidUntil;
    }
  }

  if (typedCodeType === "renewal") {
    const nextValidUntilDate = addDays(license.validUntil, 365);
    finalModules = licenseModules;
    finalValidUntil = toIsoEndOfDay(nextValidUntilDate);
  }

  if (typedCodeType === "pilot") {
    finalModules = parsedModules && parsedModules.length > 0 ? parsedModules : ["point"];
    if (input.pilotUntil?.trim()) {
      if (!isDateOnly(input.pilotUntil.trim())) {
        return { error: { pilotUntil: "pilotUntil must be YYYY-MM-DD" } } as const;
      }
      finalPilotUntil = toIsoEndOfDay(input.pilotUntil.trim());
    } else {
      finalPilotUntil = toIsoEndOfDay(addDays(new Date().toISOString().slice(0, 10), 30));
    }
    finalValidUntil = null;
    if (pilotEligibility && pilotEligibility.reasons.includes("ACTIVE_PILOT_EXISTS")) {
      warnings.push("ACTIVE_PILOT_EXISTS");
    }
  }

  if (typedCodeType === "reissue") {
    finalModules = licenseModules;
    finalValidUntil = toIsoEndOfDay(license.validUntil);
  }

  const businessValidation = await validateBusinessRules({
    licenseId: license.licenseId,
    licenseStatus: license.licenseStatus,
    codeType: typedCodeType,
    currentModules: licenseModules,
    incomingModules: parsedModules,
    customerId: license.customerId
  });

  if (!businessValidation.ok) {
    if ("conflict" in businessValidation && businessValidation.conflict) {
      return {
        conflict: true,
        reasons: [businessValidation.reason],
        details: businessValidation.details
      } as const;
    }
    if ("error" in businessValidation) {
      return { error: businessValidation.error } as const;
    }
    return { error: { _: "Business validation failed" } } as const;
  }

  warnings.push(...businessValidation.warnings);

  const payload: ActivationPayload = {
    licenseId: license.licenseId,
    package: license.packageSlug as SigningPackageSlug,
    modules: finalModules as ProductModule[],
    issuedAt: new Date().toISOString(),
    validUntil: finalValidUntil,
    instanceId: targetInstanceId,
    codeType: typedCodeType as SigningCodeType,
    pilotUntil: finalPilotUntil
  };

  const activationCode = signPayload(payload, env.licensePrivateKey);
  const activationCodeEncrypted = encryptTextAtRest(activationCode, env.codesEncryptionKey);
  const codeHashPrefix = toHashPrefix(activationCode);

  return {
    license,
    payload,
    activationCode,
    activationCodeEncrypted,
    codeHashPrefix,
    warnings,
    emailTemplate: buildEmailTemplate({
      activationCode,
      validUntil: payload.validUntil,
      codeType: typedCodeType
    })
  } as const;
}

export async function issueLicenseCodeAndPersist(
  licenseId: string,
  input: IssueCodeInput,
  issuedBy: string
) {
  const issueData = await issueLicenseCode(licenseId, input);
  if (
    "error" in issueData ||
    "notFound" in issueData ||
    "conflict" in issueData ||
    "internalError" in issueData
  ) {
    if ("conflict" in issueData || "error" in issueData) {
      await appendAuditLog({
        userId: issuedBy,
        action: "CODE_ISSUE_BLOCKED",
        entityType: "license",
        entityId: licenseId,
        diffJson: issueData
      });
    }
    return issueData;
  }

  const inserted = await insertActivationCodeAndMarkIssued({
    licenseId: issueData.license.licenseId,
    codeType: issueData.payload.codeType,
    modules: issueData.payload.modules,
    validUntil: issueData.payload.validUntil,
    pilotUntil: issueData.payload.pilotUntil ?? null,
    targetInstanceId: issueData.payload.instanceId,
    activationCodeEncrypted: issueData.activationCodeEncrypted,
    codeHashPrefix: issueData.codeHashPrefix,
    payloadJson: issueData.payload,
    issuedBy,
    auditEntry: {
      userId: issuedBy,
      action: "CODE_ISSUED",
      entityType: "license",
      entityId: licenseId,
      diffJson: {
        codeType: issueData.payload.codeType,
        warnings: issueData.warnings
      }
    }
  });

  return {
    codeId: inserted.codeId,
    activationCode: issueData.activationCode,
    payload: issueData.payload,
    warnings: issueData.warnings,
    displayOnce: true,
    emailTemplate: issueData.emailTemplate
  } as const;
}

async function validateBusinessRules(params: {
  licenseId: string;
  licenseStatus: "draft" | "issued" | "active" | "grace" | "expired" | "revoked";
  codeType: SupportedCodeType;
  currentModules: SupportedModule[];
  incomingModules: SupportedModule[] | null;
  customerId: string;
}): Promise<BusinessValidationResult> {
  if (params.codeType === "initial") {
    if (!(params.licenseStatus === "draft" || params.licenseStatus === "issued")) {
      return {
        ok: false,
        conflict: true,
        reason: "INITIAL_STATUS_INVALID",
        details: {
          licenseStatus:
            "initial is allowed only for license statuses: draft, issued"
        }
      };
    }
    const activeInitialCodes = await countLicenseCodesByTypeAndStatus(
      params.licenseId,
      "initial",
      ["issued", "activated"]
    );
    if (activeInitialCodes > 0) {
      return {
        ok: false,
        conflict: true,
        reason: "INITIAL_ALREADY_EXISTS",
        details: {
          initialCodes: "An issued/activated initial code already exists"
        }
      };
    }
  }

  if (params.codeType === "addon") {
    if (
      !(
        params.licenseStatus === "active" ||
        params.licenseStatus === "grace" ||
        params.licenseStatus === "issued"
      )
    ) {
      return {
        ok: false,
        conflict: true,
        reason: "ADDON_STATUS_INVALID",
        details: {
          licenseStatus:
            "addon is allowed only for license statuses: active, grace, issued"
        }
      };
    }
    if (params.currentModules.length === 0) {
      return {
        ok: false,
        conflict: true,
        reason: "ADDON_WITHOUT_BASE_LICENSE",
        details: {
          modules: "License has no active modules for addon merge"
        }
      };
    }
    if (!params.incomingModules || params.incomingModules.length === 0) {
      return {
        ok: false,
        error: { modules: "modules are required for addon code" }
      };
    }
    if (isSubset(params.incomingModules, params.currentModules)) {
      return {
        ok: false,
        conflict: true,
        reason: "ADDON_SUBSET_REJECTED",
        details: {
          modules: "Incoming addon modules are already covered by current license"
        }
      };
    }
  }

  if (params.codeType === "renewal") {
    if (
      !(
        params.licenseStatus === "active" ||
        params.licenseStatus === "grace" ||
        params.licenseStatus === "expired"
      )
    ) {
      return {
        ok: false,
        conflict: true,
        reason: "RENEWAL_STATUS_INVALID",
        details: {
          licenseStatus:
            "renewal is allowed only for license statuses: active, grace, expired"
        }
      };
    }
  }

  if (params.codeType === "reissue") {
    const hasReissueUpsell = await hasLinkedReissueUpsellForCustomer(params.customerId);
    if (!hasReissueUpsell) {
      return { ok: true, warnings: ["MISSING_REISSUE_UPSELL"] };
    }
  }

  return { ok: true, warnings: [] };
}
