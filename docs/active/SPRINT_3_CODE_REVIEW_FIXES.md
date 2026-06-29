# Sprint 3 Code Review — строгие доработки

> **Статус:** open  
> **Дата:** 2026-06-29  
> **Покрытие review:** Chunk 4 backend (`boxSales`, `upsellSales`), web shell/pages, изменения docs  
> **Стиль:** строгий production review (риски/регрессии сначала)

---

## 1) Findings (по приоритету)

### P0 — Data integrity / бизнес-целостность

1. **`linkedBoxSaleId` валидируется только на существование, но не на принадлежность customer**
   - Риск: апсейл можно привязать к продаже другого клиента; ломается отчётность и support-связи.
   - Где: `apps/api/src/modules/upsellSales/upsellSalesService.ts`
   - Требование фикса: проверять, что `linkedBoxSaleId.customerId === payload.customerId` и (если `instanceId` задан) связность с тем же customer.

2. **`modules` в `POST /box-sales` принимаются от клиента**
   - Риск: клиент может записать несовместимые модули относительно `packageSku`, что бьёт downstream лицензирование.
   - Где: `apps/api/src/modules/boxSales/boxSalesValidation.ts`
   - Требование фикса: `modules` вычислять только на сервере из SKU-каталога; входное поле игнорировать/запретить.

3. **`skuCategory`/`title`/`listPriceRub` в `POST /upsell-sales` допускают произвольные override**
   - Риск: несогласованность канона SKU, грязные данные в продажах и аналитике.
   - Где: `apps/api/src/modules/upsellSales/upsellSalesValidation.ts`
   - Требование фикса: для известных SKU брать значения из каталога как source-of-truth; ручной override — отдельным явно разрешённым режимом.

### P1 — Надёжность и транзакционность

4. **Нет транзакции на пути `createInstance=true` в `POST /box-sales`**
   - Риск: создаётся instance, но sale может не записаться (частичный сайд-эффект).
   - Где: `apps/api/src/modules/boxSales/boxSalesService.ts`
   - Требование фикса: обернуть создание instance + box sale в одну DB transaction с rollback.

5. **Тесты называются integration, но полностью мокают repository-слой**
   - Риск: SQL/joins/constraints могут быть сломаны и не обнаружатся.
   - Где: `apps/api/tests/boxSales.integration.test.ts`, `apps/api/tests/upsellSales.integration.test.ts`
   - Требование фикса: добавить DB-backed integration smoke (минимум create/list/stats на реальной mysql test DB).

### P2 — Scope и UX-качество

6. **SKU-каталог в коде реализован как “core subset”, но в backlog отмечен как закрытый chunk item**
   - Риск: документарное расхождение “done” vs фактический объём реализации.
   - Где: `apps/api/src/modules/sales/skuCatalog.ts`, `docs/active/TODO.md`
   - Требование фикса: либо довести каталог до канона, либо явно отметить partial completion.

7. **Web guard проверяет только наличие token в localStorage**
   - Риск: просроченный/битый token пускает в shell, пользователь видит каскад 401.
   - Где: `apps/web/src/features/auth/authStorage.ts`, `apps/web/src/features/auth/ProtectedRoute.tsx`
   - Требование фикса: добавить валидацию сессии через `/auth/me` на bootstrap и logout при 401.

8. **Параллельные `.js` версии страниц/роутера в `apps/web/src`**
   - Риск: дрейф между TS/JS артефактами и шум в review.
   - Где: `apps/web/src/*.js`, `apps/web/src/pages/*.js`
   - Требование фикса: определить single source (TS), убрать/игнорировать дубль-артефакты.

---

## 2) План доработок (исполняемый)

### Wave A (обязательно до merge в `develop`)

- [x] A1. Ввести проверку принадлежности `linkedBoxSaleId` к customer в `upsellSalesService`.
- [x] A2. Запретить клиентский override `modules` для box sale; вычислять из каталога.
- [x] A3. Зафиксировать canonical поля upsell (`skuCategory`, `title`, `listPriceRub`) из каталога.
- [x] A4. Транзакция для `createInstance + createBoxSale`.

### Wave B (обязательно до закрытия Sprint 4)

- [ ] B1. Добавить реальные DB-backed integration tests для sales.
- [ ] B2. Исправить статус SKU catalog в `TODO.md` (или расширить каталог до полного).
- [x] B3. Добавить auth bootstrap (`/auth/me`) и обработку 401 для web shell.
- [x] B4. Убрать/нормализовать TS/JS дубли в web src.

---

## 3) Критерии приёмки после фиксов

1. Нельзя создать upsell, привязанный к `linkedBoxSaleId` другого клиента (ожидаемый 400/409).
2. `POST /box-sales` всегда пишет `modules` строго из `packageSku`.
3. `POST /upsell-sales` для canonical SKU всегда пишет канонические category/title/listPrice.
4. `createInstance=true` не оставляет “висячий” instance при ошибке записи sale.
5. DB-backed integration tests проходят на mysql (create/list/stats).
6. В web после протухшего token пользователь возвращается на `/login`, без “битого” shell.

---

## 4) Команды верификации для MR

```powershell
corepack pnpm check:no-any
corepack pnpm test:run
corepack pnpm build
```

Для DB-backed tests:

```powershell
corepack pnpm db:up
corepack pnpm db:migrate
# отдельная test seed/fixture команда (добавить в apps/api)
```
