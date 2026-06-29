import { buildPaginationMeta, getPaginationParams } from "../../utils/pagination.js";
import { findCustomerById } from "../customers/customersRepository.js";
import { findInstanceById } from "../instances/instancesRepository.js";
import {
  createBoxSale,
  createBoxSaleWithNewInstance,
  findBoxSaleById,
  getBoxSalesStats,
  listBoxSales,
  updateBoxSale
} from "./boxSalesRepository.js";
import {
  validateBoxSaleCreate,
  validateBoxSaleListQuery,
  validateBoxSalePatch,
  validateBoxSaleStatsQuery,
  type BoxSaleInput,
  type BoxSaleListQuery,
  type BoxSaleStatsQuery
} from "./boxSalesValidation.js";

export async function getBoxSalesList(query: BoxSaleListQuery) {
  const validation = validateBoxSaleListQuery(query);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const { page, limit, offset } = getPaginationParams(query);
  const { items, total } = await listBoxSales({
    q: query.q,
    customerId: query.customerId,
    instanceId: query.instanceId,
    packageSku: query.packageSku,
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

export async function getBoxSaleDetail(id: string) {
  return findBoxSaleById(id);
}

export async function getBoxSaleStats(query: BoxSaleStatsQuery) {
  const validation = validateBoxSaleStatsQuery(query);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  return getBoxSalesStats({ from: query.from, to: query.to });
}

export async function createBoxSaleRecord(
  input: BoxSaleInput,
  salesUserId: string
) {
  const validation = validateBoxSaleCreate(input);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const customer = await findCustomerById(validation.data.customerId);
  if (!customer) {
    return { notFound: true, entity: "customer" } as const;
  }

  let instanceId = validation.data.instanceId;

  if (instanceId) {
    const instance = await findInstanceById(instanceId);
    if (!instance) {
      return { notFound: true, entity: "instance" } as const;
    }
    if (instance.customerId !== validation.data.customerId) {
      return {
        error: { instanceId: "instance does not belong to customer" }
      } as const;
    }
  }

  if (validation.data.createInstance && !instanceId) {
    const sale = await createBoxSaleWithNewInstance({
      customerId: validation.data.customerId,
      licenseId: validation.data.licenseId,
      packageSku: validation.data.packageSku,
      modules: validation.data.modules,
      listPriceRub: validation.data.listPriceRub,
      soldPriceRub: validation.data.soldPriceRub,
      soldAt: validation.data.soldAt,
      contractRef: validation.data.contractRef,
      salesUserId,
      notes: validation.data.notes
    });

    return { sale } as const;
  }

  const sale = await createBoxSale({
    customerId: validation.data.customerId,
    instanceId,
    licenseId: validation.data.licenseId,
    packageSku: validation.data.packageSku,
    modules: validation.data.modules,
    listPriceRub: validation.data.listPriceRub,
    soldPriceRub: validation.data.soldPriceRub,
    soldAt: validation.data.soldAt,
    contractRef: validation.data.contractRef,
    salesUserId,
    notes: validation.data.notes
  });

  return { sale } as const;
}

export async function patchBoxSaleRecord(id: string, input: BoxSaleInput) {
  const validation = validateBoxSalePatch(input);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const existing = await findBoxSaleById(id);
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

  const sale = await updateBoxSale(id, validation.data);
  if (!sale) {
    return { notFound: true } as const;
  }

  return { sale } as const;
}
