import { buildPaginationMeta, getPaginationParams } from "../../utils/pagination.js";
import {
  createLicense,
  findBoxSaleLinkCandidate,
  findInstanceByIdForLicense,
  findLicenseById,
  listActivationCodesByLicenseId,
  listLicenseAuditHistory,
  listLicenses,
  updateLicense
} from "./licensesRepository.js";
import {
  validateLicenseCreate,
  validateLicensePatch,
  validateLicensesListQuery,
  type LicenseInput,
  type LicenseListQuery
} from "./licensesValidation.js";

export async function getLicensesList(query: LicenseListQuery) {
  const validation = validateLicensesListQuery(query);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const { page, limit, offset } = getPaginationParams(query);
  const { items, total } = await listLicenses({
    customerId: query.customerId?.trim() || undefined,
    instanceId: query.instanceId?.trim() || undefined,
    status: query.status?.trim() as
      | "draft"
      | "issued"
      | "active"
      | "grace"
      | "expired"
      | "revoked"
      | undefined,
    offset,
    limit
  });

  return {
    items,
    meta: buildPaginationMeta(page, limit, total)
  };
}

export async function getLicenseDetail(id: string) {
  const license = await findLicenseById(id);
  if (!license) {
    return null;
  }

  const [codes, history] = await Promise.all([
    listActivationCodesByLicenseId(id),
    listLicenseAuditHistory(id)
  ]);

  return {
    license,
    codes,
    history
  };
}

export async function createLicenseRecord(input: LicenseInput) {
  const validation = validateLicenseCreate(input);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  let resolvedInstanceId = validation.data.instanceId?.trim() || null;
  const boxSaleId = validation.data.boxSaleId?.trim() || null;

  if (boxSaleId) {
    const boxSale = await findBoxSaleLinkCandidate(boxSaleId);
    if (!boxSale) {
      return { notFound: true, entity: "boxSale" } as const;
    }
    if (boxSale.licenseId) {
      return {
        conflict: true,
        reason: "BOX_SALE_ALREADY_LINKED",
        details: { boxSaleId: "boxSale already linked to another license" }
      } as const;
    }
    if (!resolvedInstanceId) {
      if (!boxSale.instanceId) {
        return {
          error: { boxSaleId: "boxSale is not linked to an instance yet" }
        } as const;
      }
      resolvedInstanceId = boxSale.instanceId;
    }
  }

  if (!resolvedInstanceId) {
    return { error: { instanceId: "instanceId is required" } } as const;
  }

  const instance = await findInstanceByIdForLicense(resolvedInstanceId);
  if (!instance) {
    return { notFound: true, entity: "instance" } as const;
  }

  if (boxSaleId) {
    const boxSale = await findBoxSaleLinkCandidate(boxSaleId);
    if (!boxSale) {
      return { notFound: true, entity: "boxSale" } as const;
    }
    if (boxSale.customerId !== instance.customerId) {
      return {
        error: {
          boxSaleId: "boxSale customer does not match instance customer"
        }
      } as const;
    }
  }

  const license = await createLicense({
    instanceId: resolvedInstanceId,
    packageSlug: validation.data.package,
    modules: validation.data.modules,
    validFrom: validation.data.validFrom,
    validUntil: validation.data.validUntil,
    subscriptionYear: validation.data.subscriptionYear ?? 1,
    boxSaleId
  });

  return { license } as const;
}

export async function patchLicenseRecord(id: string, input: LicenseInput) {
  const validation = validateLicensePatch(input);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const updated = await updateLicense(id, {
    licenseStatus: validation.data.status,
    validUntil: validation.data.validUntil,
    modules: validation.data.modules
  });

  if (!updated) {
    return { notFound: true } as const;
  }

  return { license: updated } as const;
}
