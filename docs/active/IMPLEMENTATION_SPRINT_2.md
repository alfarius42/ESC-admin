# План внедрения: Sprint 2 (Chunk 2 → Chunk 3)

> **Статус:** completed (2026-06-29)
> **Дата:** 2026-06-29  
> **Горизонт:** 10 рабочих дней  
> **Цель:** закрыть фундамент API (auth + DB) и реализовать CRUD клиентов и инстансов с lifecycle integration token.  
> **Канон:** [`VENDOR_ADMIN_SPEC.md`](VENDOR_ADMIN_SPEC.md) §8.4–8.5, §10 · [`DEVELOPER_HANDBOOK.md`](DEVELOPER_HANDBOOK.md) · [`TODO.md`](TODO.md)  
> **Предыдущий спринт:** [`IMPLEMENTATION_NEAREST_TASKS.md`](IMPLEMENTATION_NEAREST_TASKS.md) (Chunk 0 → Chunk 1) — закрыт.

---

## 0. Оперативный статус (baseline)

### Уже внедрено (до Sprint 2)

| Chunk | Что готово |
|:-----:|------------|
| 0 | Monorepo, docker, `/status`, `/integrations/verify-instance-token`, skeleton DB |
| 1 | `packages/license-signing` — sign/verify/parse/capabilities + unit tests |
| 2 (partial) | Auth (`/auth/login`, `/auth/me`, `/auth/logout`), `requireAuth`, `db/client.ts`, `001_initial.sql`, `db:migrate`/`db:seed`, `rateLimit`, `pagination`, `cryptoAtRest` |

### Не реализовано (scope Sprint 2)

| Chunk | Что осталось |
|:-----:|--------------|
| 2 | ORM-слой (Drizzle/Knex), smoke auth через живую БД, финализация acceptance |
| 3 | Customers CRUD, Instances CRUD, token display-once, rotate-token, integration tests |

### Целевой результат спринта

После Sprint 2 operator может через API:

1. Залогиниться и работать с защищёнными endpoint'ами.
2. Создать/редактировать клиента (customer).
3. Создать инстанс с integration token (plain token — **один раз**).
4. Ротировать token; старый token → `401 INVALID_INSTANCE_TOKEN` на verify.
5. Вручную задать Box ID (`runtimeInstanceId`) на инстансе.

---

## 1. Scope и границы

### В scope

- Закрытие Chunk 2 (DB/auth hardening).
- Полная реализация Chunk 3 (customers + instances).
- Regression-тесты для `verify-instance-token` после rotate.
- Обновление `DEVELOPER_HANDBOOK.md`, `TODO.md`.

### Вне scope (следующий спринт)

- Chunk 4: boxSales, upsellSales.
- Chunk 5+: priceLists, licenses, codes, web UI.
- Cross-repo тест с ESC-Promo (отдельный чеклист в `TODO.md` § Integration).

---

## 2. Задачи (детально для исполнения)

Каждая задача — атомарный блок для агента/разработчика. Порядок **обязателен** (T1 → T5).

---

### T1 — Закрыть Chunk 2: DB/Auth hardening

**Спека:** `VENDOR_ADMIN_SPEC.md` §5.1, §8.2, §10–§12, §14  
**Ветка:** `feature/chunk-2-auth-db` от актуального `develop`

#### T1.1 ORM / DB client

| # | Действие | Файл / артефакт |
|---|----------|-----------------|
| 1 | Выбрать ORM: **Drizzle chosen** (phased adoption: `auth` + `customers` + `instances`) | `apps/api/src/db/client.ts`, `apps/api/src/db/schema.ts` |
| 2 | Подключить typed queries к таблицам `users`, `customers`, `instances` (минимум для auth + chunk 3) | `apps/api/src/db/` |
| 3 | Убедиться, что migration runner применяет все `.sql` из `apps/api/db/migrations/` | `apps/api/scripts/migrate.ts` |

#### T1.2 Auth — финализация

| # | Действие | Проверка |
|---|----------|----------|
| 1 | `POST /api/v1/auth/login` — email + password, bcrypt cost 12, JWT | 200 + token |
| 2 | `GET /api/v1/auth/me` — `requireAuth` | user object |
| 3 | `POST /api/v1/auth/logout` — 200 ok | envelope |
| 4 | Login **только через БД** (seed admin), без env-fallback | `pnpm db:seed` → login |
| 5 | Protected route без Bearer → `401 UNAUTHORIZED` | supertest |
| 6 | Rate limit на login | 429 при flood |

