export type CanonPriceItem = {
  sku: string;
  itemType: "package" | "upsell" | "subscription_renewal";
  title: string;
  priceRub: string | null;
  priceNote: string | null;
  modules: string[];
  subscriptionRenewalRub: string | null;
  sortOrder: number;
};

const INCLUDED_IN_PRO = "включено в Промо.Про";

/** Канон прайса для import-canon. Цены — фактические (2026). */
export const CANON_PRICE_ITEMS: CanonPriceItem[] = [
  {
    sku: "PKG-POINT",
    itemType: "package",
    title: "Рег.Поинт — лицензия",
    priceRub: "50000.00",
    priceNote: null,
    modules: ["point"],
    subscriptionRenewalRub: null,
    sortOrder: 10
  },
  {
    sku: "PKG-PROMO",
    itemType: "package",
    title: "Рег.Промо — лицензия",
    priceRub: "50000.00",
    priceNote: null,
    modules: ["promo"],
    subscriptionRenewalRub: null,
    sortOrder: 20
  },
  {
    sku: "PKG-PRO",
    itemType: "package",
    title: "Промо.Про — лицензия",
    priceRub: "80000.00",
    priceNote: "Включает Рег.Поинт, Рег.Промо, интеграции CRM и API ФНС",
    modules: ["pro"],
    subscriptionRenewalRub: null,
    sortOrder: 30
  },
  {
    sku: "PKG-TICKET",
    itemType: "package",
    title: "Рег.Тикет — лицензия",
    priceRub: null,
    priceNote: "TBD",
    modules: ["ticket"],
    subscriptionRenewalRub: null,
    sortOrder: 40
  },
  {
    sku: "SVC-PILOT",
    itemType: "upsell",
    title: "Пилот — 1 месяц",
    priceRub: "0.00",
    priceNote: "Бесплатно; один раз на компанию (проверка по ИНН)",
    modules: ["point"],
    subscriptionRenewalRub: null,
    sortOrder: 50
  },
  {
    sku: "LIC-UP-PRO-POINT",
    itemType: "upsell",
    title: "Рег.Поинт → Промо.Про",
    priceRub: "30000.00",
    priceNote: null,
    modules: ["pro"],
    subscriptionRenewalRub: null,
    sortOrder: 100
  },
  {
    sku: "LIC-UP-PRO-PROMO",
    itemType: "upsell",
    title: "Рег.Промо → Промо.Про",
    priceRub: "30000.00",
    priceNote: null,
    modules: ["pro"],
    subscriptionRenewalRub: null,
    sortOrder: 110
  },
  {
    sku: "LIC-UP-PROMO",
    itemType: "upsell",
    title: "Рег.Поинт → Рег.Промо",
    priceRub: null,
    priceNote: "TBD",
    modules: ["promo"],
    subscriptionRenewalRub: null,
    sortOrder: 120
  },
  {
    sku: "LIC-INST-2",
    itemType: "upsell",
    title: "Второй инстанс",
    priceRub: null,
    priceNote: "50% от лицензии",
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 130
  },
  {
    sku: "LIC-REISSUE",
    itemType: "upsell",
    title: "Перевыпуск (смена VPS)",
    priceRub: "15000.00",
    priceNote: null,
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 140
  },
  {
    sku: "BOX-DEP-01",
    itemType: "upsell",
    title: "Установка Docker",
    priceRub: null,
    priceNote: "15000–25000",
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 200
  },
  {
    sku: "BOX-DEP-02",
    itemType: "upsell",
    title: "Внедрение (базовый функционал, развертывание, обучение)",
    priceRub: "12000.00",
    priceNote: null,
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 210
  },
  {
    sku: "BOX-SSL-01",
    itemType: "upsell",
    title: "HTTPS Let's Encrypt",
    priceRub: "12000.00",
    priceNote: null,
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 220
  },
  {
    sku: "BOX-BKP-01",
    itemType: "upsell",
    title: "Cron-бэкап MySQL",
    priceRub: "18000.00",
    priceNote: null,
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 230
  },
  {
    sku: "BOX-MIG-01",
    itemType: "upsell",
    title: "Миграция данных",
    priceRub: null,
    priceNote: "25000–45000",
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 240
  },
  {
    sku: "BOX-FNS-01",
    itemType: "upsell",
    title: "Пакет заявки ФНС (API)",
    priceRub: null,
    priceNote: INCLUDED_IN_PRO,
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 250
  },
  {
    sku: "DEV-FIELD",
    itemType: "upsell",
    title: "Кастомизация — кастомное поле",
    priceRub: "20000.00",
    priceNote: "от 20000, зависит от конкретного функционала",
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 300
  },
  {
    sku: "DEV-REPORT",
    itemType: "upsell",
    title: "Кастомизация — кастомный отчёт",
    priceRub: "20000.00",
    priceNote: "от 20000, зависит от конкретного функционала",
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 310
  },
  {
    sku: "DEV-WL",
    itemType: "upsell",
    title: "White-label",
    priceRub: "49000.00",
    priceNote: null,
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 320
  },
  {
    sku: "INT-CRM",
    itemType: "upsell",
    title: "Интеграция CRM",
    priceRub: null,
    priceNote: INCLUDED_IN_PRO,
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 330
  },
  {
    sku: "INT-1C",
    itemType: "upsell",
    title: "Интеграция 1С",
    priceRub: null,
    priceNote: "120000–200000",
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 340
  },
  {
    sku: "INT-EMAIL",
    itemType: "upsell",
    title: "Email/SMS",
    priceRub: null,
    priceNote: "60000–100000",
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 350
  },
  {
    sku: "DEV-ONSITE",
    itemType: "upsell",
    title: "On-site регистрация",
    priceRub: null,
    priceNote: "от 55000",
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 360
  },
  {
    sku: "SUP-TRAIN-2",
    itemType: "upsell",
    title: "Обучение 2ч",
    priceRub: "12000.00",
    priceNote: null,
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 400
  },
  {
    sku: "SUP-TRAIN-4",
    itemType: "upsell",
    title: "Обучение 4ч",
    priceRub: "22000.00",
    priceNote: null,
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 410
  },
  {
    sku: "SUP-SLA+",
    itemType: "upsell",
    title: "Расширенный SLA",
    priceRub: "59000.00",
    priceNote: "/год",
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 420
  },
  {
    sku: "SUP-HOT",
    itemType: "upsell",
    title: "Приоритетная линия",
    priceRub: "39000.00",
    priceNote: "/год",
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 430
  },
  {
    sku: "SUP-AUDIT",
    itemType: "upsell",
    title: "Аудит compliance",
    priceRub: "35000.00",
    priceNote: null,
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 440
  },
  {
    sku: "LEGAL-TPL",
    itemType: "upsell",
    title: "Шаблоны согласий",
    priceRub: "25000.00",
    priceNote: null,
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 500
  },
  {
    sku: "LEGAL-REVIEW",
    itemType: "upsell",
    title: "Ревью блока ПД",
    priceRub: "35000.00",
    priceNote: null,
    modules: [],
    subscriptionRenewalRub: null,
    sortOrder: 510
  }
];

export function getCanonItemCount(): number {
  return CANON_PRICE_ITEMS.length;
}
