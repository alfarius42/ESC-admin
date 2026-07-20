import { buildPaginationMeta, getPaginationParams } from "../../utils/pagination.js";
import {
  listActivationCodes,
  type LicenseCodeStatus
} from "./licensesRepository.js";

const CODE_TYPES = new Set(["initial", "addon", "renewal", "pilot", "reissue"]);

export type ActivationCodesListQuery = {
  licenseId?: string;
  codeType?: string;
  status?: string;
  page?: string;
  limit?: string;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function listActivationCodesAdmin(query: ActivationCodesListQuery) {
  const errors: Record<string, string> = {};

  const licenseId = query.licenseId?.trim();
  if (licenseId && !isUuid(licenseId)) {
    errors.licenseId = "licenseId must be a UUID";
  }

  const codeType = query.codeType?.trim();
  if (codeType && !CODE_TYPES.has(codeType)) {
    errors.codeType = "codeType must be one of: initial, addon, renewal, pilot, reissue";
  }

  const status = query.status?.trim();
  const allowedStatuses: LicenseCodeStatus[] = ["issued", "activated", "expired", "revoked"];
  if (status && !allowedStatuses.includes(status as LicenseCodeStatus)) {
    errors.status = "status must be one of: issued, activated, expired, revoked";
  }

  if (Object.keys(errors).length > 0) {
    return { error: errors } as const;
  }

  const { page, limit, offset } = getPaginationParams(query);
  const { items, total } = await listActivationCodes({
    licenseId: licenseId || undefined,
    codeType: codeType as "initial" | "addon" | "renewal" | "pilot" | "reissue" | undefined,
    status: status as LicenseCodeStatus | undefined,
    offset,
    limit
  });

  return {
    items,
    meta: buildPaginationMeta(page, limit, total)
  } as const;
}