**Файлы (уже есть — доработать при необходимости):**

- `apps/api/src/modules/auth/authService.ts`
- `apps/api/src/modules/auth/authRepository.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/middleware/rateLimit.ts`

#### T1.3 Seed и migrate

```powershell
corepack pnpm db:up
corepack pnpm db:migrate
corepack pnpm db:seed
```

Ожидание: admin user `admin@vendor.local` создан, пароль выведен один раз в stdout.

#### T1.4 Definition of Done (T1)

- [x] `pnpm test:run` — green
- [x] **Не реализовывать** `/users/*` (Phase 2)

#### T1.5 Промпт для агента

```text
Заверши Chunk 2 в apps/api: стабилизируй db/client + ORM (Drizzle recommended),
проверь auth/login/me/logout только через БД (seed admin), enforce requireAuth,
rate limit на login. Добавь/обнови интеграционные тесты. Прогони test:run и build.
Канон: VENDOR_ADMIN_SPEC.md §5.1, §8.2. Не делать /users/*.
```

---

### T2 — Customers module (Chunk 3.1)

**Спека:** `VENDOR_ADMIN_SPEC.md` §8.4

#### T2.1 Структура модуля

```
apps/api/src/modules/customers/
├── customersRepository.ts   # SQL/ORM
├── customersService.ts      # validation, business rules
├── customersRoutes.ts       # Express router
└── customersValidation.ts   # optional: zod/manual validators
```

Подключить router в `apps/api/src/app.ts` под `/api/v1/customers` с `requireAuth`.

#### T2.2 Endpoints

| Method | Path | Query / Body | Ответ |
|--------|------|--------------|-------|
| GET | `/customers` | `q`, `page`, `limit`, `sort`, `order` | `{ items[], meta }` |
| POST | `/customers` | `legalName`, `inn`, `contactName`, `contactEmail`, `contactPhone`, `notes` | 201 customer |
| GET | `/customers/:id` | — | customer + nested summary |
| PATCH | `/customers/:id` | partial fields | updated customer |

#### T2.3 Валидация

| Поле | Правило | Error |
|------|---------|-------|
| `legalName` | required, min 2 chars | `VALIDATION_ERROR` 400 |
| `inn` | optional; если есть — 10 или 12 digits | `VALIDATION_ERROR` 400 |
| `contactEmail` | optional; email format | `VALIDATION_ERROR` 400 |

#### T2.4 GET `/customers/:id` — nested summary

Response data (по спеке §8.4):

```json
{
  "customer": { },
  "instances": [ ],
  "boxSalesCount": 0,
  "upsellSalesCount": 0,
  "totalRevenueRub": "0.00"
}
```

На этом этапе counts/revenue могут быть `0` если sales-модули ещё не реализованы — главное корректная структура и JOIN к `instances`.

#### T2.5 Тесты

Файл: `apps/api/tests/customers.integration.test.ts`

| Case | Ожидание |
|------|----------|
| POST valid customer | 201 |
| POST invalid inn | 400 VALIDATION_ERROR |
| GET list with q | search by legal_name/inn |
| PATCH partial | 200 |
| GET :id | nested summary shape |

#### T2.6 Definition of Done (T2)

- [x] CRUD customers end-to-end через API
- [x] Envelope `{ success, data, error }` на всех ответах
- [x] Pagination meta на list
- [x] Integration tests green

#### T2.7 Промпт для агента

```text
Реализуй Chunk 3.1 customers в apps/api:
GET /customers (q, page, limit), POST с валидацией legalName/inn,
GET /customers/:id с nested summary, PATCH partial update.
requireAuth на всех routes. Интеграционные тесты customers.integration.test.ts.
Канон: VENDOR_ADMIN_SPEC.md §8.4.
```

---

### T3 — Instances module (Chunk 3.2)

**Спека:** `VENDOR_ADMIN_SPEC.md` §8.5, §8.13 (rotate-token)

#### T3.1 Структура модуля

```
apps/api/src/modules/instances/
├── instancesRepository.ts
├── instancesService.ts
├── instancesRoutes.ts
└── integrationToken.ts      # generate, hash, rotate
```

