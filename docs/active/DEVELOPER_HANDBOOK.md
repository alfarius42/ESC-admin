# Developer Handbook — ESC-Admin (Regpoint Vendor Admin)

> **Статус:** актуально на 2026-07-20 (Chunk 0–5: auth, customers, instances, sales, price lists; pilot eligibility prep).  
> **Аудитория:** разработчик поддержки, новый участник команды, ИИ-агент в Cursor.  
> **Канон продукта:** [`VENDOR_ADMIN_SPEC.md`](VENDOR_ADMIN_SPEC.md) · **Скелетон:** [`ADMIN_SKELETON_SPEC.md`](ADMIN_SKELETON_SPEC.md) · **Интеграция с коробкой:** [`VENDOR_INTEGRATION.md`](VENDOR_INTEGRATION.md)  
> **Правило поддержки:** [`.cursor/rules/project-overview.mdc`](../../.cursor/rules/project-overview.mdc) (always apply)

---

## Как пользоваться этим документом

| Задача | Куда смотреть |
|--------|---------------|
| **Быстрый ответ «где это?»** | [§0 Quick lookup](#0-quick-lookup-вопрос--файл) |
| Быстро понять структуру репо | [§1 Карта репозитория](#1-карта-репозитория) |
| Найти файл по функции | [§2 Модули и файлы](#2-модули-и-файлы) |
| Цепочка вызовов (verify-token, signing) | [§2.5 Потоки запросов](#25-потоки-запросов) |
| Понять, что уже реализовано в API | [§3 API — реализовано vs planned](#3-api--реализовано-vs-planned) |
| Переменные окружения | [§4 Environment](#4-environment) |
| База данных | [§5 База данных](#5-база-данных) |
| Локальный запуск / smoke | [§6 Запуск и проверки](#6-запуск-и-проверки) |
| Тесты | [§7 Тесты](#7-тесты) |
| CI / git | [§8 CI и процесс](#8-ci-и-процесс) |
| Связь с ESC-Promo (коробка) | [§9 Граница admin ↔ коробка](#9-граница-admin--коробка) |
| Roadmap чанков | [§10 Roadmap](#10-roadmap) |
| Как обновлять handbook | [§13 Maintainer](#13-как-обновлять-handbook-maintainer--агент) |
| Полный индекс документов | [`DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md) |

**Для ИИ-агента:** начинай с §0. Каждый раздел содержит явные пути и статусы. При изменении кода обновляй соответствующую строку таблицы и дату в шапке. **Не** полагайся на `TODO.md` как на карту кода — там чеклист backlog; фактическое состояние — **этот handbook**.

---

## 0. Quick lookup (вопрос → файл)

| Вопрос / задача | Ответ |
|-----------------|-------|
| Где entry point API? | `apps/api/src/index.ts` → `createApp()` из `app.ts` |
| Где роуты подключены? | `apps/api/src/app.ts` |
| verify-instance-token — логика | `apps/api/src/routes/integrations.ts` |
| Instance token hash lookup | `apps/api/src/modules/instances/instancesRepository.ts` |
| Integration token generate/hash | `apps/api/src/modules/instances/integrationToken.ts` |
| Auth login/me/logout | `apps/api/src/routes/auth.ts` |
| Customers CRUD | `apps/api/src/modules/customers/customersRoutes.ts` |
| Instances CRUD + rotate-token | `apps/api/src/modules/instances/instancesRoutes.ts` |
| Box sales CRUD + stats | `apps/api/src/modules/boxSales/boxSalesRoutes.ts` |
| Upsell sales CRUD + stats | `apps/api/src/modules/upsellSales/upsellSalesRoutes.ts` |
| Price lists + import-canon | `apps/api/src/modules/priceLists/priceListsRoutes.ts` |
| Pilot eligibility check | `apps/api/src/modules/pilot/pilotRoutes.ts` |
| SKU catalog constants | `apps/api/src/modules/sales/skuCatalog.ts` |
| Проверка token hash (re-export) | `apps/api/src/db/instancesRepository.ts` |
| Парсинг env | `apps/api/src/config/environment.ts` |
| Reusable middleware token (не на router) | `apps/api/src/middleware/instanceTokenAuth.ts` |
| Timeout 3s на integration | `apps/api/src/middleware/integrationTimeout.ts` |
| Envelope `{ success, data, error }` | `apps/api/src/utils/apiResponse.ts` |
| Подпись activation code | `packages/license-signing/src/sign.ts` |
| Verify code offline | `packages/license-signing/src/verify.ts` |
| Парсинг envelope (dot / JSON) | `packages/license-signing/src/parse.ts` |
| Public exports пакета signing | `packages/license-signing/src/index.ts` |
| Полная SQL миграция | `apps/api/db/migrations/001_initial.sql` |
| Seed dev instance | `apps/api/scripts/seed-dev-instance.ts` |
| Какие порты / конфликт с ESC-Promo? | [§5.1 Port allocation](#51-port-allocation-параллельно-с-esc-promo) |
| Smoke script | `scripts/smoke.ps1` |
| CI gates | `.github/workflows/ci.yml` |
| Полное ТЗ admin API | `docs/active/VENDOR_ADMIN_SPEC.md` §8 |
| Граница admin ↔ коробка | `docs/active/ADMIN_SKELETON_SPEC.md` §2–§3 |
| API коробки (reference) | `docs/reference/esc-promo/API_CONTRACT.md` |
| Backlog чанков (чеклист) | `docs/active/TODO.md` |
| Активный спринт | `docs/active/TODO.md` § Chunk 6 |
| Внедрение цен 2026 + pilot guard | `docs/active/IMPLEMENTATION_PRICE_POLICY_PILOT.md` |
| Sprint 3 (закрыт) | `docs/active/IMPLEMENTATION_SPRINT_3.md` |
| Sprint 2 (закрыт) | `docs/active/IMPLEMENTATION_SPRINT_2.md` |
| Sprint 1 (закрыт) | `docs/active/IMPLEMENTATION_NEAREST_TASKS.md` |

---

## 1. Карта репозитория

```
ESC-Admin/
├── apps/
│   ├── api/          # Express REST API (vendor-admin backend)
│   └── web/          # React SPA (operator UI)
├── packages/
│   └── license-signing/   # RSA подпись activation codes (shared lib)
├── docs/
│   ├── active/       # ТЗ и handbook (источник истины admin)
│   └── reference/esc-promo/  # Read-only копии доков коробки
├── scripts/          # check-no-any, smoke
├── .github/workflows/ci.yml
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json      # root scripts: dev, build, test, db:*
└── .env.example
```

| Пакет npm | Путь | Назначение |
|-----------|------|------------|
| `esc-admin` | `/` | Root workspace, orchestration scripts |
| `@esc-admin/api` | `apps/api/` | HTTP API, MySQL, integration endpoints |
| `@esc-admin/web` | `apps/web/` | Operator UI (Vite + React) |
| `@esc-admin/license-signing` | `packages/license-signing/` | Sign/verify activation codes |

### Workspace `package.json` (scripts)

| Пакет | Ключевые scripts | Файл |
|-------|------------------|------|
| `esc-admin` (root) | `dev`, `build`, `test:run`, `db:*`, `smoke`, `docker:*` | [`package.json`](../../package.json) |
| `@esc-admin/api` | `dev` (tsx watch), `db:migrate`, `db:seed-dev`, `test:run` | [`apps/api/package.json`](../../apps/api/package.json) |
| `@esc-admin/web` | `dev` (vite :5174), `build`, `test:run` (passWithNoTests) | [`apps/web/package.json`](../../apps/web/package.json) |
| `@esc-admin/license-signing` | `build`, `test:run` | [`packages/license-signing/package.json`](../../packages/license-signing/package.json) |

**Стек:** Node 20 · Express 4 · MySQL 8 · React 18 · Vite 5 · pnpm workspaces · TypeScript strict.

---

## 2. Модули и файлы

### 2.1 `apps/api` — backend

| Файл | Назначение | Спека / связь |
|------|------------|---------------|
| `src/index.ts` | Entry: `createApp()` + listen на `env.port` | — |
| `src/app.ts` | Express app: JSON, routers, error handlers | `ADMIN_SKELETON_SPEC.md` §5 |
| `src/config/environment.ts` | Env vars, token hash, DB URL, timeouts | `.env.example`, `ADMIN_SKELETON_SPEC.md` §5.5 |
| `src/routes/status.ts` | `GET /status`, `GET /status/health` | Chunk 0 stub (DB/signing status — заглушки) |
| `src/routes/integrations.ts` | Integration routes для коробки | `ADMIN_SKELETON_SPEC.md` §3, `VENDOR_INTEGRATION.md` |
| `src/middleware/errorHandler.ts` | Envelope errors, 404 | `VENDOR_ADMIN_SPEC.md` §8 (response shape) |
| `src/middleware/integrationTimeout.ts` | Timeout ≤ 3s на integration routes | `ADMIN_SKELETON_SPEC.md` §3.1 |
| `src/middleware/instanceTokenAuth.ts` | Reusable `X-Instance-Token` check (env hash) | Chunk 2+ auth; пока не подключён к router |
| `src/utils/apiResponse.ts` | `ok()` / `fail()` → `{ success, data, error }` | Канон envelope |
| `src/routes/auth.ts` | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | Chunk 2 |
| `src/middleware/auth.ts` | `requireAuth` (JWT Bearer) | Chunk 2 |
| `src/middleware/rateLimit.ts` | Rate limit на login (ключ: socket IP, не X-Forwarded-For) | Chunk 2 |
| `src/db/client.ts` | mysql2 pool + Drizzle DB accessor (`getDrizzleDb`) | Chunk 2 |
| `src/modules/auth/*` | Auth service + repository | Chunk 2 |
| `src/modules/customers/*` | Customers CRUD | Chunk 3 |
| `src/modules/instances/*` | Instances CRUD, token lifecycle | Chunk 3 |
| `src/modules/boxSales/*` | Box sales CRUD + stats | Chunk 4 |
| `src/modules/upsellSales/*` | Upsell sales CRUD + stats | Chunk 4 |
| `src/modules/priceLists/*` | Price lists CRUD + publish + import-canon | Chunk 5 |
| `src/modules/pilot/*` | Pilot eligibility anti-abuse checks | Chunk 5 (prep for Chunk 6) |
| `src/modules/sales/skuCatalog.ts` | Package/upsell SKU constants | Chunk 4 |
| `src/utils/pagination.ts` | List pagination helpers | Chunk 2 |
| `src/db/instancesRepository.ts` | Re-export token lookup для integrations | Chunk 3 |
| `db/migrations/001_initial.sql` | Полная schema §10 | Chunk 2 |
| `scripts/seed-admin.ts` | Seed admin user | `pnpm db:seed` |
| `tests/auth-route.test.ts` | Auth + rate limit tests | — |
| `tests/customers.integration.test.ts` | Customers route tests | — |
| `tests/instances.integration.test.ts` | Instances routes (repository mocked) | — |
| `tests/instancesService.test.ts` | createInstanceRecord pending-hash / display-once | — |
| `tests/boxSales.integration.test.ts` | Box sales routes | — |
| `tests/upsellSales.integration.test.ts` | Upsell sales routes | — |
| `tests/priceLists.integration.test.ts` | Price lists routes | — |
| `tests/canonCatalog.test.ts` | Price canon (2026 policy) | — |
| `tests/pilotEligibility.test.ts` | Pilot anti-abuse rules | — |
| `Dockerfile` | Container image API | `docker-compose.yml` |

**Зависимости между слоями API:**

```
index.ts → app.ts → routes/* + middleware/*
                  → config/environment.ts (env)
                  → db/instancesRepository.ts (mysql2, только tokenSource=db)
routes/integrations.ts → instancesRepository, integrationTimeout, apiResponse
```

**Response envelope (везде):**

```json
{ "success": true|false, "data": {...}|null, "error": { "code": "...", "message": "..." }|null }
```

### 2.2 `packages/license-signing` — подпись кодов

| Файл | Export / функция | Назначение | Спека |
|------|------------------|------------|-------|
| `src/index.ts` | re-exports | Public API пакета | — |
| `src/types.ts` | `ActivationPayload`, `CodeType`, `ProductModule` | Типы payload | `BOX_PRODUCT_SPEC.md` §4 (reference) |
| `src/sign.ts` | `signPayload(payload, privateKeyPem)` | RSA sign → `base64url(payload).signature` | Chunk 1 |
| `src/verify.ts` | `verifyActivationCode(code, publicKeyPem)` | Offline verify на коробке / admin | Chunk 1 |
| `src/parse.ts` | `parseActivationEnvelope(code)` | Парсинг dot/JSON envelope | — |
| `src/base64url.ts` | `toBase64Url`, `fromBase64Url` | URL-safe base64 | — |
| `src/capabilities.ts` | `deriveCapabilities`, `validateModules` | Модули из payload | `PRODUCT_LINE.md` (ESC-Promo, не копируем) |
| `tests/sign.test.ts` | — | Round-trip sign + verify; wrong key → INVALID | — |
| `tests/parse.test.ts` | — | Dot envelope, JSON `{code}`, split b64, plain JSON | — |

**Public API (`index.ts` exports):** `signPayload`, `verifyActivationCode`, `parseActivationEnvelope`, `toBase64Url` / `fromBase64Url`, `deriveCapabilities`, `validateModules`, типы из `types.ts`.

**Trust model:** `LICENSE_PRIVATE_KEY` только на admin; `LICENSE_PUBLIC_KEY` — в образ коробки. См. [`VENDOR_INTEGRATION.md`](VENDOR_INTEGRATION.md) §0.

### 2.3 `apps/web` — frontend

| Файл | Назначение | Статус |
|------|------------|--------|
| `src/main.tsx` | React root + Router | implemented |
| `src/App.tsx` | Routes: login, dashboard, sales pages | implemented |
| `src/layouts/AppLayout.tsx` | Sidebar shell + logout | Chunk 4 |
| `src/features/auth/*` | Token storage, protected routes | Chunk 4 |
| `src/pages/LoginPage.tsx` | Login form → `/auth/login` | Chunk 4 |
| `src/pages/DashboardPage.tsx` | Operator home | Chunk 4 |
| `src/pages/sales/*` | Box/upsell list + create forms | Chunk 4 |
| `src/lib/apiClient.ts` | Fetch wrapper with JWT | Chunk 4 |
| `src/pages/PlaceholderPage.tsx` | Legacy placeholder (unused) | Chunk 0 |
| `vite.config.mjs` | Dev server :5174, proxy `/api` и `/status` → API | implemented |
| `Dockerfile` | Container image Web | optional full Docker |

**Design tokens (целевые):** primary `#243954`, accent `#e1eff2`, sidebar 240px — см. `VENDOR_ADMIN_SPEC.md` UI §.

### 2.4 Root / infra

| Файл | Назначение |
|------|------------|
| `package.json` | `dev`, `build`, `test:run`, `db:*`, `smoke`, `check:no-any` |
| `pnpm-workspace.yaml` | `apps/*`, `packages/*` |
| `docker-compose.yml` | mysql:3307, api:4000, web:5174; api `DATABASE_URL`→`mysql:3306` |
| `.dockerignore` | Исключает host `node_modules` из образов |
| `.env.example` | Шаблон env (не коммитить `.env`) |
| `scripts/check-no-any.mjs` | CI: запрет `: any` в ts/tsx |
| `scripts/smoke.ps1` | PowerShell smoke: status + verify-instance-token |
| `.github/workflows/ci.yml` | quality-gates: check:no-any, test, build |
| `README.md` | Ежедневный dev (PowerShell), порты, команды |

### 2.5 Потоки запросов

#### POST verify-instance-token

```mermaid
sequenceDiagram
  participant Box as ESC-Promo box
  participant Route as integrations.ts
  participant Repo as instancesRepository.ts
  participant DB as MySQL instances

  Box->>Route: X-Instance-Token + body.runtimeInstanceId
  Route->>Route: sha256(header token)
  alt INTEGRATION_TOKEN_SOURCE=env
    Route->>Repo: findInstanceByTokenHash
    Repo->>Repo: compare env.integrationTokenHash
  else INTEGRATION_TOKEN_SOURCE=db
    Route->>Repo: findInstanceByTokenHash
    Repo->>DB: SELECT by integration_token_hash
  end
  Route->>Route: check runtimeInstanceId, instance_status
  Route->>Repo: markInstanceTokenVerified (db only)
  Route->>Box: 200 tokenValid, modules, nextCheckAfterDays
```

**Файлы по порядку:** `integrations.ts` → `integrationTimeout.ts` (middleware) → `instancesRepository.ts` → `environment.ts`.

#### Activation code sign/verify (Chunk 1, offline на коробке)

```
signPayload(payload, LICENSE_PRIVATE_KEY)  →  "base64url(json).signature"
verifyActivationCode(code, LICENSE_PUBLIC_KEY)  →  VerificationResult
parseActivationEnvelope(code)  →  ParsedActivationEnvelope (dot / JSON variants)
```

**Спека формата:** `docs/reference/esc-promo/BOX_PRODUCT_SPEC.md` §4 (reference, read-only).

---

## 3. API — реализовано vs planned

> **Канон полного admin API:** [`VENDOR_ADMIN_SPEC.md`](VENDOR_ADMIN_SPEC.md) §8.  
> Ниже — **фактическое состояние кода** на Chunk 5.

| Method | Path | Статус | Модуль | Примечание |
|--------|------|--------|--------|------------|
| GET | `/status` | **implemented** (partial) | `routes/status.ts` | `database_status: NOT_CONNECTED`, `signing_status: NOT_IMPLEMENTED` |
| GET | `/status/health` | **implemented** | `routes/status.ts` | Liveness |
| POST | `/api/v1/auth/login` | **implemented** | `routes/auth.ts` | bcrypt, JWT, rate limit |
| GET | `/api/v1/auth/me` | **implemented** | `routes/auth.ts` | `requireAuth` |
| POST | `/api/v1/auth/logout` | **implemented** | `routes/auth.ts` | `requireAuth` |
| GET | `/api/v1/customers` | **implemented** | `modules/customers/` | search `q`, pagination |
| POST | `/api/v1/customers` | **implemented** | `modules/customers/` | validation legalName/inn |
| GET | `/api/v1/customers/:id` | **implemented** | `modules/customers/` | nested summary |
| PATCH | `/api/v1/customers/:id` | **implemented** | `modules/customers/` | partial update |
| GET | `/api/v1/instances` | **implemented** | `modules/instances/` | filters status, customerId, q |
| POST | `/api/v1/instances` | **implemented** | `modules/instances/` | display-once token; pending-hash без token |
| GET | `/api/v1/instances/:id` | **implemented** | `modules/instances/` | без plain token |
| PATCH | `/api/v1/instances/:id` | **implemented** | `modules/instances/` | Box ID 24 char |
| POST | `/api/v1/integrations/instances/:id/rotate-token` | **implemented** | `modules/instances/` | JWT auth, display-once |
| POST | `/api/v1/integrations/verify-instance-token` | **implemented** | `routes/integrations.ts` | Auth: `X-Instance-Token`; timeout 3s |
| GET | `/api/v1/box-sales` | **implemented** | `modules/boxSales/` | filters, pagination, customer summary |
| POST | `/api/v1/box-sales` | **implemented** | `modules/boxSales/` | optional `createInstance` |
| GET | `/api/v1/box-sales/:id` | **implemented** | `modules/boxSales/` | detail |
| PATCH | `/api/v1/box-sales/:id` | **implemented** | `modules/boxSales/` | partial update |
| GET | `/api/v1/box-sales/stats` | **implemented** | `modules/boxSales/` | count/revenue/byPackage |
| GET | `/api/v1/upsell-sales` | **implemented** | `modules/upsellSales/` | filters, pagination |
| POST | `/api/v1/upsell-sales` | **implemented** | `modules/upsellSales/` | SKU catalog validation |
| GET | `/api/v1/upsell-sales/:id` | **implemented** | `modules/upsellSales/` | detail |
| PATCH | `/api/v1/upsell-sales/:id` | **implemented** | `modules/upsellSales/` | partial update |
| GET | `/api/v1/upsell-sales/stats` | **implemented** | `modules/upsellSales/` | count/revenue/byCategory/bySku |
| GET | `/api/v1/price-lists` | **implemented** | `modules/priceLists/` | list + pagination |
| POST | `/api/v1/price-lists` | **implemented** | `modules/priceLists/` | create draft |
| GET | `/api/v1/price-lists/:id` | **implemented** | `modules/priceLists/` | detail + `items[]` |
| PATCH | `/api/v1/price-lists/:id` | **implemented** | `modules/priceLists/` | editable only in draft |
| POST | `/api/v1/price-lists/:id/publish` | **implemented** | `modules/priceLists/` | single published at a time |
| POST | `/api/v1/price-lists/:id/items` | **implemented** | `modules/priceLists/` | add item to draft |
| PATCH | `/api/v1/price-lists/:id/items/:itemId` | **implemented** | `modules/priceLists/` | patch item |
| DELETE | `/api/v1/price-lists/:id/items/:itemId` | **implemented** | `modules/priceLists/` | remove item |
| POST | `/api/v1/price-lists/import-canon` | **implemented** | `modules/priceLists/` | imports 28+ canonical SKUs |
| GET | `/api/v1/price-lists/current` | **implemented** | `modules/priceLists/` | current published list |
| GET | `/api/v1/customers/:customerId/pilot-eligibility` | **implemented** | `modules/pilot/` | anti-abuse precheck for pilot |
| POST | `/api/v1/licenses/:id/codes` | **partial** | `modules/licenses/` | issues signed/encrypted code, enforces §7.3 matrix + pilot eligibility, writes audit log; pending: switch signer to `license-signing` export |
| POST | `/api/v1/integrations/verify-code` | **stub 501** | `routes/integrations.ts` | Chunk 7 |
| POST | `/api/v1/integrations/support/messages` | **stub 501** | `routes/integrations.ts` | Chunk 7 |

### verify-instance-token — поведение

1. Header `X-Instance-Token` обязателен → иначе `401 INVALID_INSTANCE_TOKEN`.
2. Body: `runtimeInstanceId` обязателен → иначе `400 RUNTIME_INSTANCE_ID_REQUIRED`.
3. Token → SHA-256 → lookup:
   - `INTEGRATION_TOKEN_SOURCE=env` (default в test): сравнение с hash из env;
   - `INTEGRATION_TOKEN_SOURCE=db`: запрос в `instances.integration_token_hash`.
4. Mismatch `runtimeInstanceId` → `404 INSTANCE_NOT_FOUND`.
5. `instance_status=suspended` → `403 INSTANCE_SUSPENDED`.
6. Success → обновляет `last_token_verified_at` (только в db mode).
7. Response data: `tokenValid`, `licenseActive`, `modules`, `nextCheckAfterDays`, `warnings`.
8. **db mode:** `licenseActive` / `modules` / `validUntil` из `licenses` (последняя по `valid_until`); нет лицензии → `licenseActive: false`, `modules: []`, warning `NO_LICENSE_REGISTERED`.
9. **env mode** (CI/test): упрощённый ответ `licenseActive: true`, `modules: ["pro"]` без запроса в БД.

### POST /api/v1/instances — integration token

| `generateIntegrationToken` | Поведение |
|--------------------------|-----------|
| `true` | Генерируется plain token → SHA-256 hash в БД; plain token и `envSnippet` в response (display-once). |
| `false` / omitted | Hash = `sha256("pending:" + instanceId)`; plain token **не** возвращается; verify → `401` до `rotate-token`. |

**Спека:** [`ADMIN_SKELETON_SPEC.md`](ADMIN_SKELETON_SPEC.md) §3.1 · [`VENDOR_INTEGRATION.md`](VENDOR_INTEGRATION.md) §4.3.

---

## 4. Environment

Источник: [`.env.example`](../../.env.example) · парсинг: `apps/api/src/config/environment.ts`.

| Variable | Default / пример | Где используется | Секрет |
|----------|----------------|------------------|--------|
| `NODE_ENV` | `development` | env.tokenSource default (`test`→env, иначе→db) | нет |
| `PORT` | `4000` | API listen | нет |
| `MYSQL_HOST_PORT` | `3307` | host-порт MySQL в `docker-compose.yml` | нет |
| `WEB_PORT` | `5174` | host-порт Vite в `docker-compose.yml` | нет |
| `VENDOR_ADMIN_PUBLIC_URL` | `http://localhost:4000` | planned: public callbacks | нет |
| `DATABASE_URL` | `mysql://vendor:vendor@localhost:3307/regpoint_vendor` | instancesRepository, migrate, seed | нет |
| `JWT_SECRET` | ≥32 chars | auth (Chunk 2+) | **да** |
| `JWT_EXPIRES_IN` | `24h` | auth (Chunk 2+) | нет |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `60000` | login rate limit window | нет |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | `10` | login rate limit max | нет |
| `TRUST_PROXY` | `false` | `true` → `app.set("trust proxy", 1)` за reverse proxy | нет |
| `INTEGRATION_TOKEN_VERIFY_TIMEOUT_MS` | `3000` | integrationTimeout | нет |
| `INTEGRATION_TOKEN_CHECK_INTERVAL_DAYS` | `30` | response `nextCheckAfterDays` | нет |
| `INTEGRATION_INSTANCE_TOKEN_PLAIN` | `replace-with-plain-token` | dev token, smoke, tests | **да** |
| `INTEGRATION_INSTANCE_TOKEN_HASH` | auto from plain if empty | env-mode token verify | **да** |
| `INTEGRATION_TEST_RUNTIME_INSTANCE_ID` | `a1b2c3d4...` | dev seed, tests, env-mode record | нет |
| `INTEGRATION_TOKEN_SOURCE` | `db` (dev/prod), `env` (vitest) | instancesRepository mode; **не в .env.example** — задаётся явно или по NODE_ENV | нет |
| `LICENSE_PRIVATE_KEY` | PEM RSA | license-signing (Chunk 6+) | **да, never commit** |
| `LICENSE_PUBLIC_KEY` | PEM RSA | verify (admin + коробка) | публичный |
| `CODES_ENCRYPTION_KEY` | 32-byte hex | AES codes at rest (Chunk 6+) | **да** |
| `WEBSITE_PRICE_API_KEY` | — | public price API (Chunk 7+) | **да** |
| `PUBLIC_CORS_ORIGINS` | `http://localhost:5174,...` | CORS (Chunk 7+) | нет |
| `VITE_API_URL` | `/api/v1` | web → API (через Vite proxy в dev) | нет |

**Логика `INTEGRATION_TOKEN_SOURCE`:** см. `environment.ts` — default `env` при `NODE_ENV=test`, иначе `db`. Dev/smoke: `db` + `pnpm db:seed-dev`. Vitest: `env` без MySQL.

---

## 5. База данных

**Engine:** MySQL 8 (Docker `localhost:3307`, user/pass `vendor`, db `regpoint_vendor`).

### Миграции

| Файл | Таблицы | Chunk |
|------|---------|-------|
| `apps/api/db/migrations/001_initial.sql` | full schema (`users`, `customers`, `instances`, sales, licenses, support) | 2 |

### Таблица `instances` (Chunk 0)

| Column | Type | Описание |
|--------|------|----------|
| `id` | CHAR(36) PK | UUID instance |
| `runtime_instance_id` | VARCHAR(24) UNIQUE | Box ID с коробки |
| `integration_token_hash` | VARCHAR(64) | SHA-256 plain token |
| `integration_token_issued_at` | DATETIME | Выдача token |
| `last_token_verified_at` | DATETIME NULL | Последний успешный verify |
| `instance_status` | VARCHAR(20) | `planned` \| `active` \| `suspended` |
| `created_at` | DATETIME | — |

**Repository:** `apps/api/src/db/instancesRepository.ts`  
**Seed dev:** `pnpm db:seed-dev` → `scripts/seed-dev-instance.ts`

### Docker Compose

| Service | Image / build | Host port | Зависимости |
|---------|---------------|-----------|-------------|
| `mysql` | `mysql:8` | 3307→3306 | volume `mysqldata`, healthcheck |
| `api` | `apps/api/Dockerfile` | 4000 | `mysql` healthy; `DATABASE_URL` → `mysql:3306` |
| `web` | `apps/web/Dockerfile` | 5174 | `api`; `API_PROXY_TARGET=http://api:4000` |

Файл: [`docker-compose.yml`](../../docker-compose.yml). Dev по умолчанию: только `mysql` в Docker (`pnpm db:up`), API+Web локально.

### 5.1 Port allocation (параллельно с ESC-Promo)

На одной машине часто крутятся **коробка** (ESC-Promo) и **vendor-admin** (ESC-Admin). Порты разведены, чтобы не конфликтовать.

| Сервис | ESC-Promo (коробка) | ESC-Admin (vendor) | Конфиг |
|--------|---------------------|-------------------|--------|
| Web | `3002` (vite dev) / `80` (docker nginx) | **`5174`** | `apps/web/vite.config.mjs`, `WEB_PORT` |
| API | `3001` | **`4000`** | `PORT` |
| MySQL (host) | `3306` | **`3307`** → `3306` в контейнере | `MYSQL_HOST_PORT`, `DATABASE_URL` |

Vite dev проксирует `/api` и `/status` на `localhost:${PORT}` (локально) или `api:4000` (docker-compose, `API_PROXY_TARGET`) — см. `apps/web/vite.config.mjs`. Smoke и прямые curl к API — на `:4000`.

---

## 6. Запуск и проверки

Подробно: [`README.md`](../../README.md).

### Первый setup (PowerShell)

```powershell
cd C:\ESC-Admin
corepack enable
corepack pnpm install
Copy-Item .env.example .env
corepack pnpm db:up
Start-Sleep -Seconds 15
corepack pnpm db:migrate
corepack pnpm db:seed-dev
```

### Ежедневный цикл

```powershell
corepack pnpm db:up
corepack pnpm dev          # API :4000 + Web :5174 параллельно
# Ctrl+C
corepack pnpm db:down
```

### Smoke

```powershell
corepack pnpm smoke        # scripts/smoke.ps1
```

Или вручную — см. README § «Smoke-проверка API».

### Полезные команды

| Команда | Действие |
|---------|----------|
| `corepack pnpm dev:api` | Только API |
| `corepack pnpm dev:web` | Только Web |
| `corepack pnpm test:run` | Все пакеты (vitest) |
| `corepack pnpm build` | Сборка всех пакетов |
| `corepack pnpm check:no-any` | Запрет `any` в TS |
| `corepack pnpm db:reset` | Сброс volume MySQL (dev) |

---

## 7. Тесты

| Пакет | Файл | Что проверяет |
|-------|------|---------------|
| `@esc-admin/api` | `apps/api/tests/auth-route.test.ts` | login, 401, rate limit |
| `@esc-admin/api` | `apps/api/tests/customers.integration.test.ts` | customers CRUD + validation |
| `@esc-admin/api` | `apps/api/tests/instances.integration.test.ts` | display-once token, pending-hash create, rotate, PATCH |
| `@esc-admin/api` | `apps/api/tests/instancesService.test.ts` | service-layer create with/without token |
| `@esc-admin/api` | `apps/api/tests/integration-route.test.ts` | verify-token regression (401/403/404) |
| `@esc-admin/license-signing` | `packages/license-signing/tests/sign.test.ts` | sign/verify round-trip; wrong key → INVALID |
| `@esc-admin/license-signing` | `packages/license-signing/tests/parse.test.ts` | dot/JSON envelope parsing |
| `@esc-admin/web` | — | `passWithNoTests` (UI tests — Chunk 8+) |

**Запуск:** `corepack pnpm test:run` из корня.

**CI parity:** `corepack pnpm check:no-any; corepack pnpm test:run; corepack pnpm build`

---

## 8. CI и процесс

| Документ | Содержание |
|----------|------------|
| [`GIT_WORKFLOW.md`](GIT_WORKFLOW.md) | `feature/*` → PR → `develop` → `main` |
| [`GITHUB_RULES.md`](GITHUB_RULES.md) | Branch protection, required checks |
| [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | Trigger: push `feature/**`, `develop`; PR → `develop`, `main` |
| [`.cursor/rules/project-overview.mdc`](../../.cursor/rules/project-overview.mdc) | Контекст, API contract, docs index |
| [`.cursor/rules/reference-boundary.mdc`](../../.cursor/rules/reference-boundary.mdc) | Read-only референс ESC-Promo |
| [`.cursor/rules/typescript-standards.mdc`](../../.cursor/rules/typescript-standards.mdc) | TS, envelope, license signing |

**Quality gates (после Chunk 0):** `check:no-any` → `test:run` → `build`.

---

## 9. Граница admin ↔ коробка

Два канона API — **не смешивать:**

| Система | Документ | Репозиторий |
|---------|----------|-------------|
| Vendor-admin API | [`VENDOR_ADMIN_SPEC.md`](VENDOR_ADMIN_SPEC.md) §8 | ESC-Admin |
| Коробка ESC-Promo | [`docs/reference/esc-promo/API_CONTRACT.md`](../reference/esc-promo/API_CONTRACT.md) | ESC-Promo (reference copy) |

### Когда коробка обращается к admin (online)

**Единственный обязательный network call:** `POST /api/v1/integrations/verify-instance-token`

| Момент | Timeout | При ошибке |
|--------|---------|------------|
| Первый старт backend (token в `.env`) | 3 s | log warning, **не блокировать** |
| Периодически (≥ 30 суток) | 3 s | то же |

**Offline-first:** активация (`POST /api/license/activate` на коробке) — только локальная проверка подписи через `LICENSE_PUBLIC_KEY`.

**Диаграмма и правила R1–R7:** [`ADMIN_SKELETON_SPEC.md`](ADMIN_SKELETON_SPEC.md) §2–§3.

### Синхронизация reference docs

Копии из `C:\ESC-Promo\docs\active\` → `docs/reference/esc-promo/`. Не редактировать локально. См. [`docs/reference/esc-promo/README.md`](../reference/esc-promo/README.md).

---

## 10. Roadmap

Полный backlog: [`TODO.md`](TODO.md) · последний completed спринт: [`IMPLEMENTATION_SPRINT_3.md`](IMPLEMENTATION_SPRINT_3.md) · актуальное внедрение цен/пилота: [`IMPLEMENTATION_PRICE_POLICY_PILOT.md`](IMPLEMENTATION_PRICE_POLICY_PILOT.md).

| Chunk | Название | Статус в коде | Ключевые артеfacts |
|:-----:|----------|:-------------:|---------------------|
| 0 | Monorepo skeleton + verify-instance-token | **implemented** | docker, verify-token |
| 1 | `packages/license-signing` | **implemented** | sign, verify, parse, tests |
| 2 | API: config, db, auth | **implemented** | JWT auth, phased Drizzle adoption (`db/schema.ts`, `getDrizzleDb`), `001_initial.sql` |
| 3 | customers, instances | **implemented** | CRUD, token display-once, rotate |
| 4 | boxSales, upsellSales, web shell | **implemented** | sales API + operator UI |
| 5 | price lists + import-canon + pricing policy 2026 | **implemented** | `modules/priceLists/*`, `canonCatalog.ts`, `priceLists.integration.test.ts` |
| 6 | licenses, codes (issue + verify) | planned (pilot precheck ready) | `modules/pilot/*` + `license-signing` |
| 7–12 | dashboard, public API, support, audit, docs | planned | см. `VENDOR_ADMIN_SPEC.md` §18 |

> **Примечание:** [`TODO.md`](TODO.md) — чеклист backlog с `[ ]`/`[x]`; сводная таблица там может отставать. **Источник истины по коду** — §2–§3 этого handbook.

После каждого чанка: `pnpm test:run` + обновить этот handbook (§0, §2, §3, §5, §10).

---

## 11. Troubleshooting

| Симптом | Проверить |
|---------|-----------|
| `401 INVALID_INSTANCE_TOKEN` | `.env` → `INTEGRATION_INSTANCE_TOKEN_PLAIN`; для db mode — `pnpm db:seed-dev` |
| `DATABASE_URL is required` | `INTEGRATION_TOKEN_SOURCE=db` без DATABASE_URL |
| MySQL connection refused | `pnpm db:up`, порт 3307, подождать healthcheck |
| Smoke fails on verify | API запущен? token совпадает с seed? `runtimeInstanceId` совпадает |
| Tests pass locally, fail CI | `INTEGRATION_TOKEN_SOURCE=env` в vitest; hash env vars |
| `check:no-any` fails | Убрать `: any` из `apps/**` или `packages/**` |

---

## 12. Связанные документы (полный индекс)

| Документ | Зачем |
|----------|-------|
| [`DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md) | Полный список docs |
| [`CURSOR_CONTEXT.md`](../../CURSOR_CONTEXT.md) | Лёгкий индекс для агента |
| [`AGENTS.md`](../../AGENTS.md) | Контекст Cursor: чанки, git, handbook |
| [`.cursor/rules/project-overview.mdc`](../../.cursor/rules/project-overview.mdc) | Always apply: контекст, API contract, handbook |
| [`VENDOR_ADMIN_SPEC.md`](VENDOR_ADMIN_SPEC.md) | Полное ТЗ, API §8, SQL, UI |
| [`ADMIN_SKELETON_SPEC.md`](ADMIN_SKELETON_SPEC.md) | Chunk 0, граница API |
| [`VENDOR_INTEGRATION.md`](VENDOR_INTEGRATION.md) | Token, verify-code, deploy |
| [`IMPLEMENTATION_PRICE_POLICY_PILOT.md`](IMPLEMENTATION_PRICE_POLICY_PILOT.md) | Фактические цены 2026, pilot anti-abuse, runbook |
| [`docs/reference/esc-promo/`](../reference/esc-promo/) | Референс коробки |

---

## 13. Как обновлять handbook (maintainer / агент)

1. **До правки кода** — найти строку в §0 или §2; сверить со спекой (`ADMIN_SKELETON_SPEC`, `VENDOR_ADMIN_SPEC` §8).
2. **После правки** — обновить таблицу (статус, путь, примечание); при новом env/route/migration — §4 или §5.
3. **Новый endpoint** — строка в §3 + при необходимости flow в §2.5.
4. **Закрыт чанк** — §10 roadmap + дата в шапке.
5. **Новый ключевой doc** — `DOCUMENTATION_INDEX.md`, `CURSOR_CONTEXT.md`, строка в §12.

Шаблон строки модуля:

`| path/to/file.ts | краткое назначение | implemented \| stub \| planned | ссылка на спеку |`

---

*При изменении модулей, routes, env или статуса чанка — обновить этот файл и дату в шапке.*
