# План внедрения: Price Policy + Pilot Guard (Chunk 5 + подготовка Chunk 6)

> **Статус:** implemented (API + tests), ready for codes integration  
> **Дата:** 2026-07-20  
> **Цель:** зафиксировать фактические цены 2026, внедрить модуль `price-lists` и добавить anti-abuse проверки пилота.

---

## 1. Бизнес-правила (утверждено)

### 1.1 Пакеты

| SKU | Продукт | Цена |
|-----|---------|------|
| `PKG-POINT` | Рег.Поинт | `50000.00` |
| `PKG-PROMO` | Рег.Промо | `50000.00` |
| `PKG-PRO` | Промо.Про | `80000.00` |

### 1.2 Апсейлы

| SKU | Услуга | Цена | Примечание |
|-----|--------|------|------------|
| `BOX-DEP-02` | Внедрение (базовый функционал, развертывание, обучение команды) | `12000.00` | фикс |
| `DEV-FIELD` | Кастомизация — кастомное поле | `20000.00` | минимум, зависит от конкретного функционала |
| `DEV-REPORT` | Кастомизация — кастомный отчёт | `20000.00` | минимум, зависит от конкретного функционала |

### 1.3 Включено в Промо.Про

- `INT-CRM` — интеграция CRM
- `BOX-FNS-01` — интеграция API ФНС
- Функционал `Рег.Поинт` и `Рег.Промо`

### 1.4 Пилот

- `SVC-PILOT` = `0.00`
- Длительность: 30 дней
- Повторный пилот для той же компании блокируется политикой eligibility

---

## 2. Что реализовано в коде

## 2.1 Каталоги и канон импорта

- Обновлён SKU-каталог: `apps/api/src/modules/sales/skuCatalog.ts`
- Добавлен/обновлён канон `import-canon`: `apps/api/src/modules/priceLists/canonCatalog.ts`
- Канон содержит 28+ позиций (фактически 30)

## 2.2 Price Lists API

Реализованы endpoints:

- `GET /api/v1/price-lists`
- `POST /api/v1/price-lists`
- `GET /api/v1/price-lists/:id`
- `PATCH /api/v1/price-lists/:id`
- `POST /api/v1/price-lists/:id/publish`
- `POST /api/v1/price-lists/:id/items`
- `PATCH /api/v1/price-lists/:id/items/:itemId`
- `DELETE /api/v1/price-lists/:id/items/:itemId`
- `POST /api/v1/price-lists/import-canon`
- `GET /api/v1/price-lists/current`

Ключевые правила:

- одновременно только один `published`
- опубликованный прайс нельзя редактировать
- цены валидируются в формате decimal string (`^\d+\.\d{2}$`)

## 2.3 Pilot eligibility (anti-abuse)

Реализован endpoint:

- `GET /api/v1/customers/:customerId/pilot-eligibility`

Проверки:

1. **INN guard**: если по ИНН уже есть pilot-коды (кроме revoked) — блок
2. **Customer guard**: если ИНН нет, повтор по тому же customer — блок
3. **Email guard**: если тот же `contactEmail` уже связан с пилотом — блок
4. **Active guard**: если есть активный `pilot_until > now` — блок

Причины в ответе:

- `INN_ALREADY_USED`
- `CUSTOMER_ALREADY_USED`
- `EMAIL_ALREADY_USED`
- `ACTIVE_PILOT_EXISTS`

---

## 3. Проверки и качество

## 3.1 Автотесты

Добавлены тесты:

- `apps/api/tests/priceLists.integration.test.ts`
- `apps/api/tests/canonCatalog.test.ts`
- `apps/api/tests/pilotEligibility.test.ts`

## 3.2 Прогоны

- `corepack pnpm --filter @esc-admin/api build` — green
- `corepack pnpm test:run` — green

---

## 4. Что остаётся на следующий шаг (Chunk 6)

Политика pilot встроена в precheck выдачи кодов:

1. На `POST /api/v1/licenses/:id/codes` при `codeType=pilot` вызывается eligibility-check
2. При `eligible=false` возвращается `409 CONFLICT` + причины
3. После успешного precheck endpoint выпускает signed activation code, шифрует и сохраняет запись в `activation_codes`
4. Добавлены integration tests для blocked/allowed сценариев и успешного `201`

Оставшиеся шаги для полного Chunk 6:

1. Перевести подпись на прямое использование `packages/license-signing` (`signPayload`) в сервисе выдачи
2. ~~Добавить `GET /codes` и `POST /codes/verify` (admin verify flow §7.5)~~ — **done** (`licenseCodesListService`, `licenseCodesVerifyService`)

---

## 5. Операционный runbook (коротко)

1. Создать/обновить draft через `POST /api/v1/price-lists/import-canon`
2. Проверить позиции и цены через `GET /api/v1/price-lists/:id`
3. Опубликовать через `POST /api/v1/price-lists/:id/publish`
4. Проверить активный прайс через `GET /api/v1/price-lists/current`
5. Перед выдачей pilot-кода проверить eligibility endpoint