Расширить или заменить `apps/api/src/db/instancesRepository.ts` — избежать дублирования логики token hash.

#### T3.2 Endpoints

| Method | Path | Особенности |
|--------|------|-------------|
| GET | `/instances` | filters: `q`, `status`, `customerId`, pagination |
| POST | `/instances` | `generateIntegrationToken: true` → display-once |
| GET | `/instances/:id` | instance + licenses (empty ok) + masked codes + sales |
| PATCH | `/instances/:id` | включая `runtimeInstanceId` (Box ID, 24 char) |
| POST | `/integrations/instances/:id/rotate-token` | JWT auth; новый token display-once |

#### T3.3 Integration token lifecycle

| Шаг | Логика |
|-----|--------|
| Generate | `crypto.randomBytes(32)` → base64url plain token |
| Store | `integration_token_hash = sha256(plain)` — **plain не в БД** |
| Create response | Вернуть `integrationToken` + `envSnippet` **только в POST 201** |
| GET detail | **Никогда** не возвращать plain token |
| Rotate | Новый plain + hash; старый hash перезаписан; `integration_token_rotated_at` |

Пример `envSnippet`:

```text
VENDOR_ADMIN_URL=https://admin.example.com
VENDOR_ADMIN_INSTANCE_TOKEN=xK9mP2nQ7...
```

#### T3.4 PATCH `/instances/:id`

Поля (partial):

- `runtimeInstanceId` — Box ID, 24 символа (validation)
- `status` — `planned` \| `deployed` \| `active` \| `grace` \| `expired` \| `decommissioned`
- `hostname`, `deployUrl`, `notes`

#### T3.5 Тесты

Файл: `apps/api/tests/instances.integration.test.ts`

| Case | Ожидание |
|------|----------|
| POST instance + generateIntegrationToken | 201, plain token в response |
| GET instance после create | plain token **отсутствует** |
| PATCH runtimeInstanceId | persisted |
| POST rotate-token | новый token в response |
| verify-instance-token со **старым** token | 401 INVALID_INSTANCE_TOKEN |
| verify-instance-token с **новым** token | 200 tokenValid |

#### T3.6 Definition of Done (T3)

- [x] Create instance → token показан один раз
- [x] Rotate → старый token invalid на verify
- [x] Box ID save через PATCH
- [x] Integration tests green

#### T3.7 Промпт для агента

```text
Реализуй Chunk 3.2 instances в apps/api:
GET/POST/PATCH instances, generateIntegrationToken (display once, hash in DB),
POST /integrations/instances/:id/rotate-token.
PATCH runtimeInstanceId (Box ID). requireAuth на admin routes.
Интеграционные тесты: display-once, rotate invalidates old token.
Канон: VENDOR_ADMIN_SPEC.md §8.5, §8.13.
```

---

### T4 — Regression: verify-instance-token

**Спека:** `ADMIN_SKELETON_SPEC.md` §3.1 · `VENDOR_INTEGRATION.md` §4.3

#### T4.1 Сценарии

| # | Сценарий | HTTP | code |
|---|----------|------|------|
| 1 | Valid token + matching runtimeInstanceId | 200 | tokenValid: true |
| 2 | Missing header | 401 | INVALID_INSTANCE_TOKEN |
| 3 | Wrong token hash | 401 | INVALID_INSTANCE_TOKEN |
| 4 | runtimeInstanceId mismatch | 404 | INSTANCE_NOT_FOUND |
| 5 | instance_status = suspended | 403 | INSTANCE_SUSPENDED |
| 6 | Token after rotate (old) | 401 | INVALID_INSTANCE_TOKEN |

#### T4.2 Timeout

- Integration routes: timeout ≤ 3s (`integrationTimeout.ts`).
- Не добавлять новые periodic endpoints (offline-first).

#### T4.3 Smoke (ручной)

```powershell
corepack pnpm dev:api
corepack pnpm smoke   # scripts/smoke.ps1 — расширить при необходимости
```

#### T4.4 Definition of Done (T4)

- [x] Все ветки ошибок покрыты тестами
- [x] Нет регресса после T3
- [x] `pnpm test:run` green

#### T4.5 Промпт для агента

