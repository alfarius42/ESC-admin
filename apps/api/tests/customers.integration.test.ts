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

const testCustomer = {
  id: "cust-001",
  legalName: "ООО Пример",
  inn: "7701234567",
  contactName: "Иван",
  contactEmail: "ivan@example.com",
  contactPhone: "+79001234567",
  notes: "",
  createdAt: "2026-06-29T00:00:00.000Z",
  updatedAt: "2026-06-29T00:00:00.000Z"
};

vi.mock("../src/modules/auth/authRepository.js", () => ({
  findUserByEmail: vi.fn(async (email: string) =>
    email === testUser.email ? testUser : null
  )
}));

vi.mock("../src/modules/customers/customersRepository.js", () => ({
  listCustomers: vi.fn(async () => ({ items: [testCustomer], total: 1 })),
  findCustomerById: vi.fn(async (id: string) =>
    id === testCustomer.id ? testCustomer : null
  ),
  createCustomer: vi.fn(async (data: typeof testCustomer) => ({
    ...testCustomer,
    ...data,
    id: "cust-new",
    createdAt: testCustomer.createdAt,
    updatedAt: testCustomer.updatedAt
  })),
  updateCustomer: vi.fn(async (id: string, data: Partial<typeof testCustomer>) =>
    id === testCustomer.id ? { ...testCustomer, ...data } : null
  ),
  listInstancesForCustomer: vi.fn(async () => [])
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

describe("customers routes", () => {
  it("returns 401 without auth token", async () => {
    const response = await request(app).get("/api/v1/customers");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns paginated list for authorized request", async () => {
    const response = await request(app)
      .get("/api/v1/customers")
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.meta.total).toBe(1);
  });

  it("creates customer with valid payload", async () => {
    const response = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        legalName: "ООО Новый",
        inn: "7701234567",
        contactEmail: "new@example.com"
      });

    expect(response.status).toBe(201);
    expect(response.body.data.customer.legalName).toBeDefined();
  });

  it("returns 400 for invalid inn", async () => {
    const response = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        legalName: "ООО Новый",
        inn: "123"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns customer detail with summary shape", async () => {
    const response = await request(app)
      .get(`/api/v1/customers/${testCustomer.id}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.customer.id).toBe(testCustomer.id);
    expect(response.body.data.instances).toEqual([]);
    expect(response.body.data.boxSalesCount).toBe(0);
    expect(response.body.data.totalRevenueRub).toBe("0.00");
  });
});
