import { buildPaginationMeta, getPaginationParams } from "../../utils/pagination.js";
import { findCustomerById } from "../customers/customersRepository.js";
import { findBoxSaleById } from "../boxSales/boxSalesRepository.js";
import { findInstanceById } from "../instances/instancesRepository.js";
import {
  createUpsellSale,
  findUpsellSaleById,
  getUpsellSalesStats,
  listUpsellSales,
  updateUpsellSale
} from "./upsellSalesRepository.js";
import {
  validateUpsellSaleCreate,
  validateUpsellSaleListQuery,
  validateUpsellSalePatch,
  validateUpsellSaleStatsQuery,
  type UpsellSaleInput,
  type UpsellSaleListQuery,
  type UpsellSaleStatsQuery
} from "./upsellSalesValidation.js";

async function validateLinkedBoxSale(
  linkedBoxSaleId: string,
  customerId: string,
  instanceId: string | null
): Promise<
  { ok: true } | { notFound: true } | { error: Record<string, string> }
> {
  const linkedBoxSale = await findBoxSaleById(linkedBoxSaleId);
  if (!linkedBoxSale) {
    return { notFound: true };
  }

  if (linkedBoxSale.customerId !== customerId) {
    return {
      error: { linkedBoxSaleId: "box sale does not belong to customer" }
    };
  }

  if (
    instanceId &&
    linkedBoxSale.instanceId &&
    linkedBoxSale.instanceId !== instanceId
  ) {
    return {
      error: { linkedBoxSaleId: "box sale is linked to a different instance" }
    };
  }

  return { ok: true };
}

export async function getUpsellSalesList(query: UpsellSaleListQuery) {
  const validation = validateUpsellSaleListQuery(query);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const { page, limit, offset } = getPaginationParams(query);
  const { items, total } = await listUpsellSales({
    q: query.q,
    customerId: query.customerId,
    instanceId: query.instanceId,
    sku: query.sku,
    skuCategory: query.skuCategory,
    from: query.from,
    to: query.to,
    offset,
    limit
  });

  return {
    items,
    meta: buildPaginationMeta(page, limit, total)
  };
}

export async function getUpsellSaleDetail(id: string) {
  return findUpsellSaleById(id);
}

export async function getUpsellSaleStats(query: UpsellSaleStatsQuery) {
  const validation = validateUpsellSaleStatsQuery(query);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  return getUpsellSalesStats({ from: query.from, to: query.to });
}

export async function createUpsellSaleRecord(
  input: UpsellSaleInput,
  salesUserId: string
) {
  const validation = validateUpsellSaleCreate(input);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const customer = await findCustomerById(validation.data.customerId);
  if (!customer) {
    return { notFound: true, entity: "customer" } as const;
  }

  if (validation.data.instanceId) {
    const instance = await findInstanceById(validation.data.instanceId);
    if (!instance) {
      return { notFound: true, entity: "instance" } as const;
    }
    if (instance.customerId !== validation.data.customerId) {
      return {
        error: { instanceId: "instance does not belong to customer" }
      } as const;
    }
  }

  if (validation.data.linkedBoxSaleId) {
    const linkedCheck = await validateLinkedBoxSale(
      validation.data.linkedBoxSaleId,
      validation.data.customerId,
      validation.data.instanceId
    );
    if ("notFound" in linkedCheck) {
      return { notFound: true, entity: "box sale" } as const;
    }
    if ("error" in linkedCheck) {
      return { error: linkedCheck.error } as const;
    }
  }

  const sale = await createUpsellSale({
    customerId: validation.data.customerId,
    instanceId: validation.data.instanceId,
    sku: validation.data.sku,
    skuCategory: validation.data.skuCategory,
    title: validation.data.title,
    listPriceRub: validation.data.listPriceRub,
    soldPriceRub: validation.data.soldPriceRub,
    soldAt: validation.data.soldAt,
    contractRef: validation.data.contractRef,
    salesUserId,
    linkedBoxSaleId: validation.data.linkedBoxSaleId,
    notes: validation.data.notes
  });

  return { sale } as const;
}

export async function patchUpsellSaleRecord(id: string, input: UpsellSaleInput) {
  const validation = validateUpsellSalePatch(input);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const existing = await findUpsellSaleById(id);
  if (!existing) {
    return { notFound: true } as const;
  }

  if (validation.data.instanceId) {
    const instance = await findInstanceById(validation.data.instanceId);
    if (!instance) {
      return { notFound: true, entity: "instance" } as const;
    }
    if (instance.customerId !== existing.customerId) {
      return {
        error: { instanceId: "instance does not belong to customer" }
      } as const;
    }
  }

  if (validation.data.linkedBoxSaleId) {
    const linkedCheck = await validateLinkedBoxSale(
      validation.data.linkedBoxSaleId,
      existing.customerId,
      validation.data.instanceId !== undefined
        ? validation.data.instanceId
        : existing.instanceId
    );
    if ("notFound" in linkedCheck) {
      return { notFound: true, entity: "box sale" } as const;
    }
    if ("error" in linkedCheck) {
      return { error: linkedCheck.error } as const;
    }
  }

  const sale = await updateUpsellSale(id, validation.data);
  if (!sale) {
    return { notFound: true } as const;
  }

  return { sale } as const;
}
