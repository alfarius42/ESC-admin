# DRIZZLE_MIGRATION_SALES — миграция sales-репозиториев на Drizzle

Статус: active  
Обновлено: 2026-06-29  
Связанные файлы:
- `apps/api/src/db/schema.ts`
- `apps/api/src/modules/boxSales/boxSalesRepository.ts`
- `apps/api/src/modules/upsellSales/upsellSalesRepository.ts`
- `apps/api/db/migrations/001_initial.sql`

## Цель и scope

Перевести доступ к данным в репозиториях продаж с raw SQL (`mysql2`) на Drizzle Query Builder без изменения внешних контрактов и бизнес-поведения.

В scope входят:
- репозиторий `boxSales` (таблица `box_sales`);
- репозиторий `upsellSales` (таблица `upsell_sales`);
- транзакционный сценарий `createBoxSaleWithNewInstance`.

Вне scope:
- изменение публичных API модулей;
- изменение SQL-миграции `001_initial.sql`;
- рефакторинг несвязанных модулей.

## Покрытие схемы и маппинг MySQL -> Drizzle symbols

Источник SQL-семантики: `apps/api/db/migrations/001_initial.sql`.

### `box_sales`

| MySQL колонка | Drizzle symbol (`schema.ts`) | Использование в репозитории |
|---|---|---|
| `id` | `boxSales.id` | find/list/create/update/exists |
| `customer_id` | `boxSales.customerId` | фильтры, joins, create |
| `instance_id` | `boxSales.instanceId` | фильтры, create/update |
| `license_id` | `boxSales.licenseId` | create/update |
| `package_sku` | `boxSales.packageSku` | фильтры, stats by package |
| `modules` | `boxSales.modules` | create/read (JSON массив) |
| `list_price_rub` | `boxSales.listPriceRub` | create/read |
| `sold_price_rub` | `boxSales.soldPriceRub` | create/update, aggregate SUM |
| `sold_at` | `boxSales.soldAt` | фильтр периода, сортировка |
| `contract_ref` | `boxSales.contractRef` | create/update, поиск `q` |
| `sales_user_id` | `boxSales.salesUserId` | create/read |
| `notes` | `boxSales.notes` | create/update |
| `created_at` | `boxSales.createdAt` | сортировка, mapping |
| `updated_at` | `boxSales.updatedAt` | mapping, update timestamp |

### `upsell_sales`

| MySQL колонка | Drizzle symbol (`schema.ts`) | Использование в репозитории |
|---|---|---|
| `id` | `upsellSales.id` | find/list/create/update |
| `customer_id` | `upsellSales.customerId` | фильтры, joins, create |
| `instance_id` | `upsellSales.instanceId` | фильтры, create/update |
| `sku` | `upsellSales.sku` | фильтры, stats by sku |
| `sku_category` | `upsellSales.skuCategory` | фильтры, stats by category |
| `title` | `upsellSales.title` | поиск `q`, create/read |
| `list_price_rub` | `upsellSales.listPriceRub` | create/read |
| `sold_price_rub` | `upsellSales.soldPriceRub` | create/update, aggregate SUM |
| `sold_at` | `upsellSales.soldAt` | фильтр периода, сортировка |
| `contract_ref` | `upsellSales.contractRef` | create/update |
| `sales_user_id` | `upsellSales.salesUserId` | create/read |
| `linked_box_sale_id` | `upsellSales.linkedBoxSaleId` | create/update |
| `notes` | `upsellSales.notes` | create/update |
| `created_at` | `upsellSales.createdAt` | сортировка, mapping |
| `updated_at` | `upsellSales.updatedAt` | mapping, update timestamp |

## Чеклист миграции

### До изменений

- [ ] Схема Drizzle содержит таблицы `box_sales` и `upsell_sales` в `schema.ts`.
- [ ] Репозитории используют `getDbPool()` и raw SQL-строки.
- [ ] Подтверждены функции/контракты, которые должны сохраниться без изменения сигнатур.

### После изменений

- [ ] `boxSalesRepository.ts` использует только `getDrizzleDb()` и Drizzle builder.
- [ ] `upsellSalesRepository.ts` использует только `getDrizzleDb()` и Drizzle builder.
- [ ] В этих двух файлах отсутствуют raw SQL query-строки (допустимы только `sql` helper expressions для агрегатов/дат).
- [ ] Транзакция `createBoxSaleWithNewInstance` работает через Drizzle transaction.
- [ ] Формат денег/дат и shape ответов не изменены.

## Критерии приёмки

- В репозиториях `boxSales` и `upsellSales` нет использования `getDbPool()`.
- В репозиториях `boxSales` и `upsellSales` нет raw SQL-строк запросов.
- Проходят проверки:
  - `corepack pnpm check:no-any`
  - `corepack pnpm test:run`
  - `corepack pnpm build`

## Rollback note

Если после миграции выявлен регресс:
1. вернуть предыдущую реализацию `boxSalesRepository.ts` и `upsellSalesRepository.ts` из последнего стабильного коммита;
2. оставить `schema.ts` и SQL-миграции без изменений (схема совместима);
3. повторно прогнать `check:no-any`, `test:run`, `build`;
4. зафиксировать причину отката и сценарий, на котором проявился регресс.
