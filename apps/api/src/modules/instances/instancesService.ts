import { randomUUID } from "node:crypto";
import { buildPaginationMeta, getPaginationParams } from "../../utils/pagination.js";
import { findCustomerById } from "../customers/customersRepository.js";
import {
  buildEnvSnippet,
  buildPendingTokenHash,
  generatePlainIntegrationToken,
  hashIntegrationToken
} from "./integrationToken.js";
import {
  createInstance,
  findInstanceById,
  listInstances,
  rotateInstanceToken,
  toPublicInstance,
  updateInstance
} from "./instancesRepository.js";

const VALID_STATUSES = new Set([
  "planned",
  "deployed",
  "active",
  "grace",
  "expired",
  "decommissioned",
  "suspended"
]);

const RUNTIME_ID_LENGTH = 24;

export type InstanceInput = {
  customerId?: string;
  hostname?: string | null;
  deployUrl?: string | null;
  status?: string;
  notes?: string | null;
  generateIntegrationToken?: boolean;
  runtimeInstanceId?: string | null;
};

function validateRuntimeInstanceId(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length !== RUNTIME_ID_LENGTH) {
    return `runtimeInstanceId must be exactly ${RUNTIME_ID_LENGTH} characters`;
  }
  return null;
}

export async function getInstancesList(query: {
  q?: string;
  status?: string;
  customerId?: string;
  page?: string;
  limit?: string;
}) {
  const { page, limit, offset } = getPaginationParams(query);
  const { items, total } = await listInstances({
    q: query.q,
    status: query.status,
    customerId: query.customerId,
    offset,
    limit
  });

  return {
    items: items.map(toPublicInstance),
    meta: buildPaginationMeta(page, limit, total)
  };
}

export async function getInstanceDetail(id: string) {
  const instance = await findInstanceById(id);
  if (!instance) {
    return null;
  }

  return {
    instance: toPublicInstance(instance),
    licenses: [],
    codes: [],
    boxSales: [],
    upsellSales: []
  };
}

export async function createInstanceRecord(input: InstanceInput) {
  const details: Record<string, string> = {};

  if (!input.customerId?.trim()) {
    details.customerId = "customerId is required";
  }

  const status = input.status?.trim() ?? "planned";
  if (!VALID_STATUSES.has(status)) {
    details.status = "Invalid instance status";
  }

  if (Object.keys(details).length > 0) {
    return { error: details } as const;
  }

  const customer = await findCustomerById(input.customerId!.trim());
  if (!customer) {
    return { notFound: true, entity: "customer" } as const;
  }

  const instanceId = randomUUID();
  const plainToken = input.generateIntegrationToken
    ? generatePlainIntegrationToken()
    : null;
  const tokenHash = plainToken
    ? hashIntegrationToken(plainToken)
    : buildPendingTokenHash(instanceId);

  const instance = await createInstance({
    id: instanceId,
    customerId: input.customerId!.trim(),
    hostname: input.hostname?.trim() || null,
    deployUrl: input.deployUrl?.trim() || null,
    instanceStatus: status,
    notes: input.notes?.trim() || null,
    integrationTokenHash: tokenHash
  });

  const response: {
    instance: ReturnType<typeof toPublicInstance>;
    integrationToken?: string;
    envSnippet?: string;
  } = { instance: toPublicInstance(instance) };

  if (input.generateIntegrationToken && plainToken) {
    response.integrationToken = plainToken;
    response.envSnippet = buildEnvSnippet(plainToken);
  }

  return response;
}

export async function patchInstanceRecord(id: string, input: InstanceInput) {
  const details: Record<string, string> = {};

  if (input.status !== undefined && !VALID_STATUSES.has(input.status)) {
    details.status = "Invalid instance status";
  }

  if (input.runtimeInstanceId !== undefined) {
    const runtimeError = validateRuntimeInstanceId(input.runtimeInstanceId);
    if (runtimeError) {
      details.runtimeInstanceId = runtimeError;
    }
  }

  if (Object.keys(details).length > 0) {
    return { error: details } as const;
  }

  const instance = await updateInstance(id, {
    runtimeInstanceId:
      input.runtimeInstanceId !== undefined
        ? input.runtimeInstanceId?.trim() || null
        : undefined,
    hostname:
      input.hostname !== undefined ? input.hostname?.trim() || null : undefined,
    deployUrl:
      input.deployUrl !== undefined ? input.deployUrl?.trim() || null : undefined,
    instanceStatus: input.status,
    notes: input.notes !== undefined ? input.notes?.trim() || null : undefined
  });

  if (!instance) {
    return { notFound: true, entity: "instance" } as const;
  }

  return { instance: toPublicInstance(instance) } as const;
}

export async function rotateIntegrationToken(id: string) {
  const existing = await findInstanceById(id);
  if (!existing) {
    return { notFound: true } as const;
  }

  const plainToken = generatePlainIntegrationToken();
  const tokenHash = hashIntegrationToken(plainToken);
  const instance = await rotateInstanceToken(id, tokenHash);

  if (!instance) {
    return { notFound: true } as const;
  }

  return {
    instance: toPublicInstance(instance),
    integrationToken: plainToken,
    envSnippet: buildEnvSnippet(plainToken)
  };
}
