export type PackageCatalogEntry = {
  packageSlug: string;
  modules: string[];
  listPriceRub: string | null;
  title: string;
};

export type UpsellCatalogEntry = {
  skuCategory:
    | "license_upgrade"
    | "deploy"
    | "dev"
    | "support"
    | "legal"
    | "other";
  title: string;
  listPriceRub: string | null;
};

export const PACKAGE_CATALOG: Record<string, PackageCatalogEntry> = {
  "PKG-POINT": {
    packageSlug: "regpoint_point",
    modules: ["point"],
    listPriceRub: "100000.00",
    title: "Рег.Поинт — лицензия"
  },
  "PKG-PROMO": {
    packageSlug: "regpoint_promo",
    modules: ["promo"],
    listPriceRub: null,
    title: "Рег.Промо — лицензия"
  },
  "PKG-PRO": {
    packageSlug: "regpoint_pro",
    modules: ["pro"],
    listPriceRub: "180000.00",
    title: "Рег.Про — лицензия"
  },
  "PKG-TICKET": {
    packageSlug: "regpoint_ticket",
    modules: ["ticket"],
    listPriceRub: null,
    title: "Рег.Тикет — лицензия"
  }
};

export const UPSELL_CATALOG: Record<string, UpsellCatalogEntry> = {
  "LIC-UP-PRO-POINT": {
    skuCategory: "license_upgrade",
    title: "Рег.Поинт → Рег.Про",
    listPriceRub: "80000.00"
  },
  "LIC-UP-PRO-PROMO": {
    skuCategory: "license_upgrade",
    title: "Рег.Промо → Рег.Про",
    listPriceRub: null
  },
  "LIC-UP-PROMO": {
    skuCategory: "license_upgrade",
    title: "Рег.Поинт → Рег.Промо",
    listPriceRub: null
  },
  "LIC-INST-2": {
    skuCategory: "license_upgrade",
    title: "Второй инстанс",
    listPriceRub: null
  },
  "LIC-REISSUE": {
    skuCategory: "license_upgrade",
    title: "Перевыпуск (смена VPS)",
    listPriceRub: "15000.00"
  },
  "BOX-DEP-02": {
    skuCategory: "deploy",
    title: "Turnkey деплой",
    listPriceRub: "45000.00"
  },
  "BOX-SSL-01": {
    skuCategory: "deploy",
    title: "HTTPS Let's Encrypt",
    listPriceRub: "12000.00"
  },
  "SUP-TRAIN-2": {
    skuCategory: "support",
    title: "Обучение 2ч",
    listPriceRub: "12000.00"
  },
  "DEV-WL": {
    skuCategory: "dev",
    title: "White-label",
    listPriceRub: "49000.00"
  },
  "LEGAL-TPL": {
    skuCategory: "legal",
    title: "Шаблоны согласий",
    listPriceRub: "25000.00"
  }
};

export function getPackageCatalogEntry(sku: string): PackageCatalogEntry | null {
  return PACKAGE_CATALOG[sku] ?? null;
}

export function getUpsellCatalogEntry(sku: string): UpsellCatalogEntry | null {
  return UPSELL_CATALOG[sku] ?? null;
}
