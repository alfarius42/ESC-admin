# ESC-Admin — backlog разработки (MVP)

> **Обновляй статус:** `[ ]` → `[x]` при закрытии. Архив выполненного — `docs/archive/`.  
> **Канон:** `VENDOR_ADMIN_SPEC.md`, скелетон — `ADMIN_SKELETON_SPEC.md`, интеграция — `VENDOR_INTEGRATION.md`.  
> **Порядок:** чанки 0→12 последовательно; после каждого — `pnpm test:run`.
> **Активный спринт:** [`IMPLEMENTATION_SPRINT_3.md`](IMPLEMENTATION_SPRINT_3.md) (Chunk 4 + Web Shell) — completed.  
> **Sprint 2 (закрыт):** [`IMPLEMENTATION_SPRINT_2.md`](IMPLEMENTATION_SPRINT_2.md) (Chunk 2 → Chunk 3).  

---

## Сводка прогресса

| Chunk | Название | Статус |
|:-----:|----------|:------:|
| 0 | Monorepo skeleton + verify-instance-token | ✅ |
| 1 | `packages/license-signing` | ✅ |
| 2 | API: config, db, auth | ✅ |
| 3 | customers, instances | ✅ |
| 4 | boxSales, upsellSales | ✅ |
| 5 | priceLists + import-canon | ✅ |
| 6 | licenses, codes (issue + verify) | ⬜ |
| 7 | dashboard, public API, integration, support API | ⬜ |
| 8 | web shell (layout, auth) | ✅ |
| 9 | sales UI + instance Box ID | ⬜ |
| 10 | pricing, codes, SupportInbox | ⬜ |
| 11 | audit log, support e2e | ⬜ |
| 12 | README, интеграционная документация | ⬜ |

**Текущая фаза репо:** Chunk 5 закрыт (price lists + import-canon + pricing policy 2026). Следующий — Chunk 6 (licenses/codes, с подключением pilot-eligibility).

---

## 0. Подготовка (до Chunk 0)

### Git и CI

- [ ] Ветка `feature/chunk-0-skeleton` от актуального `develop`
- [ ] CI workflow `.github/workflows/ci.yml` — quality gates после появления `package.json`

### Ключи и секреты (локально, не в git)

- [ ] Сгенерировать RSA 4096 пару (`LICENSE_PRIVATE_KEY` / `LICENSE_PUBLIC_KEY`)
- [ ] Сгенерировать `CODES_ENCRYPTION_KEY` (32 byte hex для AES-256-GCM)
- [ ] Сгенерировать `JWT_SECRET` (≥ 32 символов)
- [ ] Убедиться: `.env` в `.gitignore`, `*.pem` не коммитятся

### Референс ESC-Promo (read-only)

