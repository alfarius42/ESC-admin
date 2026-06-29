# ТЗ: Vendor Admin (Regpoint License & Sales Hub)

> **Статус:** implementation-ready (генерация кодовой базы по этому документу).  
> **Репозиторий:** `regpoint-vendor-admin` (отдельный).  
> **Клиентский продукт:** `ESC-Promo` — только `LICENSE_PUBLIC_KEY` + activate API.  
> **Интеграция и безопасность:** `VENDOR_INTEGRATION.md` (токены, offline/online, deploy VPS/local).  
> **Support chat и Box ID:** `SUPPORT_CHAT.md` (ESC-Promo repo).  
> **Связь (референс коробки):** [`BOX_PRODUCT_SPEC.md`](../reference/esc-promo/BOX_PRODUCT_SPEC.md) §4, `BUSINESS_MODEL.md` (ESC-Promo), [`API_CONTRACT.md`](../reference/esc-promo/API_CONTRACT.md) §2.2–2.3.

---

## 0. Как генерировать с ИИ

**Порядок:** выполнять чанки из §24 последовательно. Каждый чанк — отдельный промпт; прикладывать этот файл целиком или нужный §.

**Правила для генератора:**

1. TypeScript strict, `any` запрещён.
2. Файлы ≤ 1000 строк.
3. Модули изолированы: `packages/license-signing`, `apps/api`, `apps/web`.
4. API-ответы — единый envelope `{ success, data, error }`.
5. Деньги в API — строки `"180000.00"` (2 знака).
6. Даты — ISO 8601 UTC.
7. Подпись кодов — **бит-в-бит** как §17 (совместимость с `ESC-Promo/src/backend/modules/license/service.js`).
8. `LICENSE_PRIVATE_KEY` — только backend vendor-admin, не в frontend bundle.
9. После каждого чанка — `npm run test:run` в соответствующем пакете.
10. **MVP — один user:** только `requireAuth`, без RBAC и `/users` (§5.1).

**Стартовый промпт (Chunk 0):**

```text
Создай monorepo regpoint-vendor-admin по docs/active/VENDOR_ADMIN_SPEC.md:
§14 структура, §15 SQL migration, §18 .env.example, §19 docker-compose, §26 package.json scripts.
Stack: Node 20, Express 4, TS, PostgreSQL 16, React 18, Vite 5, Tailwind v4.
```

---

## 1. Цель и границы

### 1.1 Назначение

Внутренняя система vendor:

- учёт проданных **коробок** (ручной ввод);
- учёт **апсейлов** (ручной ввод);
- **прайс-листы** (ручной ввод + public read API для сайта);
- **генерация и проверка** кодов активации;
- реестр клиентов, инстансов, лицензий, support.

### 1.2 MVP scope

| Блок | MVP |
|------|:---:|
| Auth (single user, role `admin`) | ✅ |
| RBAC multi-role (sales/support/readonly) | ❌ Phase 2 |
| Customers, instances | ✅ |
| box_sales, upsell_sales (CRUD + stats) | ✅ |
| price_lists + import canon + public API | ✅ |
| licenses + activation_codes (issue + verify) | ✅ |
| Dashboard KPI | ✅ |
| Audit log | ✅ |
| Online verify-code (`/integrations/verify-code`) | ✅ |
| Per-instance token (issue at create instance) | ✅ |
| Support chat + Box ID manual link | ✅ |
| Activation callback / heartbeat | ❌ Phase 2 |
| Code revoke | ❌ Phase 2 |

---

## 2. Архитектура

```
regpoint-vendor-admin/
├── packages/
│   └── license-signing/     # sign, verify, parse — shared с ESC-Promo логикой
├── apps/
│   ├── api/                 # Express REST /api/v1
│   └── web/                 # React SPA
├── docker-compose.yml
└── README.md

ESC-Promo/ (клиент)
├── LICENSE_PUBLIC_KEY
├── POST /api/license/activate
└── POST /api/license/activate-pilot
```

**Offline-first на клиенте:** vendor-admin не участвует в runtime-активации (activate всегда локально).  
**Online verify:** опционально, см. `VENDOR_INTEGRATION.md` §4.3.

### 2.4 Развёртывание (VPS / local)

| Режим | URL | Примечание |
|-------|-----|------------|
| VPS prod | `VENDOR_ADMIN_PUBLIC_URL=https://…` | Постоянный IP или домен, HTTPS |
| Local dev | `http://localhost:4000` | Docker compose |
| Staging | внутренний URL | Тот же codebase, другой `.env` |

Коробки получают URL через `VENDOR_ADMIN_URL` в своём `.env` — **не** hardcode в коде.  
Подробности: `VENDOR_INTEGRATION.md` §6.

---

## 3. Стек

| Слой | Технология |
|------|------------|
| Runtime | Node.js 20 |
| API | Express 4, TypeScript 5.3 |
| ORM | Drizzle ORM или Knex (на выбор; схема — §15) |
| DB | PostgreSQL 16 |
| Frontend | React 18, Vite 5, TypeScript, Tailwind v4 |
| Auth | JWT (httpOnly cookie optional; MVP — Bearer header) |
| Password | bcrypt, cost 12 |
| Tests | Vitest (unit), supertest (API) |
| Deploy | Docker Compose на VPS vendor |

---

## 4. Дизайн UI

Согласован с линейкой Регпоинт:

| Token | Значение |
|-------|----------|
| `--color-primary` | `#243954` (Navy) |
| `--color-accent` | `#e1eff2` (Blue-tint) |
| `--font-heading` | Ubuntu |
| `--font-body` | Times New Roman, serif fallback system-ui |
| Sidebar width | 240px |
| Border radius | 8px |

**Layout:** sidebar слева (logo «Regpoint Admin»), header с user menu, content area.

**Компоненты (переиспользуемые):**

- `Button`, `Input`, `Select`, `Textarea`, `Dialog`, `Table`, `Badge`, `Card`, `StatCard`, `PageHeader`, `EmptyState`, `CopyButton`, `ConfirmDialog`, `Toast` (sonner).

**Badge цвета status:**

| status | color |
|--------|-------|
| active / issued | green |
| grace / planned | amber |
| expired / revoked | red |
| draft | gray |

---

## 5. Auth и роли

### 5.1 MVP: один пользователь (2–5 мес.)