```text
Добавь regression tests для POST /integrations/verify-instance-token:
valid, 401 bad/missing token, 403 suspended, 404 runtime mismatch,
401 after token rotate. Проверь timeout middleware. Не менять offline-first границу API.
Канон: ADMIN_SKELETON_SPEC.md §3.1.
```

---

### T5 — Документация и quality gates

#### T5.1 Обновить handbook

Файл: `docs/active/DEVELOPER_HANDBOOK.md`

| Раздел | Что обновить |
|--------|--------------|
| §0 Quick lookup | customers/instances modules, auth routes |
| §2 Модули | новые файлы modules/customers, modules/instances |
| §3 API | статус implemented для auth + customers + instances |
| §5 БД | таблицы из `001_initial.sql` |
| §10 Roadmap | Chunk 2 → implemented, Chunk 3 → implemented |
| Шапка | дата 2026-06-29+ |

#### T5.2 Обновить backlog

- `docs/active/TODO.md` — отметить `[x]` по закрытым пунктам Chunk 2/3.
- Сводная таблица прогресса: Chunk 2 ✅, Chunk 3 ✅.

#### T5.3 Quality gates (обязательно перед merge)

```powershell
corepack pnpm check:no-any
corepack pnpm test:run
corepack pnpm build
```

#### T5.4 Definition of Done (Sprint 2)

- [x] T1–T4 выполнены
- [x] Handbook и TODO синхронизированы с кодом
- [ ] CI green на feature-ветке
- [ ] PR в `develop` с test plan

---

## 3. Календарный план (10 дней)

| День | Задача | Результат |
|:----:|--------|-----------|
| 1–2 | T1 | Chunk 2 closed, auth smoke через БД |
| 3–4 | T2 | Customers CRUD + tests |
| 5–7 | T3 | Instances + token lifecycle + tests |
| 8 | T4 | verify-instance-token regression |
| 9 | Buffer | bugfix, edge cases |
| 10 | T5 | docs + quality gates + PR |

---

## 4. Риски и меры

| Риск | Влияние | Мера |
|------|---------|------|
| Дублирование `instancesRepository` (skeleton vs module) | Расхождение token logic | Консолидировать в один repository/service |
| Plain token утекает в GET/logs | Security | Code review: plain только в POST 201 rotate/create |
| ORM choice затягивает спринт | Slip T2/T3 | Минимальный Drizzle schema только для users/customers/instances |
| Handbook не обновлён | Следующий агент ищет вслепую | T5 обязателен в DoD спринта |

---

## 5. Финальный smoke-чеклист (ручной)

```text
[ ] pnpm db:migrate && pnpm db:seed
[ ] POST /auth/login → token
[ ] GET /auth/me → admin user
[ ] POST /customers → 201
[ ] POST /instances (generateIntegrationToken: true) → plain token в ответе
[ ] GET /instances/:id → plain token НЕТ
[ ] POST rotate-token → новый token
[ ] POST verify-instance-token (старый token) → 401
[ ] POST verify-instance-token (новый token) → 200
[ ] PATCH /instances/:id { runtimeInstanceId } → saved
[ ] pnpm test:run && pnpm build — green
```

---

## 6. Следующий спринт (preview)

**Sprint 3 (рекомендация):** Chunk 4 — boxSales + upsellSales + SKU catalog constants.

См. [`TODO.md`](TODO.md) § Chunk 4, [`VENDOR_ADMIN_SPEC.md`](VENDOR_ADMIN_SPEC.md) §8.6–8.7.

---

## 7. Связанные документы

| Документ | Зачем |
|----------|-------|
| [`VENDOR_ADMIN_SPEC.md`](VENDOR_ADMIN_SPEC.md) §8.4–8.5 | API-контракт customers/instances |
| [`ADMIN_SKELETON_SPEC.md`](ADMIN_SKELETON_SPEC.md) §3 | verify-instance-token boundary |
| [`VENDOR_INTEGRATION.md`](VENDOR_INTEGRATION.md) | Token lifecycle, offline-first |
| [`DEVELOPER_HANDBOOK.md`](DEVELOPER_HANDBOOK.md) | Module map (обновлять после кода) |
| [`TODO.md`](TODO.md) | Полный backlog 0–12 |
| [`IMPLEMENTATION_NEAREST_TASKS.md`](IMPLEMENTATION_NEAREST_TASKS.md) | Завершённый Sprint 1 (Chunk 0–1) |