- [ ] При необходимости перекопировать `docs/reference/esc-promo/` из `C:\ESC-Promo\docs\active\`
- [ ] Для cross-repo тестов: доступ к `C:\ESC-Promo` с тем же `LICENSE_PUBLIC_KEY`

---

## Chunk 0 — Monorepo skeleton

**Документ:** `ADMIN_SKELETON_SPEC.md` §5–§7  
**Промпт:** §8 того же документа

### 0.1 Monorepo и инфраструктура

- [x] `pnpm-workspace.yaml` + root `package.json` (scripts: `dev`, `build`, `test:run`, `docker:up`, `docker:down`)
- [x] `docker-compose.yml`: MySQL 8, `apps/api`, `apps/web`
- [x] `.env.example` (§5.5 `ADMIN_SKELETON_SPEC.md` + §12 `VENDOR_ADMIN_SPEC.md`)
- [x] `packages/license-signing/` — `package.json` + stub `index.ts` (полная реализация в Chunk 1)
- [x] README: секция «локальный запуск»

### 0.2 apps/api (skeleton)

- [x] Express 4 + TypeScript strict, `app.ts`, `index.ts`
- [x] `config/environment.ts`
- [x] `middleware/errorHandler.ts` — envelope `{ success, data, error }`
- [x] `middleware/instanceTokenAuth.ts` — проверка `X-Instance-Token` по sha256 hash
- [x] `utils/apiResponse.ts`
- [x] `routes/status.ts`: `GET /status`, `GET /status/health`
- [ ] `routes/integrations.ts`:
  - [x] `POST /api/v1/integrations/verify-instance-token` — полная логика §3.1
  - [x] `POST /api/v1/integrations/verify-code` — stub `501 NOT_IMPLEMENTED`
  - [x] `POST /api/v1/auth/login` — реализован в Chunk 2 (не stub)
- [x] Timeout ≤ 3s на integration routes
- [x] Dockerfile

### 0.3 БД skeleton

- [x] Миграция `001_skeleton.sql` — таблица `instances` (минимум для verify-token)
- [x] Seed/dev: один test instance с известным token hash
- [x] Скрипт migrate (или ручной apply через docker)

### 0.4 apps/web (placeholder)

- [x] Vite 5 + React 18 + TypeScript
- [x] `PlaceholderPage.tsx`, stub `/login`
- [x] Dockerfile
- [x] Порт `:5174`

### 0.5 Критерии приёмки Chunk 0

- [ ] `pnpm install && pnpm docker:up && pnpm dev` — API `:4000`, web `:5174`
- [x] `GET /status` → `status: OK`
- [x] `POST /integrations/verify-instance-token` с валидным token → `200`, `tokenValid: true`
- [x] Невалидный token → `401 INVALID_INSTANCE_TOKEN`
- [x] `pnpm build && pnpm test:run` — green (smoke)
- [ ] `LICENSE_PRIVATE_KEY` отсутствует в `apps/web/dist`
- [ ] `VENDOR_INTEGRATION.md` §0 ссылается на `ADMIN_SKELETON_SPEC.md`

---

## Chunk 1 — packages/license-signing

**Документ:** `VENDOR_ADMIN_SPEC.md` §7, §15 (exports)

### 1.1 Пакет

- [x] `src/types.ts` — `ActivationPayload`, `CodeType`, `ProductModule`, `PackageSlug`
- [x] `src/base64url.ts`
- [x] `src/sign.ts` — `signPayload()` бит-в-бит с ESC-Promo `license/service.js`
- [x] `src/verify.ts` — `verifySignature()`
- [x] `src/parse.ts` — `parseActivationEnvelope()` (b64url.sig, JSON envelope, plain JSON)
- [x] `src/capabilities.ts` — merge modules, validate payload
- [x] `src/index.ts` — re-exports

### 1.2 Тесты

- [x] `sign.test.ts` — roundtrip sign → verify
- [x] `sign.test.ts` — invalid key → fail
- [x] `parse.test.ts` — parse всех форматов envelope + anti-recursion guard
- [x] `pnpm test:run` в `packages/license-signing` — green

---

## Chunk 2 — API: config, db, auth

**Документ:** `VENDOR_ADMIN_SPEC.md` §5.1, §8.2, §10–§12, §14

### 2.1 БД (полная схема)

- [x] Миграция `001_initial.sql` — все таблицы §10 (users, customers, instances, price_lists, box_sales, licenses, activation_codes, audit_log, support_*)
- [x] Seed admin user (`db:seed`) — один user `admin@vendor.local`
- [x] ORM phased adoption: Drizzle + `db/schema.ts`; migrated repositories: `auth`, `customers`, `instances` (core/token paths)
- [x] Scripts: `db:migrate`, `db:seed`

### 2.2 Config и middleware

- [x] `config/environment.ts` — все переменные §12
- [x] `middleware/auth.ts` — `requireAuth` (JWT Bearer)
- [x] `middleware/rateLimit.ts` — базовый rate limit
- [x] `utils/pagination.ts`
- [x] `utils/cryptoAtRest.ts` — AES-256-GCM для кодов

### 2.3 Auth module

- [x] `POST /api/v1/auth/login` — email + password, bcrypt cost 12
- [x] `GET /api/v1/auth/me`
- [x] `POST /api/v1/auth/logout`
- [x] JWT expires per `JWT_EXPIRES_IN`
- [x] Endpoint `/users/*` **не реализовывать** (Phase 2)

### 2.4 Критерии приёмки Chunk 2

- [x] `pnpm test:run` — green

---

## Chunk 3 — customers, instances

**Документ:** `VENDOR_ADMIN_SPEC.md` §8.4–8.5

### 3.1 Customers module

- [x] `GET /customers` — search `q`, pagination
- [x] `POST /customers` — validation (legalName min 2, inn 10/12 digits)
- [x] `GET /customers/:id` — nested summary (instances, sales counts, revenue)
- [x] `PATCH /customers/:id` — partial update

### 3.2 Instances module

- [x] `GET /instances` — filter by status, customerId, search
- [x] `POST /instances` — `generateIntegrationToken: true`:
  - [x] `crypto.randomBytes(32)` → base64url token
  - [x] `integration_token_hash = sha256(token)` в БД
  - [x] Response **display once**: `integrationToken`, `envSnippet`
- [x] `GET /instances/:id` — instance + licenses + masked codes + sales
- [x] `PATCH /instances/:id` — включая `runtimeInstanceId` (Box ID, 24 char)
- [x] `POST /integrations/instances/:id/rotate-token` — новый token, старый invalidate

### 3.3 Критерии приёмки Chunk 3

- [x] CRUD customer end-to-end через API
- [x] Create instance → token показан один раз → повторный GET без plain token
- [x] Rotate token → старый token → `401 INVALID_INSTANCE_TOKEN` на verify
- [x] Integration tests — green

---

## Chunk 4 — boxSales, upsellSales

**Документ:** `VENDOR_ADMIN_SPEC.md` §6, §8.6–8.7

### 4.1 SKU catalog (constants)

- [x] Пакеты: `regpoint_point`, `regpoint_promo`, `regpoint_pro`, `regpoint_ticket` §6.1
- [x] Апсейлы: core subset (LIC-UP-*, DEP-*, DEV-*, SUP-*, LEG-*) §6.2
- [x] Маппинг SKU → modules §6.3

### 4.2 Box sales module

- [x] `GET /box-sales` — filters, pagination, stats aggregate
- [x] `POST /box-sales` — customerId, packageSku, soldPriceRub (string decimal), soldAt, contractRef, createInstance, notes
- [x] Auto: listPriceRub из SKU catalog, modules из SKU
- [x] `createInstance=true` → auto-create instance (pending token)
- [x] `GET /box-sales/:id`, `PATCH /box-sales/:id`
- [x] `GET /box-sales/stats` — count by package, revenue

### 4.3 Upsell sales module

- [x] `GET /upsell-sales`, `POST /upsell-sales`, `GET /:id`, `PATCH /:id`
- [x] Поля: sku, skuCategory, title, soldPriceRub, linkedBoxSaleId
- [x] `GET /upsell-sales/stats`

### 4.4 Тесты

- [x] `boxSales.integration.test.ts` — create sale, stats count
- [x] `upsellSales.integration.test.ts` — create upsell, stats
- [x] `pnpm test:run` — green

---

## Chunk 5 — priceLists + import-canon

**Документ:** `VENDOR_ADMIN_SPEC.md` §8.8, §6 (канон из BUSINESS_MODEL ESC-Promo)

### 5.1 Price lists module

- [x] `GET /price-lists` — list with publish status
- [x] `POST /price-lists` — create draft
- [x] `GET /price-lists/:id` — items[]
- [x] `PATCH /price-lists/:id` — title, dates (только draft)
- [x] `POST /price-lists/:id/items` — add item (sku, type, price_rub string, modules)
- [x] `PATCH /price-lists/:id/items/:itemId`
- [x] `DELETE /price-lists/:id/items/:itemId`
- [x] `POST /price-lists/:id/publish` — только один published одновременно
- [x] `POST /price-lists/import-canon` — импорт 28+ SKU из канона

### 5.2 Критерии приёмки Chunk 5

- [x] Import canon → ≥ 28 price items
- [x] Publish → предыдущий published → unpublished
- [x] `priceLists.integration.test.ts` — green

---

## Chunk 6 — licenses, codes

**Документ:** `VENDOR_ADMIN_SPEC.md` §7, §8.9

### 6.1 Licenses module

- [ ] `GET /licenses` — filters (customerId, instanceId, status)
- [ ] `POST /licenses` — link boxSaleId or instanceId
- [ ] `GET /licenses/:id` — license + codes (masked) + history
- [ ] `PATCH /licenses/:id` — status, validUntil, modules

### 6.2 Codes module (issue)

- [x] `POST /licenses/:id/codes` — codeType: initial | addon | renewal | pilot | reissue
- [x] Для `codeType=pilot`: вызывать `GET /customers/:customerId/pilot-eligibility` и блокировать повторный пилот (`409 CONFLICT`)
- [x] Базовый issue flow: `POST /licenses/:id/codes` возвращает `201`, `activationCode`, `displayOnce`, `emailTemplate`; код сохраняется encrypted в `activation_codes`
- [x] Validation rules §7.3 (duplicate initial blocked, addon merge rules, etc.)
- [x] Сроки §7.4: initial/renewal 365d, pilot 30d
- [ ] Sign через `license-signing` package export (`signPayload`) §7.6
- [x] Encrypt at rest (`activation_code_encrypted`, AES-256-GCM) §7.6
- [x] Audit log на `CODE_ISSUED` и `CODE_ISSUE_BLOCKED`
- [ ] Response: full code **display once** + summary для support
- [ ] `POST /codes/verify` (admin UI) — parse, verify, lookup, warnings §7.5
- [ ] `GET /codes` — без full code, только hash prefix + metadata

### 6.3 Тесты

- [ ] `codes.integration.test.ts`:
  - [ ] issue initial
  - [ ] verify valid
  - [ ] duplicate initial blocked
- [ ] `pnpm test:run` — green

---

## Chunk 7 — dashboard, public API, integration, support API

**Документ:** `VENDOR_ADMIN_SPEC.md` §8.10–8.15, `ADMIN_SKELETON_SPEC.md` §3

### 7.1 Dashboard module

- [ ] `GET /dashboard` — KPI: boxes sold, upsells sold, total revenue, active instances
- [ ] Package mix breakdown
- [ ] Renewals due: 30 / 14 / 7 days

### 7.2 Public API

- [ ] `GET /public/price-list/current` — published list (optional `WEBSITE_PRICE_API_KEY`)
- [ ] CORS per `PUBLIC_CORS_ORIGINS`
- [ ] Деньги — строки `"180000.00"`

### 7.3 Integration API (полная реализация)

- [ ] `POST /integrations/verify-instance-token` — upgrade from skeleton:
  - [ ] lookup instance by token hash
  - [ ] update `last_token_verified_at`
  - [ ] audit log `integration.token_verified`
  - [ ] errors: 401/403/404 per §8.13
- [ ] `POST /integrations/verify-code` — online verify для коробки §8.13
- [ ] Stub routes Phase 2: activation-callback, heartbeat → `501`

### 7.4 Support chat API

- [ ] Integration (коробка → admin, `X-Instance-Token`):
  - [ ] `POST /integrations/support/messages`
  - [ ] `GET /integrations/support/messages`
- [ ] Admin inbox (JWT):
  - [ ] `GET /support/threads`
  - [ ] `GET /support/threads/:threadId/messages`
  - [ ] `POST /support/threads/:threadId/messages`
  - [ ] `PATCH /support/threads/:threadId/link` — manual Box ID ↔ instance
  - [ ] `PATCH /support/threads/:threadId` — close

### 7.5 Тесты

- [ ] `support.integration.test.ts` — post message, link thread, inbox shows company
- [ ] `pnpm test:run` — green

---

## Chunk 8 — web shell (layout, auth)

**Документ:** `VENDOR_ADMIN_SPEC.md` §4, §9.1 (routes skeleton)

### 8.1 Design system

- [ ] CSS tokens: primary `#243954`, accent `#e1eff2`, sidebar 240px, radius 8px
- [ ] Fonts: Ubuntu (headings), Times New Roman / system (body)
- [ ] Компоненты: Button, Input, Select, Textarea, Dialog, Table, Badge, Card, StatCard, PageHeader, EmptyState, CopyButton, ConfirmDialog, Toast (sonner)
- [ ] Badge colors: active/green, grace/amber, expired/red, draft/gray

### 8.2 Layout и routing

- [ ] `AppLayout.tsx` — sidebar (logo «Regpoint Admin»), header + user menu
- [ ] React Router — все routes §9.1 (placeholder pages ok)
- [ ] `api/client.ts` — fetch wrapper, envelope parse, Bearer token
- [ ] Auth flow: LoginPage → store JWT → redirect `/`
- [ ] Protected routes → redirect `/login` if no token
- [ ] Logout

### 8.3 Критерии приёмки Chunk 8

- [ ] Login admin → dashboard placeholder
- [ ] Sidebar navigation на все MVP routes
- [ ] `LICENSE_PRIVATE_KEY` не в bundle

---

## Chunk 9 — sales UI + instance Box ID

**Документ:** `VENDOR_ADMIN_SPEC.md` §9.2

### 9.1 Dashboard

- [ ] `DashboardPage` — 4 StatCards, package mix bar chart (CSS), renewals table

### 9.2 Customers

- [ ] `CustomersListPage` — search, pagination, link to detail
- [ ] `CustomerFormPage` — create/edit fields §9.2
- [ ] `CustomerDetailPage` — summary, instances list, sales links

### 9.3 Instances

- [ ] `InstancesListPage` — filters, status badges
- [ ] `InstanceDetailPage`:
  - [ ] customer link, status select
  - [ ] **Box ID** manual input (`runtimeInstanceId`, 24 char)
  - [ ] integration token display-once modal / rotate button
  - [ ] tab «Чат» (placeholder или thread link)
  - [ ] licenses, codes (masked), sales

### 9.4 Sales

- [ ] `BoxSalesListPage` — table + stats header
- [ ] `BoxSaleFormPage` — fields §9.2, auto-fill from price list
- [ ] `UpsellSalesListPage`, `UpsellSaleFormPage`

### 9.5 Критерии приёмки Chunk 9

- [ ] Flow A (§16): customer → box sale → instance created → token modal
- [ ] Box ID save → persisted via PATCH

---

## Chunk 10 — pricing, codes, SupportInbox

**Документ:** `VENDOR_ADMIN_SPEC.md` §9.2

### 10.1 Pricing UI

- [ ] `PriceListsPage` — list, import canon button, publish action
- [ ] `PriceListDetailPage` — items table, add/edit/delete, publish

### 10.2 Codes UI

- [ ] `IssueCodeWizardPage` — 3 steps §9.2:
  - [ ] Step 1: select/create license
  - [ ] Step 2: codeType + rules tooltip
  - [ ] Step 3: confirm → issue → modal with code + CopyButton + email template
- [ ] `VerifyCodePage` — paste, verify, result card with warnings

### 10.3 Support UI

- [ ] `SupportLookupPage` — search by instance_id / INN / email / name, results tabs
- [ ] `SupportInboxPage` — columns: **Box ID | Компания | preview | updated | unlinked badge**
- [ ] `SupportThreadPage` — messages, reply, link thread

### 10.4 Критерии приёмки Chunk 10

- [ ] Issue initial code → copy → verify in admin UI → `valid: true`
- [ ] Inbox shows unlinked until Box ID entered on instance

---

## Chunk 11 — audit log, support e2e hardening

**Документ:** `VENDOR_ADMIN_SPEC.md` §17, Flow F §16

### 11.1 Audit log

- [ ] `modules/audit/` — write on: code issue, token rotate, token verify, login, support link
- [ ] `GET /audit-log` — pagination, filters (action, entityType, date range)
- [ ] UI: audit log section on instance/license detail (optional minimal list)

### 11.2 Support e2e

- [ ] Director POST message → admin inbox row with Box ID + company (after manual link)
- [ ] Admin reply → director sees on `/support`
- [ ] Thread close flow
- [ ] `support.integration.test.ts` + manual Flow F checklist

### 11.3 Hardening

- [ ] Error boundaries в web
- [ ] Loading/empty states на всех list pages
- [ ] Form validation messages (VALIDATION_ERROR from API)
- [ ] Rate limit на login

---

## Chunk 12 — README и документация

### 12.1 README

- [ ] Описание продукта, стек, prerequisites
- [ ] Quick start: `pnpm install`, `docker:up`, `db:migrate`, `db:seed`, `dev`
- [ ] Environment variables table
- [ ] Production deploy (VPS, `VENDOR_ADMIN_PUBLIC_URL`)
- [ ] Security: private key handling, token display-once

### 12.2 API docs

- [ ] `docs/API.md` — копия или выжимка §8 `VENDOR_ADMIN_SPEC.md`

### 12.3 Integration docs sync

- [ ] `VENDOR_INTEGRATION.md` актуален после реализации
- [ ] Cross-repo checklist §17 в README или отдельный `docs/active/CROSS_REPO_TEST.md`
- [ ] Обновить `CURSOR_CONTEXT.md` / `DOCUMENTATION_INDEX.md` при новых doc-файлах

---

## MVP — финальные критерии приёмки

> `VENDOR_ADMIN_SPEC.md` §19

- [ ] `pnpm docker:up && pnpm db:migrate && pnpm db:seed && pnpm dev` — UI `:5174`, API `:4000`
- [ ] Login admin → dashboard with zero stats
- [ ] Import canon → 28+ price items
- [ ] Create customer → box sale → license → initial code
- [ ] Verify code in admin → `valid: true`
- [ ] Same code activates ESC-Promo dev instance (cross-repo)
- [ ] Box/upsell stats match manual entries
- [ ] `GET /public/price-list/current` returns published list
- [ ] `grep -r PRIVATE apps/web/dist` — empty
- [ ] `pnpm test:run` — green
- [ ] Manual Box ID on instance → inbox **Box ID + company**; chat roundtrip director ↔ admin

---

## E2E бизнес-сценарии (ручная проверка)

> `VENDOR_ADMIN_SPEC.md` §16

### Flow A — Первая продажа коробки

- [ ] POST customer → POST box-sale (PKG-PRO, createInstance=true)
- [ ] POST license → POST initial code
- [ ] Copy code → ESC-Promo director → activate
- [ ] PATCH instance: Box ID + status active

### Flow B — Апгрейд Point → Pro

- [ ] POST upsell (LIC-UP-PRO-POINT)
- [ ] POST addon code modules `["pro"]`
- [ ] Client activate → modules merged

### Flow C — Renewal Y2

- [ ] Dashboard shows renewal within 30 days
- [ ] Record payment (note/upsell)
- [ ] POST renewal code (+365d)
- [ ] Client activate renewal

### Flow D — Pilot

- [ ] POST pilot code (+30d, modules `["point"]`)
- [ ] Client `activate-pilot`

### Flow F — Support chat + Box ID

- [ ] Admin: customer + instance (Box ID empty)
- [ ] Director: activate → copy Box ID
- [ ] Admin: PATCH instance Box ID
- [ ] Director: POST support message → inbox **Box ID + company**
- [ ] Admin reply → director `/support`

---

## Интеграция с ESC-Promo (отдельный репо)

> Задачи в `C:\ESC-Promo`, не в ESC-Admin. Референс: `ADMIN_SKELETON_SPEC.md` §6.

| # | Задача | Статус |
|---|--------|:------:|
| I0 | Periodic token verify (`verify-instance-token`, 30 суток) | ⬜ |
| I1 | Совместимость подписи с `license/service.js` | ⬜ |
| I2 | Online verify-code (`VENDOR_ADMIN_VERIFY_ENABLED`) | ⬜ |
| I3 | Support chat + Box ID manual link | ⬜ |
| I4 | Cross-repo manual test checklist (§17 spec) | ⬜ |

### I0 — verify-instance-token на коробке

- [ ] `vendorIntegration.js`: `verifyInstanceTokenOnStartup()`, `verifyInstanceTokenIfDue()`
- [ ] `server.js`: после load license — async non-blocking startup verify
- [ ] `license/service.js`: при `lastVerifiedAt > MONTH_MS` — online verify
- [ ] Timeout 3s; fail → warning only
- [ ] **Запрет:** cron/interval < 30 суток для admin calls

### I1 — совместимость подписи

- [ ] Одинаковый `LICENSE_PUBLIC_KEY` в admin и коробке
- [ ] Code from admin → `POST /api/license/activate` → active, modules match

### I2 — online verify-code

- [ ] Hook перед activate при `VENDOR_ADMIN_VERIFY_ENABLED=true`
- [ ] Fail/timeout → warning, local activate allowed
- [ ] `revoked: true` → block activate

### I3 — support chat

- [ ] Director POST `/api/support/messages` → admin integration endpoint
- [ ] Box ID из «О лицензии» → manual PATCH в admin

### I4 — cross-repo checklist

- [ ] Issue code from vendor-admin dev
- [ ] Set same public key in ESC-Promo
- [ ] Activate → modules match
- [ ] Token verify startup + monthly
- [ ] Support roundtrip

---

## Phase 2 (не в MVP)

- [ ] Multi-user RBAC + `/users` CRUD (`VENDOR_ADMIN_SPEC.md` §5.2)
- [ ] `/integrations/activation-callback`
- [ ] `/integrations/instance-heartbeat`
- [ ] Code revoke + deny list
- [ ] Export signed `license.json`
- [ ] Email notifications renewals
- [ ] CSV export sales
- [ ] TOTP for admin

---

## CI / quality gates (после Chunk 0)

- [ ] `pnpm check:no-any` — no `any` in TS
- [ ] `pnpm test:run` — all packages green
- [ ] `pnpm build` — api + web + license-signing
- [ ] PR → `develop` with green CI before merge

---

## Связанные документы

| Документ | Путь |
|----------|------|
| Полное ТЗ admin | `docs/active/VENDOR_ADMIN_SPEC.md` |
| Skeleton + API boundary | `docs/active/ADMIN_SKELETON_SPEC.md` |
| Admin ↔ коробка | `docs/active/VENDOR_INTEGRATION.md` |
| API коробки (референс) | `docs/reference/esc-promo/API_CONTRACT.md` |
| License lifecycle коробки | `docs/reference/esc-promo/BOX_PRODUCT_SPEC.md` |
| Support chat (только ESC-Promo) | `C:\ESC-Promo\docs\active\SUPPORT_CHAT.md` |
| SKU канон (только ESC-Promo) | `C:\ESC-Promo\docs\active\BUSINESS_MODEL.md` |
