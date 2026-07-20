import { describe, expect, it } from "vitest";
import { CANON_PRICE_ITEMS } from "../src/modules/priceLists/canonCatalog.js";

describe("canon price catalog", () => {
  it("contains at least 28 items", () => {
    expect(CANON_PRICE_ITEMS.length).toBeGreaterThanOrEqual(28);
  });

  it("has updated package prices", () => {
    const bySku = Object.fromEntries(CANON_PRICE_ITEMS.map((item) => [item.sku, item]));

    expect(bySku["PKG-POINT"]?.priceRub).toBe("50000.00");
    expect(bySku["PKG-PROMO"]?.priceRub).toBe("50000.00");
    expect(bySku["PKG-PRO"]?.priceRub).toBe("80000.00");
    expect(bySku["PKG-PRO"]?.priceNote).toContain("CRM");
  });

  it("marks CRM and FNS as included in Pro", () => {
    const bySku = Object.fromEntries(CANON_PRICE_ITEMS.map((item) => [item.sku, item]));

    expect(bySku["INT-CRM"]?.priceNote).toContain("Промо.Про");
    expect(bySku["BOX-FNS-01"]?.priceNote).toContain("Промо.Про");
  });

  it("sets implementation and customization upsell prices", () => {
    const bySku = Object.fromEntries(CANON_PRICE_ITEMS.map((item) => [item.sku, item]));

    expect(bySku["BOX-DEP-02"]?.priceRub).toBe("12000.00");
    expect(bySku["DEV-FIELD"]?.priceRub).toBe("20000.00");
    expect(bySku["DEV-FIELD"]?.priceNote).toContain("от 20000");
  });

  it("defines free pilot item", () => {
    const pilot = CANON_PRICE_ITEMS.find((item) => item.sku === "SVC-PILOT");
    expect(pilot?.priceRub).toBe("0.00");
    expect(pilot?.priceNote).toContain("ИНН");
  });
});