Фактически один живой operator (founder). Все операции — sales + support + admin без разделения.

| Аспект | MVP |
|--------|-----|
| Пользователей | 1 (seed из `SEED_ADMIN_*`) |
| Роль в JWT | всегда `admin` |
| RBAC middleware | **не реализовывать** — достаточно `requireAuth` |
| UI `/users` | **не делать** |
| API `/users/*` | **не делать** |
| `sales_user_id` / `issued_by` | текущий user id из JWT |
| Audit log | ✅ (кто = единственный admin) |

**Auth MVP:**

- `POST /auth/login` → JWT
- `GET /auth/me` → user
- Все `/api/v1/*` кроме `/public/*` и `/auth/login` — `requireAuth`

Таблица `users` и enum `user_role` **оставить в миграции** — задел под Phase 2, без UI управления.

### 5.2 Phase 2: RBAC (когда появится 2+ operator)

Включить middleware `rbac(roles[])` и экран `/users`. Матрица доступа:

| Endpoint group | admin | sales | support | readonly |
|----------------|:-----:|:-----:|:-------:|:--------:|
| `/auth/*` | ✅ | ✅ | ✅ | ✅ |
| `/users/*` | ✅ | ❌ | ❌ | ❌ |
| `/customers/*` POST/PATCH | ✅ | ✅ | ❌ | ❌ |
| `/customers/*` GET | ✅ | ✅ | ✅ | ✅ |
| `/instances/*` POST/PATCH | ✅ | ❌ | ✅ | ❌ |
| `/instances/*` GET | ✅ | ✅ | ✅ | ✅ |
| `/box-sales/*` POST/PATCH | ✅ | ✅ | ❌ | ❌ |
| `/box-sales/*` GET, stats | ✅ | ✅ | ✅ | ✅ |
| `/upsell-sales/*` POST/PATCH | ✅ | ✅ | ❌ | ❌ |
| `/upsell-sales/*` GET, stats | ✅ | ✅ | ✅ | ✅ |
| `/price-lists/*` write | ✅ | ❌ | ❌ | ❌ |
| `/price-lists/*` read | ✅ | ✅ | ✅ | ✅ |
| `/licenses/*`, `/codes/*` write | ✅ | ❌ | ✅ | ❌ |
| `/licenses/*`, `/codes/*` read | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/*` | ✅ | ✅ | ✅ | ✅ |
| `/public/*` | public | public | public | public |

---

## 6. Канонический каталог SKU

Seed при `POST /price-lists/import-canon`. Источник: `BUSINESS_MODEL.md`.

### 6.1 Пакеты (box_sales.package_sku)

| SKU | package | modules | title | price_rub | renewal_rub |
|-----|---------|---------|-------|-----------|-------------|
| PKG-POINT | regpoint_point | ["point"] | Рег.Поинт — лицензия | 100000.00 | 35000.00 |
| PKG-PROMO | regpoint_promo | ["promo"] | Рег.Промо — лицензия | null | null |
| PKG-PRO | regpoint_pro | ["pro"] | Рег.Про — лицензия | 180000.00 | 55000.00 |
| PKG-TICKET | regpoint_ticket | ["ticket"] | Рег.Тикет — лицензия | null | null |

`null` price → `price_note: "TBD"`.

### 6.2 Апсейлы (upsell_sales.sku)

| SKU | category | title | price_rub | price_note |
|-----|----------|-------|-----------|------------|
| LIC-UP-PRO-POINT | license_upgrade | Рег.Поинт → Рег.Про | 80000.00 | |
| LIC-UP-PRO-PROMO | license_upgrade | Рег.Промо → Рег.Про | null | TBD |
| LIC-UP-PROMO | license_upgrade | Рег.Поинт → Рег.Промо | null | TBD |
| LIC-INST-2 | license_upgrade | Второй инстанс | null | 50% от лицензии |
| LIC-REISSUE | license_upgrade | Перевыпуск (смена VPS) | 15000.00 | |
| BOX-DEP-01 | deploy | Установка Docker | null | 15000–25000 |
| BOX-DEP-02 | deploy | Turnkey деплой | 45000.00 | |
| BOX-SSL-01 | deploy | HTTPS Let's Encrypt | 12000.00 | |
| BOX-BKP-01 | deploy | Cron-бэкап MySQL | 18000.00 | |
| BOX-MIG-01 | deploy | Миграция данных | null | 25000–45000 |
| BOX-FNS-01 | deploy | Пакет заявки ФНС | null | 15000–35000 |
| DEV-FIELD | dev | Кастомное поле | null | от 35000 |
| DEV-REPORT | dev | Кастомный отчёт | null | от 45000 |
| DEV-WL | dev | White-label | 49000.00 | |
| INT-CRM | dev | Интеграция CRM | null | 80000–150000 |
| INT-1C | dev | Интеграция 1С | null | 120000–200000 |
| INT-EMAIL | dev | Email/SMS | null | 60000–100000 |
| DEV-ONSITE | dev | On-site регистрация | null | от 55000 |
| SUP-TRAIN-2 | support | Обучение 2ч | 12000.00 | |
| SUP-TRAIN-4 | support | Обучение 4ч | 22000.00 | |
| SUP-SLA+ | support | Расширенный SLA | 59000.00 | /год |
| SUP-HOT | support | Приоритетная линия | 39000.00 | /год |
| SUP-AUDIT | support | Аудит compliance | 35000.00 | |
| LEGAL-TPL | legal | Шаблоны согласий | 25000.00 | |
| LEGAL-REVIEW | legal | Ревью блока ПД | 35000.00 | |

### 6.3 Маппинг SKU → modules при генерации addon-кода

| SKU | modules to add |
|-----|----------------|
| LIC-UP-PRO-POINT | ["pro"] |
| LIC-UP-PRO-PROMO | ["pro"] |
| LIC-UP-PROMO | ["promo"] |

---

## 7. Генерация и проверка кодов

### 7.1 Алгоритм (канон ESC-Promo)

```typescript
// packages/license-signing/src/sign.ts
function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function signPayload(payload: ActivationPayload, privateKeyPem: string): string {
  const payloadJson = JSON.stringify(payload); // без лишних пробелов
  const signature = crypto.sign(null, Buffer.from(payloadJson), privateKeyPem).toString('base64');
  return `${base64Url(payloadJson)}.${signature}`;
}
```

### 7.2 ActivationPayload

```typescript
interface ActivationPayload {
  licenseId: string;           // UUID
  package: PackageSlug | null; // regpoint_point | regpoint_promo | regpoint_pro | regpoint_ticket
  modules: ProductModule[];    // point | promo | pro | ticket
  issuedAt: string;            // ISO UTC
  validUntil: string | null;   // ISO UTC; null допустим для pilot-only
  instanceId: string | null;   // 24-char hash; null = bind on first activate
  codeType: CodeType;          // initial | addon | renewal | pilot | reissue
  pilotUntil?: string | null;  // только pilot
}

type ProductModule = 'point' | 'promo' | 'pro' | 'ticket';
type PackageSlug = 'regpoint_point' | 'regpoint_promo' | 'regpoint_pro' | 'regpoint_ticket';
type CodeType = 'initial' | 'addon' | 'renewal' | 'pilot' | 'reissue';
```

### 7.3 Правила генерации (backend service)

| codeType | validUntil default | modules rule | pilotUntil |
|----------|-------------------|--------------|------------|
| initial | sold_at + 365d или license.valid_until | replace | — |
| addon | max(current, incoming) | merge incoming | — |
| renewal | current.valid_until + 365d | unchanged | — |
| pilot | — | default ["point"] if empty | now + 30d |
| reissue | license.valid_until | same as license | — |

**Validation before issue:**

- `initial`: license.status must be `draft` or `issued`; no other `initial` with status `issued|activated`.
- `addon`: license must have active modules; incoming modules not subset of current.
- `renewal`: license.status in (`active`, `grace`, `expired`).
- `pilot`: optional warning if pilot still active; **несколько пилотов подряд разрешены** после истечения предыдущего.
- `reissue`: support confirms `LIC-REISSUE` upsell linked (warning if not).

### 7.4 Сроки кодов (канон)

| codeType | Срок | Авто-refresh |
|----------|------|--------------|
| `initial` | **365 дней** от sold_at | **Нет** — renewal вручную из admin |
| `renewal` | +**365 дней** | **Нет** |
| `pilot` | **30 дней** | **Нет**; отдельное поле «Пилот» на коробке |
| `addon` / `reissue` | по правилам §7.3 | — |

Support отправляет клиенту **summary** (пакет, modules, validUntil, licenseId) + **полный activation code** — см. `VENDOR_INTEGRATION.md` §4.2.

### 7.5 Verify (POST /codes/verify) — admin UI

Steps:

1. `parseActivationEnvelope(code)` — форматы: `b64url(payload).sig`, JSON envelope, plain JSON.
2. `verifySignature(envelope, LICENSE_PUBLIC_KEY)`.
3. Validate modules ⊆ {point, promo, pro, ticket}.
4. Lookup `activation_codes` by `payload.licenseId` + code hash prefix.
5. Collect `warnings[]`:
   - `VALID_UNTIL_PAST`
   - `VALID_UNTIL_WITHIN_30_DAYS`
   - `INSTANCE_ID_MISMATCH`
   - `NOT_REGISTERED_IN_DB`
   - `ALREADY_ACTIVATED`
   - `REVOKED`
   - `ADDON_WITHOUT_BASE_LICENSE`

Response always `200` if parse ok; `valid: false` if signature fail.

### 7.6 Хранение кода

- `activation_code_encrypted` — AES-256-GCM с `CODES_ENCRYPTION_KEY`.
- `code_hash_prefix` — первые 16 символов sha256(code) для lookup.
- Full code показывается **один раз** в UI; API `GET /codes` не возвращает полный код.

---

## 8. API-контракт (полный)

**Base:** `/api/v1`  
**Auth header:** `Authorization: Bearer <jwt>`  
**Content-Type:** `application/json`

### 8.1 Envelope и ошибки

```typescript
interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
}

interface ApiError {
  success: false;
  data: null;
  error: { code: string; message: string; details?: Record<string, string> };
}
```

**Error codes:**

| code | HTTP |
|------|------|
| VALIDATION_ERROR | 400 |
| UNAUTHORIZED | 401 |
| FORBIDDEN | 403 |
| NOT_FOUND | 404 |
| CONFLICT | 409 |
| RATE_LIMITED | 429 |
| INTERNAL_ERROR | 500 |

**Pagination** (list endpoints):

Query: `?page=1&limit=20&sort=created_at&order=desc`  
Response meta:

```json
{ "items": [], "meta": { "page": 1, "limit": 20, "total": 142, "totalPages": 8 } }
```

---

### 8.2 Auth

#### POST `/auth/login`

Request:

```json
{ "email": "admin@vendor.local", "password": "..." }
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "expiresAt": "2026-06-29T12:00:00.000Z",
    "user": {
      "id": "uuid",
      "email": "admin@vendor.local",
      "displayName": "Admin",
      "role": "admin"
    }
  },
  "error": null
}
```

#### GET `/auth/me`

Response: `{ user }` as above without token.

#### POST `/auth/logout`

Response `200`: `{ "success": true, "data": { "ok": true } }`.

---

### 8.3 Users — Phase 2

> **MVP:** endpoint'ы не реализовывать. Один user из seed.

#### GET `/users` — Phase 2

#### POST `/users` — Phase 2

```json
{
  "email": "sales@vendor.local",
  "password": "min8chars",
  "displayName": "Sales",
  "role": "sales"
}
```

#### PATCH `/users/:id` — Phase 2

```json
{ "displayName": "...", "role": "support", "isActive": true }
```

---

### 8.4 Customers

#### GET `/customers`

Query: `q` (search legal_name, inn, email), `page`, `limit`.

#### POST `/customers`

```json
{
  "legalName": "ООО Пример",
  "inn": "7701234567",
  "contactName": "Иван Иванов",
  "contactEmail": "ivan@example.com",
  "contactPhone": "+79001234567",
  "notes": ""
}
```

Validation: `legalName` required, min 2 chars; `inn` optional, 10 or 12 digits.

#### GET `/customers/:id`

Response includes nested summary:

```json
{
  "customer": { },
  "instances": [ ],
  "boxSalesCount": 2,
  "upsellSalesCount": 3,
  "totalRevenueRub": "325000.00"
}
```

#### PATCH `/customers/:id`

Partial update same fields.

---

### 8.5 Instances

#### GET `/instances`

Query: `q` (instance_id, hostname, deploy_url, customer name), `status`, `customerId`.

#### POST `/instances`

```json
{
  "customerId": "uuid",
  "hostname": "promo.client.ru",
  "deployUrl": "https://promo.client.ru",
  "status": "planned",
  "notes": "",
  "generateIntegrationToken": true
}
```

Response `201` includes **once**:

```json
{
  "instance": { "id": "uuid", "..." : "..." },
  "integrationToken": "xK9mP2nQ7...display-once",
  "envSnippet": "VENDOR_ADMIN_URL=https://admin.example.com\nVENDOR_ADMIN_INSTANCE_TOKEN=xK9mP2..."
}
```

#### GET `/instances/:id`

Response: instance + licenses[] + recent codes (masked) + boxSales + upsellSales.

#### PATCH `/instances/:id`

```json
{
  "instanceId": "a1b2c3d4e5f6g7h8i9j0k1l2",
  "status": "active",
  "hostname": "...",
  "deployUrl": "...",
  "notes": "..."
}
```

---

### 8.6 Box sales

#### GET `/box-sales`

Query: `from`, `to` (sold_at dates), `packageSku`, `customerId`, `page`, `limit`.

#### POST `/box-sales`

```json
{
  "customerId": "uuid",
  "instanceId": null,
  "packageSku": "PKG-PRO",
  "modules": ["pro"],
  "listPriceRub": "180000.00",
  "soldPriceRub": "175000.00",
  "soldAt": "2026-06-15",
  "contractRef": "СЧ-2026-042",
  "notes": ""
}
```

Side effect (optional): auto-create `instances` with status `planned` if `instanceId` null and checkbox `createInstance: true`.

#### GET `/box-sales/stats`

Query: `from`, `to`.

Response:

```json
{
  "totalCount": 10,
  "revenueRub": "1290000.00",
  "byPackage": [
    { "packageSku": "PKG-POINT", "count": 5, "revenueRub": "500000.00" },
    { "packageSku": "PKG-PRO", "count": 3, "revenueRub": "540000.00" }
  ],
  "avgSoldPriceRub": "129000.00"
}
```

#### PATCH `/box-sales/:id`

Partial update; link `licenseId`, `instanceId`.

---

### 8.7 Upsell sales

#### GET `/upsell-sales`

Query: `from`, `to`, `sku`, `skuCategory`, `customerId`.

#### POST `/upsell-sales`

```json
{
  "customerId": "uuid",
  "instanceId": null,
  "sku": "BOX-DEP-02",
  "skuCategory": "deploy",
  "title": "Turnkey деплой",
  "listPriceRub": "45000.00",
  "soldPriceRub": "45000.00",
  "soldAt": "2026-06-20",
  "linkedBoxSaleId": null,
  "contractRef": "",
  "notes": ""
}
```

#### GET `/upsell-sales/stats`

```json
{
  "totalCount": 15,
  "revenueRub": "280000.00",
  "byCategory": [
    { "skuCategory": "deploy", "count": 8, "revenueRub": "120000.00" }
  ],
  "bySku": [
    { "sku": "BOX-DEP-02", "count": 3, "revenueRub": "135000.00" }
  ]
}
```

---

### 8.8 Price lists

#### GET `/price-lists`

#### POST `/price-lists`

```json
{
  "title": "Прайс 2026",
  "effectiveFrom": "2026-01-01",
  "effectiveUntil": null,
  "isPublished": false,
  "currency": "RUB"
}
```

Rule: only one `isPublished=true` at a time; publishing others auto-unpublishes previous.

#### GET `/price-lists/:id`

Includes `items[]`.

#### POST `/price-lists/:id/items`

```json
{
  "sku": "PKG-POINT",
  "itemType": "package",
  "title": "Рег.Поинт — лицензия",
  "priceRub": "100000.00",
  "priceNote": null,
  "modules": ["point"],
  "subscriptionRenewalRub": "35000.00",
  "sortOrder": 10
}
```

#### POST `/price-lists/import-canon`

Creates new draft price list from §6 or fills current draft. Admin only.

Response: `{ priceListId, itemsCreated: 28 }`.

#### GET `/price-lists/current` (authenticated)

Same shape as public but includes unpublished preview for admin.

---

### 8.9 Licenses

#### POST `/licenses`

```json
{
  "instanceId": "uuid",
  "package": "regpoint_pro",
  "modules": ["pro"],
  "validFrom": "2026-06-15",
  "validUntil": "2027-06-14",
  "subscriptionYear": 1,
  "boxSaleId": "uuid-or-null"
}
```

Creates license with status `draft`.

#### GET `/licenses/:id`

#### POST `/licenses/:id/codes`

```json
{
  "codeType": "initial",
  "modules": ["pro"],
  "validUntil": "2027-06-14T23:59:59.000Z",
  "targetInstanceId": null,
  "pilotUntil": null
}
```

Response `201`:

```json
{
  "codeId": "uuid",
  "activationCode": "eyJ...long...signature",
  "payload": { "licenseId": "...", "codeType": "initial", "modules": ["pro"], "validUntil": "..." },
  "displayOnce": true,
  "emailTemplate": "Здравствуйте!\n\nКод активации Регпоинт:\n\n{code}\n\nСрок: до {validUntil}\n\nSupport: support@vendor.local"
}
```

Side effects:

- Insert `activation_codes`.
- Update license.status → `issued`.
- Audit log `CODE_ISSUED`.

#### GET `/codes`

Query: `licenseId`, `codeType`, `status`, `page`.

Response items:

```json
{
  "id": "uuid",
  "licenseId": "uuid",
  "codeType": "initial",
  "modules": ["pro"],
  "status": "issued",
  "codeHashPrefix": "a3f2b1c9",
  "issuedAt": "...",
  "activatedAt": null,
  "issuedBy": { "id": "...", "displayName": "Support" }
}
```

#### POST `/codes/verify`

Request: `{ "activationCode": "..." }`

Response: см. §7.4.

#### POST `/codes/:id/mark-activated` (support)

Manual mark when callback недоступен:

```json
{ "instanceId": "a1b2c3...", "activatedAt": "2026-06-28T11:00:00.000Z" }
```

---

### 8.10 Dashboard

#### GET `/dashboard/summary`

Query: `from`, `to` (default: current calendar year).

```json
{
  "boxSales": { "count": 10, "revenueRub": "1290000.00" },
  "upsellSales": { "count": 15, "revenueRub": "280000.00" },
  "totalRevenueRub": "1570000.00",
  "packageMix": [
    { "packageSku": "PKG-POINT", "sharePercent": 50 }
  ],
  "renewalsDue": {
    "within30Days": [ { "licenseId": "...", "customerName": "...", "validUntil": "..." } ],
    "within14Days": [],
    "within7Days": [],
    "expiredGrace": []
  },
  "activeInstances": 8,
  "plannedInstances": 2
}
```

---

### 8.11 Public API (website)

**Base:** `/api/v1/public`  
**Auth:** optional header `X-Website-Key: ${WEBSITE_PRICE_API_KEY}` if env set.

#### GET `/public/price-list/current`

#### GET `/public/packages`

Simplified: only `itemType=package`.

CORS: `PUBLIC_CORS_ORIGINS=https://regpoint.ru,https://www.regpoint.ru`  
Headers: `Cache-Control: public, max-age=3600`.

---

### 8.12 Health

#### GET `/status`

Plain text:

```text
status: OK
database_status: OK
signing_status: OK
```

#### GET `/status/health`

Returns 200 only if DB ok; 503 otherwise.

---

### 8.13 Integration API (коробка → vendor-admin)

> Полная модель: `VENDOR_INTEGRATION.md`.  
> **Per-instance token** выпускает vendor-admin при создании инстанса; support копирует в `.env` коробки.

#### POST `/integrations/verify-code` — **MVP**

Header: `X-Instance-Token: <plain-token-from-admin>`

```json
{
  "activationCode": "eyJ...signature",
  "runtimeInstanceId": "a1b2c3d4e5f6g7h8i9j0k1l2"
}
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "valid": true,
    "registered": true,
    "revoked": false,
    "codeType": "initial",
    "licenseId": "uuid",
    "validUntil": "2027-06-14T23:59:59.000Z",
    "modules": ["pro"],
    "warnings": []
  },
  "error": null
}
```

Errors: `401 INVALID_INSTANCE_TOKEN`, `404 INSTANCE_NOT_FOUND`.

**Коробка:** best-effort, timeout 3s; offline activate при недоступности admin — см. `VENDOR_INTEGRATION.md` §4.3.

#### POST `/integrations/instances/:id/rotate-token` — MVP

Admin UI: rotate integration token → display once.

---

### 8.14 Integration API (Phase 2)

#### POST `/integrations/activation-callback`

Header: `X-Instance-Token: <same per-instance token>`

```json
{
  "instanceId": "a1b2c3...",
  "licenseId": "uuid",
  "codeType": "initial",
  "modules": ["pro"],
  "activatedAt": "2026-06-28T11:00:00.000Z"
}
```

#### POST `/integrations/instance-heartbeat`

Header: `X-Instance-Token: <secret>`

```json
{
  "instanceId": "a1b2c3...",
  "licenseId": "uuid",
  "productVersion": "1.0.0",
  "licenseStatus": "active",
  "validUntil": "2027-06-14",
  "modules": ["pro"],
  "reportedAt": "2026-06-28T10:00:00.000Z"
}
```

**ESC-Promo hook (Phase 2):** после `activateByCode` в `license/service.js` — см. `VENDOR_INTEGRATION.md` §4.4.

---

### 8.15 Support chat и Box ID — **MVP**

> Канон: **`SUPPORT_CHAT.md`**. Admin видит **Box ID + компания** в inbox; Box ID вводится **вручную** на карточке инстанса, затем сопоставляется с thread чата.

#### Integration (коробка → admin)

| Method | Path | Auth |
|--------|------|------|
| POST | `/integrations/support/messages` | `X-Instance-Token` |
| GET | `/integrations/support/messages` | `X-Instance-Token` |

#### Admin inbox

| Method | Path | Auth |
|--------|------|------|
| GET | `/support/threads` | JWT |
| GET | `/support/threads/:threadId/messages` | JWT |
| POST | `/support/threads/:threadId/messages` | JWT |
| PATCH | `/support/threads/:threadId/link` | JWT — ручная привязка Box ID ↔ instance/customer |
| PATCH | `/support/threads/:threadId` | JWT — close thread |

**Inbox row (обязательные поля UI):** `runtimeInstanceId`, `customer.legalName`, `lastMessagePreview`, `isLinked`.

**PATCH `/instances/:id`** — поле `runtimeInstanceId` (Box ID) **ручной ввод**; после сохранения thread с тем же Box ID показывает компанию.

---

### 9.1 Routes

| Path | Page | MVP access |
|------|------|------------|
| `/login` | LoginPage | public |
| `/` | DashboardPage | auth |
| `/customers` | CustomersListPage | auth |
| `/customers/new` | CustomerFormPage | auth |
| `/customers/:id` | CustomerDetailPage | auth |
| `/customers/:id/edit` | CustomerFormPage | auth |
| `/instances` | InstancesListPage | auth |
| `/instances/:id` | InstanceDetailPage | auth |
| `/sales/boxes` | BoxSalesListPage | auth |
| `/sales/boxes/new` | BoxSaleFormPage | auth |
| `/sales/upsells` | UpsellSalesListPage | auth |
| `/sales/upsells/new` | UpsellSaleFormPage | auth |
| `/pricing` | PriceListsPage | auth |
| `/pricing/:id` | PriceListDetailPage | auth |
| `/licenses/:id/issue-code` | IssueCodeWizardPage | auth |
| `/codes/verify` | VerifyCodePage | auth |
| `/support/lookup` | SupportLookupPage | auth |
| `/support` | SupportInboxPage | auth |
| `/support/:threadId` | SupportThreadPage | auth |
| `/users` | UsersPage | **Phase 2** |

### 9.2 Экраны — поля форм

#### BoxSaleFormPage

| Field | Type | Source |
|-------|------|--------|
| customerId | select/search | GET /customers |
| packageSku | select | current price list packages |
| modules | readonly chips | auto from SKU |
| listPriceRub | readonly | auto from price list |
| soldPriceRub | number input | manual |
| soldAt | date | default today |
| contractRef | text | manual |
| createInstance | checkbox | default true |
| notes | textarea | |

Submit → POST `/box-sales` → toast → redirect `/sales/boxes`.

#### UpsellSaleFormPage

| Field | Type |
|-------|------|
| customerId | select |
| sku | autocomplete from price list |
| title | auto from SKU, editable |
| skuCategory | auto |
| listPriceRub | auto |
| soldPriceRub | manual |
| soldAt | date |
| linkedBoxSaleId | optional select |
| contractRef | text |

#### InstanceDetailPage (Box ID)

| Field | Type | Note |
|-------|------|------|
| customer | readonly link | Компания |
| runtimeInstanceId | text input | **Box ID — ручной ввод** (24 символа) |
| status | select | planned / deployed / active / … |
| integrationToken | display once / rotate | см. §8.13 |
| tab «Чат» | thread | header: Box ID + company |

#### SupportInboxPage

Колонки: **Box ID** | **Компания** | preview | updated | badge `unlinked` если нет customer.

#### IssueCodeWizardPage (3 steps)

1. **License:** select existing or create from box_sale.
2. **Type:** initial | addon | renewal | pilot | reissue — show rules tooltip.
3. **Confirm:** modules, validUntil (editable), preview payload → Issue → modal with code + CopyButton + email template.

#### VerifyCodePage

- Textarea paste code.
- Button «Проверить».
- Result card: valid badge, payload JSON pretty, warnings list, link to license/customer if registered.

#### SupportLookupPage

- Single search input: instance_id | INN | email | customer name.
- Results tabs: Customer | Instances | Licenses | Codes | Sales.

#### DashboardPage

- Row of 4 StatCards: Boxes sold, Upsells sold, Total revenue, Active instances.
- Chart: package mix (simple bar, no external lib — CSS bars ok).
- Table: renewals due 30/14/7 days.

---

## 10. SQL migration (001_initial.sql)

```sql
-- regpoint-vendor-admin migration 001
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('admin', 'sales', 'support', 'readonly');
CREATE TYPE instance_status AS ENUM ('planned', 'deployed', 'active', 'grace', 'expired', 'decommissioned');
CREATE TYPE license_status AS ENUM ('draft', 'issued', 'active', 'grace', 'expired', 'revoked');
CREATE TYPE code_type AS ENUM ('initial', 'addon', 'renewal', 'pilot', 'reissue');
CREATE TYPE code_status AS ENUM ('issued', 'activated', 'expired', 'revoked');
CREATE TYPE sku_category AS ENUM ('license_upgrade', 'deploy', 'dev', 'support', 'legal', 'other');
CREATE TYPE price_item_type AS ENUM ('package', 'upsell', 'subscription_renewal');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  user_role user_role NOT NULL DEFAULT 'readonly',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name VARCHAR(500) NOT NULL,
  inn VARCHAR(12),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_customers_legal_name ON customers (legal_name);
CREATE INDEX idx_customers_inn ON customers (inn);

CREATE TABLE instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  runtime_instance_id VARCHAR(24),
  hostname VARCHAR(255),
  deploy_url VARCHAR(500),
  integration_token_hash VARCHAR(64),
  integration_token_issued_at TIMESTAMPTZ,
  integration_token_rotated_at TIMESTAMPTZ,
  instance_status instance_status NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_instances_runtime_id ON instances (runtime_instance_id);
CREATE INDEX idx_instances_customer ON instances (customer_id);

CREATE TABLE price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  effective_from DATE NOT NULL,
  effective_until DATE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  currency CHAR(3) NOT NULL DEFAULT 'RUB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  item_type price_item_type NOT NULL,
  title VARCHAR(500) NOT NULL,
  price_rub NUMERIC(12,2),
  price_note VARCHAR(255),
  modules TEXT[] NOT NULL DEFAULT '{}',
  subscription_renewal_rub NUMERIC(12,2),
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (price_list_id, sku)
);

CREATE TABLE box_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,
  license_id UUID,
  package_sku VARCHAR(50) NOT NULL,
  modules TEXT[] NOT NULL,
  list_price_rub NUMERIC(12,2) NOT NULL,
  sold_price_rub NUMERIC(12,2) NOT NULL,
  sold_at DATE NOT NULL,
  contract_ref VARCHAR(100),
  sales_user_id UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_box_sales_sold_at ON box_sales (sold_at);
CREATE INDEX idx_box_sales_customer ON box_sales (customer_id);

CREATE TABLE upsell_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,
  sku VARCHAR(50) NOT NULL,
  sku_category sku_category NOT NULL,
  title VARCHAR(500) NOT NULL,
  list_price_rub NUMERIC(12,2) NOT NULL,
  sold_price_rub NUMERIC(12,2) NOT NULL,
  sold_at DATE NOT NULL,
  contract_ref VARCHAR(100),
  sales_user_id UUID NOT NULL REFERENCES users(id),
  linked_box_sale_id UUID REFERENCES box_sales(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_upsell_sales_sold_at ON upsell_sales (sold_at);

CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE RESTRICT,
  package_slug VARCHAR(50) NOT NULL,
  modules TEXT[] NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  subscription_year INT NOT NULL DEFAULT 1,
  license_status license_status NOT NULL DEFAULT 'draft',
  box_sale_id UUID REFERENCES box_sales(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_licenses_instance ON licenses (instance_id);

ALTER TABLE box_sales
  ADD CONSTRAINT fk_box_sales_license
  FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE SET NULL;

CREATE TABLE activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE RESTRICT,
  code_type code_type NOT NULL,
  modules TEXT[] NOT NULL,
  valid_until TIMESTAMPTZ,
  pilot_until TIMESTAMPTZ,
  target_instance_id VARCHAR(24),
  activation_code_encrypted TEXT NOT NULL,
  code_hash_prefix VARCHAR(16) NOT NULL,
  payload_json JSONB NOT NULL,
  issued_by UUID NOT NULL REFERENCES users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  code_status code_status NOT NULL DEFAULT 'issued'
);
CREATE INDEX idx_activation_codes_license ON activation_codes (license_id);
CREATE INDEX idx_activation_codes_hash ON activation_codes (code_hash_prefix);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  diff_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_log_created ON audit_log (created_at DESC);

CREATE TYPE support_thread_status AS ENUM ('open', 'closed');
CREATE TYPE support_sender_type AS ENUM ('director', 'vendor');

CREATE TABLE support_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runtime_instance_id VARCHAR(24) NOT NULL,
  instance_id UUID REFERENCES instances(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  thread_status support_thread_status NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ,
  last_message_preview VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_support_threads_runtime_id ON support_threads (runtime_instance_id);
CREATE INDEX idx_support_threads_customer ON support_threads (customer_id);
CREATE UNIQUE INDEX idx_support_threads_open_runtime ON support_threads (runtime_instance_id)
  WHERE thread_status = 'open';

CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  sender_type support_sender_type NOT NULL,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_display_name VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_support_messages_thread ON support_messages (thread_id, created_at DESC);
```

### 10.1 Seed (002_seed_admin.sql)

Seed script `apps/api/scripts/seed.ts`:

1. Generate **random password** (`crypto.randomBytes` → readable 16 chars) unless `SEED_ADMIN_PASSWORD` set (dev only).
2. bcrypt hash → insert admin user.
3. Print email + password + URL **once** to stdout (not logged to file).
4. Call import-canon for price list «Прайс 2026».

```text
=== Vendor Admin seeded ===
Email:    admin@vendor.local
Password: <random — SAVE NOW>
URL:      ${VENDOR_ADMIN_PUBLIC_URL}
```

---

## 11. Структура репозитория (§14)

```
regpoint-vendor-admin/
├── package.json                 # workspaces
├── pnpm-workspace.yaml
├── docker-compose.yml
├── .env.example
├── README.md
├── packages/
│   └── license-signing/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts
│       │   ├── base64url.ts
│       │   ├── sign.ts
│       │   ├── verify.ts
│       │   ├── parse.ts
│       │   └── capabilities.ts
│       └── tests/
│           ├── sign.test.ts
│           └── verify.test.ts
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── app.ts
│   │   │   ├── config/environment.ts
│   │   │   ├── db/
│   │   │   │   ├── client.ts
│   │   │   │   └── migrations/
│   │   │   │       ├── 001_initial.sql
│   │   │   │       └── 002_seed.sql
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts          # requireAuth (MVP)
│   │   │   │   ├── rbac.ts          # Phase 2 — stub или не создавать
│   │   │   │   ├── errorHandler.ts
│   │   │   │   └── rateLimit.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── customers/
│   │   │   │   ├── instances/
│   │   │   │   ├── boxSales/
│   │   │   │   ├── upsellSales/
│   │   │   │   ├── priceLists/
│   │   │   │   ├── licenses/
│   │   │   │   ├── codes/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── public/
│   │   │   │   └── audit/
│   │   │   └── utils/
│   │   │       ├── apiResponse.ts
│   │   │       ├── pagination.ts
│   │   │       └── cryptoAtRest.ts
│   │   ├── scripts/
│   │   │   ├── migrate.ts
│   │   │   └── seed.ts
│   │   └── tests/
│   │       ├── codes.integration.test.ts
│   │       └── boxSales.integration.test.ts
│   └── web/
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       ├── Dockerfile
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── api/
│       │   │   ├── client.ts
│       │   │   └── controllers/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── pages/
│       │   ├── layouts/
│       │   │   └── AppLayout.tsx
│       │   ├── routes/
│       │   │   └── index.tsx
│       │   ├── constants/
│       │   │   └── environment.ts
│       │   └── styles/
│       │       └── index.css
│       └── tests/
└── docs/
    └── API.md                   # автоген или копия §8
```

---

## 12. Environment (.env.example)

```bash
# apps/api
NODE_ENV=development
PORT=4000
VENDOR_ADMIN_PUBLIC_URL=http://localhost:4000
DATABASE_URL=postgresql://vendor:vendor@localhost:5433/regpoint_vendor
JWT_SECRET=change-me-min-32-chars
JWT_EXPIRES_IN=24h

# Signing (NEVER commit real keys)
LICENSE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
CODES_ENCRYPTION_KEY=32-byte-hex-or-base64-for-aes-256

# Public website API
WEBSITE_PRICE_API_KEY=
PUBLIC_CORS_ORIGINS=http://localhost:5174,https://regpoint.ru

# Phase 2 integration
INTEGRATION_CALLBACK_SECRET=

# Seed (password generated random if SEED_ADMIN_PASSWORD unset)
SEED_ADMIN_EMAIL=admin@vendor.local
# SEED_ADMIN_PASSWORD=  # dev only — prod leave unset

# apps/web
VITE_API_URL=http://localhost:4000/api/v1
```

**Generate keypair:**

```bash
openssl genpkey -algorithm ed25519 -out license-private.pem
openssl pkey -in license-private.pem -pubout -out license-public.pem
```

> Если ESC-Promo использует RSA (crypto.sign default) — **использовать RSA 4096** в обоих репо; алгоритм должен совпадать. Текущий `issue-license.js` — Node `crypto.sign(null, ...)` (RSA-PSS или RSA зависит от ключа). При генерации: `openssl genrsa -out license-private.pem 4096`.

---

## 13. Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: vendor
      POSTGRES_PASSWORD: vendor
      POSTGRES_DB: regpoint_vendor
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vendor"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: ./apps/api
    ports:
      - "4000:4000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy

  web:
    build: ./apps/web
    ports:
      - "5174:80"
    depends_on:
      - api

volumes:
  pgdata:
```

---

## 14. package.json (root scripts)

```json
{
  "name": "regpoint-vendor-admin",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "test:run": "pnpm -r test:run",
    "check:no-any": "pnpm -r check:no-any",
    "db:migrate": "pnpm --filter @regpoint/vendor-api db:migrate",
    "db:seed": "pnpm --filter @regpoint/vendor-api db:seed",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down"
  }
}
```

---

## 15. packages/license-signing — exports

```typescript
// packages/license-signing/src/index.ts
export { signPayload, buildActivationCode } from './sign';
export { verifyEnvelope, verifyActivationCode } from './verify';
export { parseActivationEnvelope } from './parse';
export { deriveCapabilities } from './capabilities';
export type { ActivationPayload, ActivationEnvelope, ProductModule, CodeType, PackageSlug } from './types';
```

**deriveCapabilities** — копия логики из `ESC-Promo/src/backend/modules/license/service.js` §deriveCapabilities.

**Tests обязательны:**

1. sign → verify roundtrip.
2. Generated code activates on ESC-Promo test harness (integration doc in README).
3. parse all 3 envelope formats.

---

## 16. Бизнес-сценарии (E2E flows)

### Flow A: Первая продажа коробки

> MVP: все шаги выполняет один operator (founder).

1. POST `/customers` → POST `/box-sales` (PKG-PRO, createInstance=true).
2. POST `/licenses` (link boxSaleId) → POST `/licenses/:id/codes` (initial).
3. Copy code → клиент director UI → ESC-Promo `POST /api/license/activate`.
4. PATCH `/instances/:id` { runtime_instance_id, status: active } или Phase 2 callback.

### Flow B: Апгрейд Point → Pro

1. POST `/upsell-sales` (LIC-UP-PRO-POINT).
2. POST `/licenses/:id/codes` { codeType: addon, modules: ["pro"] }.
3. Client activate → modules merge to ["point","pro"] or ["pro"] per payload.

### Flow C: Renewal Y2

1. Dashboard shows renewal within 30 days.
2. Записать оплату renewal (note на customer или upsell).
3. POST `/licenses/:id/codes` { codeType: renewal, validUntil: +365d }.

### Flow D: Pilot

1. POST `/licenses/:id/codes` { codeType: pilot, pilotUntil: +30d, modules: ["point"] }.
2. Client: `POST /api/license/activate-pilot`.

### Flow F: Support chat + Box ID

1. Admin: customer + instance (company linked); Box ID empty.
2. Director: activate → copy Box ID from «О лицензии».
3. Admin: PATCH instance — ввести Box ID вручную.
4. Director: POST `/api/support/messages` → admin inbox shows **Box ID + ООО Пример**.
5. Admin reply → director sees message on `/support`.

---

## 17. Тесты (минимум MVP)

| File | Cases |
|------|-------|
| `license-signing/sign.test.ts` | roundtrip, invalid key |
| `api/tests/codes.integration.test.ts` | issue initial, verify valid, duplicate initial blocked |
| `api/tests/boxSales.integration.test.ts` | create sale, stats count |
| `api/tests/priceLists.integration.test.ts` | import-canon, publish single |
| `api/tests/support.integration.test.ts` | post message, link thread, inbox shows company |
| `web` smoke | login → dashboard; support inbox columns |

**Cross-repo test (manual checklist):**

1. Issue code from vendor-admin dev.
2. Set same `LICENSE_PUBLIC_KEY` in ESC-Promo backend.
3. `POST /api/license/activate` → status active, modules match.

---

## 18. План генерации чанками (§24)

| Chunk | Промпт | Результат |
|-------|--------|-----------|
| 0 | §0 стартовый | monorepo skeleton, docker, migrate |
| 1 | «Реализуй packages/license-signing по §7, §15» | signing package + tests |
| 2 | «Реализуй apps/api: config, db, middleware, auth по §5.1, §8.2, §12» | login + requireAuth |
| 3 | «Модули customers, instances по §8.4–8.5, §9 routes» | CRUD |
| 4 | «Модули boxSales, upsellSales по §8.6–8.7, §6 catalog» | sales CRUD + stats |
| 5 | «Модули priceLists по §8.8, import-canon §6» | pricing |
| 6 | «Модули licenses, codes по §7–8.9» | issue + verify |
| 7 | «dashboard, public API, status, support chat §8.15» | KPI + verify + support API |
| 8 | «apps/web: layout, auth, api client §9, §4 design» | shell |
| 9 | «pages: dashboard, customers, sales, instance Box ID §9.2» | sales UI |
| 10 | «pages: pricing, codes, SupportInbox §9» | support UI |
| 11 | «audit log, support chat e2e» | hardening |
| 12 | «README + SUPPORT_CHAT.md Flow» | docs |

---

## 19. Критерии приёмки MVP

1. `pnpm docker:up && pnpm db:migrate && pnpm db:seed && pnpm dev` — UI на `:5174`, API на `:4000`.
2. Login admin → dashboard with zero stats.
3. Import canon → 28+ price items.
4. Create customer → box sale → license → initial code.
5. Verify code → `valid: true`.
6. Same code activates ESC-Promo dev instance.
7. Box/upsell stats match manual entries.
8. `GET /public/price-list/current` returns published list.
9. `LICENSE_PRIVATE_KEY` not in web bundle (`grep -r PRIVATE apps/web/dist` empty).
10. `pnpm test:run` green.
11. Manual Box ID on instance → inbox shows **Box ID + company**; chat roundtrip director ↔ admin.

---

## 20. Phase 2 backlog (не генерировать в MVP)

- Multi-user RBAC + `/users` CRUD (§5.2)
- `/integrations/activation-callback`
- `/integrations/instance-heartbeat`
- Code revoke + deny list
- Export signed `license.json`
- Email notifications renewals
- CSV export sales
- TOTP for admin

---

## 21. Связанные документы

| Документ | Связь |
|----------|-------|
| [`BOX_PRODUCT_SPEC.md`](../reference/esc-promo/BOX_PRODUCT_SPEC.md) §4 | License format, lifecycle |
| `BUSINESS_MODEL.md` §3–§5 | SKU, prices (ESC-Promo repo) |
| [`API_CONTRACT.md`](../reference/esc-promo/API_CONTRACT.md) §2.2 | Client activate API |
| `VENDOR_INTEGRATION.md` | Admin ↔ box: tokens, verify |
| `SUPPORT_CHAT.md` | Support chat + Box ID (ESC-Promo repo) |
| [`ARCHITECTURE.md`](../reference/esc-promo/ARCHITECTURE.md) §5.4 | Trust boundary |
| `ESC-Promo/src/backend/modules/license/service.js` | Client activate logic |
| `ESC-Promo/src/backend/scripts/issue-license.js` | Legacy CLI to replace |

---

## 22. Зафиксированные решения

| # | Решение |
|---|---------|
| 1 | Monorepo pnpm workspaces |
| 2 | Деньги API: decimal string `"180000.00"` |
| 3 | Full code: encrypted at rest, show once |
| 4 | Телеметрия: Phase 2 |
| 5 | ORM: Drizzle recommended |
| 6 | Key algorithm: RSA 4096 (совместимость с текущим issue-license.js) |
| 7 | MVP: один user (`admin`), без RBAC middleware и `/users` UI |
| 8 | Per-instance token выпускает vendor-admin; коробка — optional verify |
| 9 | Deploy: один codebase, `VENDOR_ADMIN_PUBLIC_URL` для VPS или local |
| 10 | Support chat: vendor-admin source of truth; Box ID manual link; см. `SUPPORT_CHAT.md` |
