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

const testUpsellSale = {
  id: "upsell-001",
  customerId: testCustomer.id,
  instanceId: null,
  sku: "BOX-DEP-02",
  skuCategory: "deploy",
  title: "Turnkey деплой",
  listPriceRub: "45000.00",
  soldPriceRub: "45000.00",
  soldAt: "2026-06-20",
  contractRef: null,
  salesUserId: testUser.id,
  linkedBoxSaleId: null,
  notes: "",
  createdAt: "2026-06-29T00:00:00.000Z",
  updatedAt: "2026-06-29T00:00:00.000Z",
  customer: {
    legalName: testCustomer.legalName,
    inn: testCustomer.inn
  }
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
  contractRef: null,
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
  findBoxSaleById: vi.fn(async (id: string) => {
    if (id === testBoxSale.id) {
      return testBoxSale;
    }
    if (id === "box-other-customer") {
      return { ...testBoxSale, id, customerId: "cust-other" };
    }
    return null;
  })
}));

vi.mock("../src/modules/upsellSales/upsellSalesRepository.js", () => ({
  listUpsellSales: vi.fn(async () => ({ items: [testUpsellSale], total: 1 })),
  findUpsellSaleById: vi.fn(async (id: string) =>
    id === testUpsellSale.id ? testUpsellSale : null
  ),
  createUpsellSale: vi.fn(async () => ({
    ...testUpsellSale,
    id: "upsell-new"
  })),
  updateUpsellSale: vi.fn(async (id: string, patch: Partial<typeof testUpsellSale>) =>
    id === testUpsellSale.id ? { ...testUpsellSale, ...patch } : null
  ),
  getUpsellSalesStats: vi.fn(async () => ({
    totalCount: 1,
    revenueRub: "45000.00",
    byCategory: [{ skuCategory: "deploy", count: 1, revenueRub: "45000.00" }],
    bySku: [{ sku: "BOX-DEP-02", count: 1, revenueRub: "45000.00" }]
  }))
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

describe("upsell sales routes", () => {
  it("returns 401 without auth token", async () => {
    const response = await request(app).get("/api/v1/upsell-sales");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns paginated list for authorized request", async () => {
    const response = await request(app)
      .get("/api/v1/upsell-sales")
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].sku).toBe("BOX-DEP-02");
  });

  it("creates upsell sale with valid payload", async () => {
    const response = await request(app)
      .post("/api/v1/upsell-sales")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        customerId: testCustomer.id,
        sku: "BOX-DEP-02",
        soldPriceRub: "45000.00",
        soldAt: "2026-06-20"
      });

    expect(response.status).toBe(201);
    expect(response.body.data.sale.sku).toBe("BOX-DEP-02");
  });

  it("returns 400 for missing required fields", async () => {
    const response = await request(app)
      .post("/api/v1/upsell-sales")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        customerId: testCustomer.id,
        sku: "BOX-DEP-02"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects linked box sale from another customer", async () => {
    const response = await request(app)
      .post("/api/v1/upsell-sales")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        customerId: testCustomer.id,
        sku: "BOX-DEP-02",
        soldPriceRub: "45000.00",
        soldAt: "2026-06-20",
        linkedBoxSaleId: "box-other-customer"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details.linkedBoxSaleId).toContain("customer");
  });

  it("returns stats aggregate", async () => {
    const response = await request(app)
      .get("/api/v1/upsell-sales/stats")
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.totalCount).toBe(1);
    expect(response.body.data.revenueRub).toBe("45000.00");
  });
});
