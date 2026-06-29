import { hashSync } from "bcryptjs";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

const testUser = {
  id: "seed-admin",
  email: "admin@vendor.local",
  displayName: "Admin",
  role: "admin" as const,
  passwordHash: hashSync("admin12345", 12),
  isActive: true
};

const testInstance = {
  id: "inst-001",
  customerId: "cust-001",
  runtimeInstanceId: null as string | null,
  hostname: "promo.client.ru" as string | null,
  deployUrl: "https://promo.client.ru" as string | null,
  integrationTokenHash: "abc123",
  instanceStatus: "planned",
  notes: "" as string | null,
  createdAt: "2026-06-29T00:00:00.000Z",
  updatedAt: "2026-06-29T00:00:00.000Z"
};

let storedInstance = { ...testInstance };
let lastPlainToken = "display-once-token-value123456";

vi.mock("../src/modules/auth/authRepository.js", () => ({
  findUserByEmail: vi.fn(async (email: string) =>
    email === testUser.email ? testUser : null
  )
}));

vi.mock("../src/modules/customers/customersRepository.js", () => ({
  findCustomerById: vi.fn(async (id: string) =>
    id === "cust-001"
      ? {
          id: "cust-001",
          legalName: "ООО Пример",
          inn: "7701234567",
          contactName: null,
          contactEmail: null,
          contactPhone: null,
          notes: null,
          createdAt: testInstance.createdAt,
          updatedAt: testInstance.updatedAt
        }
      : null
  )
}));

vi.mock("../src/modules/instances/instancesRepository.js", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("../src/modules/instances/instancesRepository.js")
  >();
  return {
    ...original,
    findInstanceById: vi.fn(async (id: string) =>
      id === storedInstance.id ? { ...storedInstance } : null
    ),
    createInstance: vi.fn(async (data: {
      id?: string;
      customerId: string;
      hostname: string | null;
      deployUrl: string | null;
      instanceStatus: string;
      notes: string | null;
      integrationTokenHash: string;
    }) => {
      storedInstance = {
        ...testInstance,
        ...data,
        id: data.id ?? "inst-new",
        integrationTokenHash: data.integrationTokenHash
      };
      return { ...storedInstance };
    }),
    updateInstance: vi.fn(async (id: string, data: Partial<typeof storedInstance>) => {
      if (id !== storedInstance.id) {
        return null;
      }
      storedInstance = { ...storedInstance, ...data };
      return { ...storedInstance };
    }),
    rotateInstanceToken: vi.fn(async (id: string, newTokenHash: string) => {
      if (id !== storedInstance.id) {
        return null;
      }
      storedInstance = {
        ...storedInstance,
        integrationTokenHash: newTokenHash
      };
      return { ...storedInstance };
    }),
    listInstances: vi.fn(async () => ({
      items: [{ ...storedInstance }],
      total: 1
    }))
  };
});

vi.mock("../src/modules/instances/integrationToken.js", () => ({
  generatePlainIntegrationToken: vi.fn(() => lastPlainToken),
  hashIntegrationToken: vi.fn((plain: string) =>
    plain === lastPlainToken ? "hash-new-token" : "hash-old-token"
  ),
  buildPendingTokenHash: vi.fn((instanceId: string) => `pending-hash-${instanceId}`),
  buildEnvSnippet: vi.fn(
    (plain: string) =>
      `VENDOR_ADMIN_URL=http://localhost:4000\nVENDOR_ADMIN_INSTANCE_TOKEN=${plain}`
  )
}));

let app: ReturnType<(typeof import("../src/app.js"))["createApp"]>;
let authToken: string;

beforeAll(async () => {
  const { createApp } = await import("../src/app.js");
  app = createApp();

  const loginResponse = await request(app).post("/api/v1/auth/login").send({
    email: "admin@vendor.local",
    password: "admin12345"
  });
  authToken = loginResponse.body.data.token as string;
});

describe("instances routes (repository mocked)", () => {
  it("returns 401 without auth token", async () => {
    const response = await request(app).get("/api/v1/instances");
    expect(response.status).toBe(401);
  });

  it("creates instance with display-once integration token", async () => {
    const response = await request(app)
      .post("/api/v1/instances")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        customerId: "cust-001",
        hostname: "new.client.ru",
        generateIntegrationToken: true
      });

    expect(response.status).toBe(201);
    expect(response.body.data.integrationToken).toBe(lastPlainToken);
    expect(response.body.data.envSnippet).toContain(lastPlainToken);
  });

  it("creates instance without integration token when generateIntegrationToken is omitted", async () => {
    const response = await request(app)
      .post("/api/v1/instances")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        customerId: "cust-001",
        hostname: "pending.client.ru"
      });

    expect(response.status).toBe(201);
    expect(response.body.data.integrationToken).toBeUndefined();
    expect(response.body.data.envSnippet).toBeUndefined();
    expect(response.body.data.instance).toBeDefined();
  });

  it("does not return plain token on GET detail", async () => {
    storedInstance = { ...testInstance, id: "inst-001" };
    const response = await request(app)
      .get("/api/v1/instances/inst-001")
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.instance.integrationToken).toBeUndefined();
    expect(response.body.data.licenses).toEqual([]);
  });

  it("persists runtimeInstanceId via PATCH", async () => {
    storedInstance = { ...testInstance, id: "inst-001" };
    const boxId = "a1b2c3d4e5f6g7h8i9j0k1l2";

    const response = await request(app)
      .patch("/api/v1/instances/inst-001")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ runtimeInstanceId: boxId });

    expect(response.status).toBe(200);
    expect(response.body.data.instance.runtimeInstanceId).toBe(boxId);
  });

  it("returns new token on rotate", async () => {
    storedInstance = { ...testInstance, id: "inst-001" };
    lastPlainToken = "rotated-token-value1234567890";

    const response = await request(app)
      .post("/api/v1/integrations/instances/inst-001/rotate-token")
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.integrationToken).toBe(lastPlainToken);
  });
});
