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
  contactName: null,
  contactEmail: null,
  contactPhone: null,
  notes: null,
  createdAt: "2026-06-29T00:00:00.000Z",
  updatedAt: "2026-06-29T00:00:00.000Z"
};

const testBoxSale = {
  id: "box-001",
  customerId: testCustomer.id,
  instanceId: null,
  licenseId: null,
  packageSku: "PKG-PRO",
  modules: ["pro"],
  listPriceRub: "180000.00",
  soldPriceRub: "175000.00",
  soldAt: "2026-06-15",
  contractRef: "СЧ-2026-042",
  salesUserId: testUser.id,
  notes: "",
  createdAt: "2026-06-29T00:00:00.000Z",
  updatedAt: "2026-06-29T00:00:00.000Z",
  customer: {
    legalName: testCustomer.legalName,
    inn: testCustomer.inn
  }
};

vi.mock("../src/modules/auth/authRepository.js", () => ({
  findUserByEmail: vi.fn(async (email: string) =>
    email === testUser.email ? testUser : null
  )
}));

vi.mock("../src/modules/customers/customersRepository.js", () => ({
  findCustomerById: vi.fn(async (id: string) =>
    id === testCustomer.id ? testCustomer : null
  )
}));

vi.mock("../src/modules/boxSales/boxSalesRepository.js", () => ({
  listBoxSales: vi.fn(async () => ({ items: [testBoxSale], total: 1 })),
  findBoxSaleById: vi.fn(async (id: string) =>
    id === testBoxSale.id ? testBoxSale : null
  ),
  createBoxSale: vi.fn(async () => ({
    ...testBoxSale,
    id: "box-new"
  })),
  updateBoxSale: vi.fn(async (id: string, patch: Partial<typeof testBoxSale>) =>
    id === testBoxSale.id ? { ...testBoxSale, ...patch } : null
  ),
  getBoxSalesStats: vi.fn(async () => ({
    totalCount: 1,
    revenueRub: "175000.00",
    avgSoldPriceRub: "175000.00",
    byPackage: [
      { packageSku: "PKG-PRO", count: 1, revenueRub: "175000.00" }
    ]
  })),
  boxSaleExists: vi.fn(async () => true)
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
}, 30000);

describe("box sales routes", () => {
  it("returns 401 without auth token", async () => {
    const response = await request(app).get("/api/v1/box-sales");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns paginated list for authorized request", async () => {
    const response = await request(app)
      .get("/api/v1/box-sales")
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].customer.legalName).toBe("ООО Пример");
  });

  it("creates box sale with valid payload", async () => {
    const response = await request(app)
      .post("/api/v1/box-sales")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        customerId: testCustomer.id,
        packageSku: "PKG-PRO",
        soldPriceRub: "175000.00",
        soldAt: "2026-06-15"
      });

    expect(response.status).toBe(201);
    expect(response.body.data.sale.packageSku).toBe("PKG-PRO");
  });

  it("returns 400 for invalid decimal", async () => {
    const response = await request(app)
      .post("/api/v1/box-sales")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        customerId: testCustomer.id,
        packageSku: "PKG-PRO",
        soldPriceRub: "175000",
        soldAt: "2026-06-15"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects client modules override", async () => {
    const response = await request(app)
      .post("/api/v1/box-sales")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        customerId: testCustomer.id,
        packageSku: "PKG-PRO",
        modules: ["point"],
        soldPriceRub: "175000.00",
        soldAt: "2026-06-15"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details.modules).toContain("derived");
  });

  it("returns stats aggregate", async () => {
    const response = await request(app)
      .get("/api/v1/box-sales/stats")
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.totalCount).toBe(1);
    expect(response.body.data.revenueRub).toBe("175000.00");
  });

  it("returns box sale detail", async () => {
    const response = await request(app)
      .get(`/api/v1/box-sales/${testBoxSale.id}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.sale.id).toBe(testBoxSale.id);
  });
});
