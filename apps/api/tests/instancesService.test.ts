import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateInstance = vi.fn();
const mockFindCustomerById = vi.fn();

vi.mock("../src/modules/instances/instancesRepository.js", () => ({
  createInstance: (...args: unknown[]) => mockCreateInstance(...args),
  findInstanceById: vi.fn(),
  listInstances: vi.fn(),
  rotateInstanceToken: vi.fn(),
  toPublicInstance: (record: {
    id: string;
    customerId: string;
    runtimeInstanceId: string | null;
    hostname: string | null;
    deployUrl: string | null;
    instanceStatus: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  }) => ({
    id: record.id,
    customerId: record.customerId,
    runtimeInstanceId: record.runtimeInstanceId,
    hostname: record.hostname,
    deployUrl: record.deployUrl,
    instanceStatus: record.instanceStatus,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  }),
  updateInstance: vi.fn()
}));

vi.mock("../src/modules/customers/customersRepository.js", () => ({
  findCustomerById: (...args: unknown[]) => mockFindCustomerById(...args)
}));

const mockGeneratePlain = vi.fn(() => "plain-token-value");
const mockHash = vi.fn((plain: string) => `hash:${plain}`);
const mockPendingHash = vi.fn((id: string) => `pending:${id}`);

vi.mock("../src/modules/instances/integrationToken.js", () => ({
  generatePlainIntegrationToken: () => mockGeneratePlain(),
  hashIntegrationToken: (plain: string) => mockHash(plain),
  buildPendingTokenHash: (id: string) => mockPendingHash(id),
  buildEnvSnippet: (plain: string) => `TOKEN=${plain}`
}));

const baseInstance = {
  id: "inst-svc-001",
  customerId: "cust-001",
  runtimeInstanceId: null,
  hostname: "svc.client.ru",
  deployUrl: null,
  integrationTokenHash: "stored-hash",
  instanceStatus: "planned",
  notes: null,
  createdAt: "2026-06-29T00:00:00.000Z",
  updatedAt: "2026-06-29T00:00:00.000Z"
};

describe("instancesService createInstanceRecord (repository mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindCustomerById.mockResolvedValue({
      id: "cust-001",
      legalName: "ООО Пример"
    });
    mockCreateInstance.mockImplementation(
      async (data: { id?: string; integrationTokenHash: string }) => ({
        ...baseInstance,
        id: data.id ?? baseInstance.id,
        integrationTokenHash: data.integrationTokenHash
      })
    );
  });

  it("returns plain token when generateIntegrationToken is true", async () => {
    const { createInstanceRecord } = await import(
      "../src/modules/instances/instancesService.js"
    );

    const result = await createInstanceRecord({
      customerId: "cust-001",
      generateIntegrationToken: true
    });

    expect(result).toHaveProperty("integrationToken", "plain-token-value");
    expect(result).toHaveProperty("envSnippet", "TOKEN=plain-token-value");
    expect(mockHash).toHaveBeenCalledWith("plain-token-value");
    expect(mockPendingHash).not.toHaveBeenCalled();
  });

  it("uses pending hash and omits plain token when generateIntegrationToken is false", async () => {
    const { createInstanceRecord } = await import(
      "../src/modules/instances/instancesService.js"
    );

    const result = await createInstanceRecord({
      customerId: "cust-001",
      generateIntegrationToken: false
    });

    expect(result).not.toHaveProperty("integrationToken");
    expect(result).not.toHaveProperty("envSnippet");
    expect(mockGeneratePlain).not.toHaveBeenCalled();
    expect(mockPendingHash).toHaveBeenCalledTimes(1);
    expect(mockCreateInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationTokenHash: expect.stringMatching(/^pending:/)
      })
    );
  });
});
