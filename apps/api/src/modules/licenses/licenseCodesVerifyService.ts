import {
  parseActivationEnvelope,
  validateModules,
  verifyActivationCode,
  type ActivationPayload
} from "@esc-admin/license-signing";
import { createHash } from "node:crypto";
import { env } from "../../config/environment.js";
import {
  findActivationCodeByLicenseAndHashPrefix,
  type LicenseCodeStatus
} from "./licensesRepository.js";

export type VerifyWarningCode =
  | "VALID_UNTIL_PAST"
  | "VALID_UNTIL_WITHIN_30_DAYS"
  | "INSTANCE_ID_MISMATCH"
  | "NOT_REGISTERED_IN_DB"
  | "ALREADY_ACTIVATED"
  | "REVOKED"
  | "ADDON_WITHOUT_BASE_LICENSE"
  | "INVALID_MODULES";

export type VerifyActivationCodeResult = {
  valid: boolean;
  registered: boolean;
  revoked: boolean;
  codeType: ActivationPayload["codeType"] | null;
  licenseId: string | null;
  codeId: string | null;
  validUntil: string | null;
  pilotUntil: string | null;
  modules: string[];
  payload: ActivationPayload | null;
  warnings: VerifyWarningCode[];
  signatureReason?: string;
};

function activationCodeHashPrefix(code: string): string {
  return createHash("sha256").update(code).digest("hex").slice(0, 16);
}

function hasInvalidModules(modules: string[]): boolean {
  if (modules.length === 0) {
    return false;
  }
  return validateModules(modules).length !== modules.length;
}

function collectWarnings(params: {
  payload: ActivationPayload;
  registered: boolean;
  codeStatus: LicenseCodeStatus | null;
  licenseInstanceId: string | null;
  licenseModules: string[];
}): VerifyWarningCode[] {
  const warnings: VerifyWarningCode[] = [];

  if (hasInvalidModules(params.payload.modules)) {
    warnings.push("INVALID_MODULES");
  }

  if (params.payload.validUntil) {
    const validUntilDate = new Date(params.payload.validUntil);
    const now = new Date();
    if (validUntilDate < now) {
      warnings.push("VALID_UNTIL_PAST");
    } else {
      const within30Days = new Date(now);
      within30Days.setUTCDate(within30Days.getUTCDate() + 30);
      if (validUntilDate <= within30Days) {
        warnings.push("VALID_UNTIL_WITHIN_30_DAYS");
      }
    }
  }

  if (!params.registered) {
    warnings.push("NOT_REGISTERED_IN_DB");
  } else if (params.codeStatus === "activated") {
    warnings.push("ALREADY_ACTIVATED");
  } else if (params.codeStatus === "revoked") {
    warnings.push("REVOKED");
  }

  if (
    params.registered &&
    params.payload.instanceId &&
    params.licenseInstanceId &&
    params.payload.instanceId !== params.licenseInstanceId
  ) {
    warnings.push("INSTANCE_ID_MISMATCH");
  }

  if (
    params.payload.codeType === "addon" &&
    params.registered &&
    params.licenseModules.length === 0
  ) {
    warnings.push("ADDON_WITHOUT_BASE_LICENSE");
  }

  return warnings;
}

export async function verifyActivationCodeAdmin(input: {
  activationCode?: string;
}): Promise<
  | { error: Record<string, string> }
  | { internalError: string }
  | VerifyActivationCodeResult
> {
  const activationCode = input.activationCode?.trim();
  if (!activationCode) {
    return { error: { activationCode: "activationCode is required" } };
  }

  if (!env.licensePublicKey?.trim()) {
    return {
      internalError: "LICENSE_PUBLIC_KEY is required to verify codes"
    };
  }

  let payload: ActivationPayload;
  try {
    payload = parseActivationEnvelope(activationCode).payload;
  } catch {
    return { error: { activationCode: "Unsupported activation envelope format" } };
  }

  const verification = verifyActivationCode(activationCode, env.licensePublicKey);
  const hashPrefix = activationCodeHashPrefix(activationCode);
  const dbRecord = await findActivationCodeByLicenseAndHashPrefix(
    payload.licenseId,
    hashPrefix
  );

  const registered = dbRecord !== null;
  const modules = validateModules(payload.modules);
  const resolvedModules = modules.length > 0 ? modules : payload.modules;
  const revoked = dbRecord?.codeStatus === "revoked";

  const warnings = collectWarnings({
    payload,
    registered,
    codeStatus: dbRecord?.codeStatus ?? null,
    licenseInstanceId: dbRecord?.licenseInstanceId ?? null,
    licenseModules: dbRecord?.licenseModules ?? []
  });

  return {
    valid: verification.valid,
    registered,
    revoked,
    codeType: payload.codeType ?? null,
    licenseId: payload.licenseId ?? null,
    codeId: dbRecord?.id ?? null,
    validUntil: payload.validUntil,
    pilotUntil: payload.pilotUntil ?? null,
    modules: resolvedModules,
    payload,
    warnings,
    signatureReason: verification.reason
  };
}
