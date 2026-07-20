import { hashSync } from "bcryptjs";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { getCanonItemCount } from "../src/modules/priceLists/canonCatalog.js";

const testUser = {
  id: "seed-admin",
  email: "admin@vendor.local",
  displayName: "Admin",
  role: "admin" as const,
  passwordHash: hashSync("admin12345", 12),
  isActive: true
};

const testPriceList = {
  id: "pl-001",
  title: "Прайс 2026",
  effectiveFrom: "2026-01-01",
  effectiveUntil: null,
  isPublished: false,
  currency: "RUB",
  createdAt: "2026-06-29T00:00:00.000Z",
  updatedAt: "2026-06-29T00:00:00.000Z",
  items: [
    {
      id: "pli-001",
      priceListId: "pl-001",
      sku: "PKG-POINT",
      itemType: "package" as const,
      title: "Рег.Поинт — лицензия",
      priceRub: "50000.00",
      priceNote: null,
      modules: ["point"],
      subscriptionRenewalRub: null,
      sortOrder: 10
    }
  ]
};

const publishedPriceList = {
  ...testPriceList,
  id: "pl-pub",
  isPublished: true
};

vi.mock("../src/modules/auth/authRepository.js", () => ({
  findUserByEmail: vi.fn(async (email: string) =>
    email === testUser.email ? testUser : null
  )
}));

vi.mock("../src/modules/priceLists/priceListsRepository.js", () => ({
  listPriceLists: vi.fn(async () => ({
    items: [testPriceList],
    total: 1
  })),
  findPriceListById: vi.fn(async (id: string) => {
    if (id === testPriceList.id) {
      return testPriceList;
    }
    if (id === publishedPriceList.id) {
      return publishedPriceList;
    }
    return null;
  }),
  findPublishedPriceList: vi.fn(async () => publishedPriceList),
  createPriceList: vi.fn(async () => testPriceList),
  updatePriceList: vi.fn(async () => testPriceList),
  publishPriceList: vi.fn(async () => ({ ...testPriceList, isPublished: true })),
  addPriceListItem: vi.fn(async () => testPriceList.items[0]),
  updatePriceListItem: vi.fn(async () => testPriceList.items[0]),
  deletePriceListItem: vi.fn(async () => true),
  importCanonToPriceList: vi.fn(async () => ({
    priceListId: "pl-canon",
    itemsCreated: getCanonItemCount()
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

describe("price lists routes", () => {
  it("returns 401 without auth token", async () => {
    const response = await request(app).get("/api/v1/price-lists");
    expect(response.status).toBe(401);
  });

  it("lists price lists", async () => {
    const response = await request(app)
      .get("/api/v1/price-lists")
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].title).toBe("Прайс 2026");
  });

  it("imports canon price list", async () => {
    const response = await request(app)
      .post("/api/v1/price-lists/import-canon")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Прайс 2026" });

    expect(response.status).toBe(201);
    expect(response.body.data.itemsCreated).toBeGreaterThanOrEqual(28);
    expect(response.body.data.priceListId).toBe("pl-canon");
  });

  it("returns published current price list", async () => {
    const response = await request(app)
      .get("/api/v1/price-lists/current")
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.priceList.isPublished).toBe(true);
  });

  it("publishes price list", async () => {
    const response = await request(app)
      .post(`/api/v1/price-lists/${testPriceList.id}/publish`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.priceList.isPublished).toBe(true);
  });

  it("creates price list item", async () => {
    const response = await request(app)
      .post(`/api/v1/price-lists/${testPriceList.id}/items`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        sku: "PKG-PROMO",
        itemType: "package",
        title: "Рег.Промо — лицензия",
        priceRub: "50000.00",
        modules: ["promo"],
        sortOrder: 20
      });

    expect(response.status).toBe(201);
    expect(response.body.data.item.sku).toBe("PKG-POINT");
  });

  it("rejects invalid effectiveFrom on create", async () => {
    const response = await request(app)
      .post("/api/v1/price-lists")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Bad",
        effectiveFrom: "not-a-date"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
