import {
  boolean,
  char,
  date,
  decimal,
  datetime,
  json,
  mysqlEnum,
  mysqlTable,
  varchar
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: char("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  userRole: mysqlEnum("user_role", ["admin", "sales", "support", "readonly"])
    .notNull()
    .default("readonly"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull()
});

export const instances = mysqlTable("instances", {
  id: char("id", { length: 36 }).primaryKey(),
  customerId: char("customer_id", { length: 36 }).notNull(),
  runtimeInstanceId: varchar("runtime_instance_id", { length: 24 }),
  hostname: varchar("hostname", { length: 255 }),
  deployUrl: varchar("deploy_url", { length: 500 }),
  integrationTokenHash: varchar("integration_token_hash", { length: 64 }).notNull(),
  integrationTokenIssuedAt: datetime("integration_token_issued_at").notNull(),
  integrationTokenRotatedAt: datetime("integration_token_rotated_at"),
  lastTokenVerifiedAt: datetime("last_token_verified_at"),
  instanceStatus: mysqlEnum("instance_status", [
    "planned",
    "deployed",
    "active",
    "grace",
    "expired",
    "decommissioned",
    "suspended"
  ])
    .notNull()
    .default("planned"),
  notes: varchar("notes", { length: 65535 }),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull()
});

export const customers = mysqlTable("customers", {
  id: char("id", { length: 36 }).primaryKey(),
  legalName: varchar("legal_name", { length: 500 }).notNull(),
  inn: varchar("inn", { length: 12 }),
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  notes: varchar("notes", { length: 65535 }),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull()
});

export const licenses = mysqlTable("licenses", {
  id: char("id", { length: 36 }).primaryKey(),
  instanceId: char("instance_id", { length: 36 }).notNull(),
  modules: varchar("modules", { length: 65535 }).notNull(),
  validUntil: date("valid_until").notNull(),
  licenseStatus: mysqlEnum("license_status", [
    "draft",
    "issued",
    "active",
    "grace",
    "expired",
    "revoked"
  ])
    .notNull()
    .default("draft")
});

export const boxSales = mysqlTable("box_sales", {
  id: char("id", { length: 36 }).primaryKey(),
  customerId: char("customer_id", { length: 36 }).notNull(),
  instanceId: char("instance_id", { length: 36 }),
  licenseId: char("license_id", { length: 36 }),
  packageSku: varchar("package_sku", { length: 50 }).notNull(),
  modules: json("modules").notNull(),
  listPriceRub: decimal("list_price_rub", { precision: 12, scale: 2 }).notNull(),
  soldPriceRub: decimal("sold_price_rub", { precision: 12, scale: 2 }).notNull(),
  soldAt: date("sold_at").notNull(),
  contractRef: varchar("contract_ref", { length: 100 }),
  salesUserId: char("sales_user_id", { length: 36 }).notNull(),
  notes: varchar("notes", { length: 65535 }),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull()
});

export const upsellSales = mysqlTable("upsell_sales", {
  id: char("id", { length: 36 }).primaryKey(),
  customerId: char("customer_id", { length: 36 }).notNull(),
  instanceId: char("instance_id", { length: 36 }),
  sku: varchar("sku", { length: 50 }).notNull(),
  skuCategory: mysqlEnum("sku_category", [
    "license_upgrade",
    "deploy",
    "dev",
    "support",
    "legal",
    "other"
  ]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  listPriceRub: decimal("list_price_rub", { precision: 12, scale: 2 }).notNull(),
  soldPriceRub: decimal("sold_price_rub", { precision: 12, scale: 2 }).notNull(),
  soldAt: date("sold_at").notNull(),
  contractRef: varchar("contract_ref", { length: 100 }),
  salesUserId: char("sales_user_id", { length: 36 }).notNull(),
  linkedBoxSaleId: char("linked_box_sale_id", { length: 36 }),
  notes: varchar("notes", { length: 65535 }),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull()
});
