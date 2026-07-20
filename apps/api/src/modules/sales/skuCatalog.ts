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
  priceNote?: string | null;
};

export const PACKAGE_CATALOG: Record<string, PackageCatalogEntry> = {
  "PKG-POINT": {
    packageSlug: "regpoint_point",
    modules: ["point"],
    listPriceRub: "50000.00",
    title: "Рег.Поинт — лицензия"
  },
  "PKG-PROMO": {
    packageSlug: "regpoint_promo",
    modules: ["promo"],
    listPriceRub: "50000.00",
    title: "Рег.Промо — лицензия"
  },
  "PKG-PRO": {
    packageSlug: "regpoint_pro",
    modules: ["pro"],
    listPriceRub: "80000.00",
    title: "Промо.Про — лицензия"
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
    title: "Рег.Поинт → Промо.Про",
    listPriceRub: "30000.00"
  },
  "LIC-UP-PRO-PROMO": {
    skuCategory: "license_upgrade",
    title: "Рег.Промо → Промо.Про",
    listPriceRub: "30000.00"
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
    title: "Внедрение (базовый функционал, развертывание, обучение)",
    listPriceRub: "12000.00"
  },
  "BOX-SSL-01": {
    skuCategory: "deploy",
    title: "HTTPS Let's Encrypt",
    listPriceRub: "12000.00"
  },
  "BOX-FNS-01": {
    skuCategory: "deploy",
    title: "Пакет заявки ФНС (API)",
    listPriceRub: null,
    priceNote: "включено в Промо.Про"
  },
  "DEV-FIELD": {
    skuCategory: "dev",
    title: "Кастомизация — кастомное поле",
    listPriceRub: "20000.00",
    priceNote: "от 20000, зависит от конкретного функционала"
  },
  "DEV-REPORT": {
    skuCategory: "dev",
    title: "Кастомизация — кастомный отчёт",
    listPriceRub: "20000.00",
    priceNote: "от 20000, зависит от конкретного функционала"
  },
  "INT-CRM": {
    skuCategory: "dev",
    title: "Интеграция CRM",
    listPriceRub: null,
    priceNote: "включено в Промо.Про"
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
