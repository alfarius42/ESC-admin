import { buildPaginationMeta, getPaginationParams } from "../../utils/pagination.js";
import {
  createCustomer,
  findCustomerById,
  listCustomers,
  listInstancesForCustomer,
  updateCustomer
} from "./customersRepository.js";
import {
  validateCustomerCreate,
  validateCustomerPatch,
  type CustomerInput
} from "./customersValidation.js";

export async function getCustomersList(query: {
  q?: string;
  page?: string;
  limit?: string;
}) {
  const { page, limit, offset } = getPaginationParams(query);
  const { items, total } = await listCustomers({ q: query.q, offset, limit });

  return {
    items,
    meta: buildPaginationMeta(page, limit, total)
  };
}

export async function getCustomerDetail(id: string) {
  const customer = await findCustomerById(id);
  if (!customer) {
    return null;
  }

  const instances = await listInstancesForCustomer(id);

  return {
    customer,
    instances,
    boxSalesCount: 0,
    upsellSalesCount: 0,
    totalRevenueRub: "0.00"
  };
}

export async function createCustomerRecord(input: CustomerInput) {
  const validation = validateCustomerCreate(input);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const customer = await createCustomer({
    legalName: validation.data.legalName,
    inn: validation.data.inn ?? null,
    contactName: validation.data.contactName ?? null,
    contactEmail: validation.data.contactEmail ?? null,
    contactPhone: validation.data.contactPhone ?? null,
    notes: validation.data.notes ?? null
  });
  return { customer } as const;
}

export async function patchCustomerRecord(id: string, input: CustomerInput) {
  const validation = validateCustomerPatch(input);
  if (!validation.ok) {
    return { error: validation.details } as const;
  }

  const patch: Partial<{
    legalName: string;
    inn: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    notes: string | null;
  }> = {};

  if (input.legalName !== undefined) {
    patch.legalName = input.legalName.trim();
  }
  if (input.inn !== undefined) {
    patch.inn = input.inn?.trim() || null;
  }
  if (input.contactName !== undefined) {
    patch.contactName = input.contactName?.trim() || null;
  }
  if (input.contactEmail !== undefined) {
    patch.contactEmail = input.contactEmail?.trim() || null;
  }
  if (input.contactPhone !== undefined) {
    patch.contactPhone = input.contactPhone?.trim() || null;
  }
  if (input.notes !== undefined) {
    patch.notes = input.notes?.trim() || null;
  }

  const customer = await updateCustomer(id, patch);
  if (!customer) {
    return { notFound: true } as const;
  }

  return { customer } as const;
}
