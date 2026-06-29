# Жёсткий API-контракт Regpoint (Регпоинт)

> **Статус:** канонический контракт API (обязателен).  
> **Линейка:** бренд **Регпоинт**, модули — **`PRODUCT_LINE.md`**.  
> **Основание:** фактические роуты `src/backend/routes/*.js` + frontend API-слой `src/api/*.ts`.  
> **Версионирование на текущем этапе:** без `/v1`, базовый префикс только `/api`.

---

## 1) Правила контракта (MUST)

- Все клиентские запросы идут только через `/api/*`.
- Фронтенд использует только `src/api/*` и hooks; прямые `fetch` к backend в страницах запрещены.
- Любой новый endpoint документируется в этом файле **до/вместе** с реализацией.
- Ошибки пока фиксируются по факту: `success: false` + `message` (без обязательного `error.code`).
- Breaking change контракта допускается только через отдельное согласование и обновление документации.
- Публичные endpoints размещаются только в namespace `/api/public/*`.
- Реализация публичных routes допускается только в `src/backend/routes/public/*`.
- Добавление публичного endpoint вне `routes/public/*` считается нарушением архитектуры.

---

## 2) Формат запросов/ответов

### База и заголовки

- Base path: `/api`
- Auth: `Authorization: Bearer <jwt>` для защищенных endpoint
- Content-Type:
  - `application/json` для JSON
  - `multipart/form-data` для загрузки файлов

### Успешный ответ

```json
{
  "success": true,
  "data": {}
}
```

Комментарий: для отдельных операций допустим `data: null` и/или `message`.

### Ошибка (текущий обязательный минимум)

```json
{
  "success": false,
  "message": "Текст ошибки"
}
```

Комментарий: поле `error.code` может появляться точечно, но пока не является обязательным.

**Человекочитаемые сообщения:** все ошибки API (включая rate limit `429`) возвращают JSON выше, не plain-text. Фронтенд парсит `message` через `src/api/parseApiError.ts`; при отсутствии текста — fallback по HTTP-коду.

### HTTP-коды

- `200`, `201`, `400`, `401`, `403`, `404`, `409`, `429`, `500`, `503`

---

## 2.1) Модули линейки и namespace API

| Модуль (UI) | Ключ лицензии | `event_mode` | Префикс API |
|-------------|---------------|-------------|-------------|
| **Рег.Поинт** | `point` | `attendance_list`, `pre_registration` | §4.3–4.6 |
| **Рег.Промо** | `promo` | `promo` (без receipts) | §4.3, §4.5 |
| **Рег.Про** | `pro` | `promo` + receipts/FNS | §4.3, §4.5, §4.7 |
| **Рег.Тикет** | `ticket` | `ticketing` | **§4.8** (backlog, контракт зафиксирован) |

- Endpoints §4.8 доступны только при флаге `ticket` в `license.json` и `event.eventMode = ticketing`.
- **Рег.Тикет** требует **Рег.Поинт** (`point`); stack с **Рег.Про** допустим.
- Реализация backend §4.8 — backlog (`BACKLOG_REG_TICKET.md`); контракт обязателен для frontend/API-слоя.

## 2.2) Лицензирование и активация (Box)

- `modules` в лицензии хранит продуктовые ключи: `point`, `promo`, `pro`, `ticket`.
- Runtime-capabilities вычисляются backend из `modules` и применяются middleware-гейтами.
- В production endpoint модуля возвращает `403`, если capability не активирована.

### GET `/api/license`
- Access: `director`
- Назначение: статус лицензии инстанса для UI и runtime-gating.
- Response `200`:
```json
{
  "success": true,
  "data": {
    "package": "regpoint_pro",
    "modules": ["pro"],
    "capabilities": ["attendance_list", "pre_registration", "promo"],
    "status": "active",
    "validUntil": "2027-06-30",
    "graceUntil": "2027-07-14",
    "instanceId": "hash-of-host",
    "isPilotActive": false,
    "pilotUntil": null
  }
}
```

### POST `/api/license/activate`
- Access: `director`
- Request:
```json
{ "code": "RGPT-PRO1-A7K9-M2P4-Q8R3" }
```
- Response `200`: обновлённый license status (`data` как в `GET /api/license`).
- Response `400`: невалидный/повреждённый код.
- Response `409`: код не подходит для `instanceId` или уже использован.

### POST `/api/license/activate-pilot`
- Access: `director`
- Request:
```json
{ "pilotCode": "RGPT-PILOT-XXXX-XXXX-XXXX" }
```
- Назначение: специальный код пилота сроком на 1 месяц (или иной срок из payload).
- Response `200`: `isPilotActive: true`, `pilotUntil`.

### Коды статуса лицензии
- `active` — подписка активна.
- `grace` — период 14 дней после `validUntil` (read-only).
- `expired` — срок и grace завершены.
- `pilot` — активен пилотный период.

### Коды ошибок лицензии (минимум)
- `403 LICENSE_MODULE_DISABLED` — модуль/режим недоступен текущей лицензии.
- `403 LICENSE_EXPIRED` — подписка истекла, grace завершён.
- `403 LICENSE_READ_ONLY` — разрешено только чтение в режиме grace.

## 2.3) Vendor-admin integration (optional, Box)

> Канон: **`VENDOR_INTEGRATION.md`**. Vendor-admin — **отдельный** deploy; не часть `/api/` коробки.

### Модель

- **Activate offline-first** — `POST /api/license/activate` не вызывает vendor-admin.
- **Online verify (optional):** перед activate backend **может** вызвать vendor-admin `POST /api/v1/integrations/verify-code` если заданы env (см. ниже). Timeout 3s; при ошибке сети — local activate разрешён. Block только при `revoked: true`.

### Env (коробка)

| Variable | Required | Description |
|----------|:--------:|-------------|
| `VENDOR_ADMIN_URL` | if verify | Base URL admin без trailing slash |
| `VENDOR_ADMIN_INSTANCE_TOKEN` | if verify | Per-instance token; **выпускает vendor-admin** |
| `VENDOR_ADMIN_VERIFY_ENABLED` | no | default `false` |

### Outbound: verify-code (коробка → vendor-admin)

**POST** `{VENDOR_ADMIN_URL}/api/v1/integrations/verify-code`

Headers: `X-Instance-Token: ${VENDOR_ADMIN_INSTANCE_TOKEN}`

Request:

```json
{
  "activationCode": "<signed-code>",
  "runtimeInstanceId": "<instanceId-from-getLicenseSnapshot>"
}
```

Response `200` — см. `VENDOR_INTEGRATION.md` §4.3.

### Сроки кодов (согласовано с vendor-admin)

| Тип | Срок | Выдача |
|-----|------|--------|
| initial / renewal | 365 дней | renewal вручную из admin |
| pilot | 30 дней | отдельный код; несколько подряд OK |

## 2.4) Support chat (director → vendor-admin)

> Канон: **`SUPPORT_CHAT.md`**. Facade на коробке; messages хранятся в vendor-admin.

### Модель

- Director пишет в чат через **`/api/support/*`**; backend проксирует в vendor-admin.
- **Box ID** (`runtimeInstanceId`, 24 символа) — на странице «О лицензии» / support; admin сопоставляет с **компанией** (ручной ввод Box ID на инстансе в admin).
- **Online-only:** без `VENDOR_ADMIN_URL` + `VENDOR_ADMIN_INSTANCE_TOKEN` → `503 SUPPORT_NOT_CONFIGURED`.
- Polling MVP; WebSocket Phase 2.

### Env

Те же, что §2.3: `VENDOR_ADMIN_URL`, `VENDOR_ADMIN_INSTANCE_TOKEN` (**обязательны для чата**).

### GET `/api/support/context`

- Access: `director`
- Response `200`:

```json
{
  "success": true,
  "data": {
    "runtimeInstanceId": "a1b2c3d4e5f6g7h8i9j0k1l2",
    "supportAvailable": true,
    "fallbackEmail": "support@vendor.local"
  }
}
```

### GET `/api/support/messages`

- Access: `director`
- Query: `since` (ISO optional), `limit` (default 50)
- Response `200`:

```json
{
  "success": true,
  "data": {
    "threadId": "uuid",
    "messages": [
      {
        "id": "uuid",
        "senderType": "director",
        "senderDisplayName": "Иван Петров",
        "body": "Текст",
        "createdAt": "2026-06-28T14:00:00.000Z"
      }
    ]
  }
}
```

### POST `/api/support/messages`

- Access: `director`
- Request:

```json
{ "body": "Текст сообщения" }
```

- Response `201`: созданное message в `data`.
- Errors: `503 SUPPORT_NOT_CONFIGURED`, `502 SUPPORT_UPSTREAM_ERROR`.

Upstream: `SUPPORT_CHAT.md` §5.1 — vendor-admin `/integrations/support/messages`.

---

## 3) Матрица доступа

| Роль/контекст | Доступ |
|---|---|
| Public | Публичная регистрация и check-in сценарии |
| Manager | Только свои мероприятия и связанные данные |
| Director | Полный доступ в рамках агентства |

---

## 4) Контракт endpoint'ов

## 4.0 Public namespace (`/api/public/*`)

- Все неаутентифицированные сценарии (публичные формы/чек-ин/lookup) идут через `/api/public/*`.
- Legacy-эндпоинты вне `/api/public/*` допускаются только как временная совместимость и помечаются deprecated.

## 4.1 Auth module (`/api/auth`)

### POST `/api/auth/login`
- Access: `public`
- Request:
```json
{ "email": "user@mail.com", "password": "secret" }
```
- Response `200`:
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@mail.com", "name": "Name", "role": "manager", "phone": "+7..." },
    "token": "jwt",
    "accessToken": "jwt",
    "refreshToken": "jwt_optional",
    "expiresIn": 86400
  }
}
```

### POST `/api/auth/refresh`
- Access: `public` (по refresh token)
- Request:
```json
{ "refreshToken": "jwt" }
```
- Response `200`:
```json
{ "success": true, "data": { "accessToken": "jwt", "token": "jwt", "expiresIn": 86400 } }
```

### POST `/api/auth/logout`
- Access: `authenticated`
- Response `200`:
```json
{ "success": true, "data": {} }
```

### POST `/api/auth/verify-password`
- Access: `authenticated`
- Request:
```json
{ "password": "secret" }
```
- Response `200`:
```json
{ "success": true, "data": { "verified": true } }
```

### GET `/api/auth/me`
- Access: `authenticated`
- Response `200`:
```json
{
  "success": true,
  "data": { "id": "uuid", "email": "user@mail.com", "name": "Name", "role": "manager", "phone": "+7..." }
}
```

---

## 4.2 Users module (`/api/users`)

Комментарий: по коду доступ только у `director` (не manager).

### GET `/api/users`
- Access: `director`
- Response `200`: массив пользователей в `data`.

### GET `/api/users/:id`
- Access: `director`
- Response `200`: пользователь в `data`.

### POST `/api/users`
- Access: `director`
- Request:
```json
{ "email": "u@mail.com", "password": "secret", "name": "User", "phone": "+7...", "role": "manager" }
```
- Response `201`: созданный пользователь в `data`.

### DELETE `/api/users/:id`
- Access: `director`
- Ограничения:
  - нельзя удалить себя
  - нельзя удалить первого зарегистрированного пользователя
- Response `200`:
```json
{ "success": true, "data": null }
```

---

## 4.3 Events module (`/api/events`)

### Типы: `CustomField` и ограничения

`CustomField` (по `src/types/index.ts`):

```json
{
  "id": "cf_company",
  "label": "Компания",
  "type": "text | textarea | radio | dropdown | select | multiselect | number | email | phone | date | scale | rating",
  "required": false,
  "placeholder": "string_optional",
  "options": ["string_optional"],
  "order": 1,
  "isPD": false,
  "scaleMin": 1,
  "scaleMax": 5,
  "ratingMax": 5,
  "validation": {
    "minLength": 1,
    "maxLength": 255,
    "min": 0,
    "max": 100,
    "pattern": "regex_optional"
  }
}
```

Правила:
- `customFields` в `POST/PUT /api/events` — optional.
- Максимум `20` полей на мероприятие.
- `id` каждого поля уникален в рамках мероприятия.
- `customFields` поддерживаются для `eventMode = pre_registration | promo`.
- Для `eventMode = attendance_list` массив `customFields` должен быть пустым.

### Тип: `EventCompliance` (канон для коробки)

```json
{
  "pdConsentText": "string_required",
  "dataRetentionDays": 30,
  "privacyPolicyUrl": "https://external.example/policy",
  "marketingConsentText": "string_optional",
  "marketingConsentUrl": "https://external.example/marketing-consent",
  "promoTermsUrl": "https://external.example/promo-terms"
}
```

Примечания:
- legal-контент в продукте хранится как per-event тексты + внешние URL.
- hosted legal pages в backend/frontend не являются частью API-контракта.

### GET `/api/events`
- Access: `director | manager`
- Response `200`: массив мероприятий в `data`.
- Правило доступа:
  - `director` видит все
  - `manager` видит только `created_by = req.user.id` (`created_by IS NULL` недоступно для manager)

### GET `/api/events/:id`
- Access: `director | manager`
- Response `200`: карточка мероприятия в `data`.
- Правило доступа:
  - `director` — любое мероприятие
  - `manager` — только `created_by = req.user.id` (`created_by IS NULL` недоступно для manager)
- В `data.compliance` возвращается объект `EventCompliance`.

### GET `/api/public/events/:id`
- Access: `public`
- Назначение: данные для публичных страниц (`/event/:id`, `/check-in/:id`).
- Response `200`: карточка мероприятия в `data`.
- В `data.compliance` возвращается объект `EventCompliance` (источник текстов и внешних legal URL).

### POST `/api/events`
- Access: `director | manager`
- Request: `title`, `startDate`, `endDate`, `compliance`, optional `customFields`, colors, logo, `receiptVerification`, `eventMode`, optional `templateId`.
- `eventMode`: `attendance_list` | `pre_registration` | `promo` | `ticketing` (последний — модуль **Рег.Тикет**, лицензия `ticket`).
- `compliance` (обязательные поля коробки): `pdConsentText`, `dataRetentionDays`, `privacyPolicyUrl`.
- `compliance` (опциональные): `marketingConsentText`, `marketingConsentUrl`, `promoTermsUrl`.
- Поля реквизитов оператора ПД (`clientCompany`, `clientINN`, `clientAddress`, `operatorEmail`, `pdPurpose`) **удалены** из API и БД.
- `templateId` (если передан): backend клонирует `fields` шаблона в `event.customFields` (snapshot на момент создания).
- Response `201`: созданное мероприятие в `data`.
- Response `400`: при пустых обязательных `compliance`-полях.

### PUT `/api/events/:id`
- Access: `director | manager` (manager только на свою акцию)
- Поддерживает `customFields` и optional `templateId` (re-apply snapshot).
- Response `200`: обновленное мероприятие в `data`.
- Response `400`: при передаче неполного блока `compliance`.

### DELETE `/api/events/:id`
- Access: `director | manager` (manager только на свою акцию)
- Response `200`:
```json
{ "success": true, "data": null }
```

### 4.3.1 Registration field templates (`/api/field-templates`) — shared library

> Статус: реализовано (Sprint B).  
> Scope: один box-instance; все шаблоны доступны всем менеджерам и директору (CRUD без ограничения по автору).

Тип `FieldTemplate`:

```json
{
  "id": "uuid",
  "name": "Корпоративная регистрация",
  "description": "string_optional",
  "fields": [],
  "isArchived": false,
  "createdBy": "uuid",
  "updatedBy": "uuid_optional",
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

### GET `/api/field-templates`
- Access: `director | manager`
- Response `200`: массив `FieldTemplate` в `data`.

### POST `/api/field-templates`
- Access: `director | manager`
- Request: `name`, optional `description`, `fields: CustomField[]`.
- Response `201`: созданный `FieldTemplate` в `data`.
- Response `409`: шаблон с таким `name` уже существует (UNIQUE `template_name`).

### PUT `/api/field-templates/:id`
- Access: `director | manager`
- Request: optional `name`, `description`, `fields`, `isArchived`.
- Response `200`: обновленный `FieldTemplate` в `data`.
- Response `409`: конфликт имени с другим шаблоном.

### POST `/api/field-templates/:id/archive`
- Access: `director | manager`
- Request: `{ "isArchived": true | false }`
- Response `200`: `data: null`.

**UI (frontend):** управление через `/settings/field-templates` — см. `docs/active/FIELD_TEMPLATES_UI.md`. Сценарий «Сохранить поля события как шаблон» использует тот же `POST /api/field-templates` (без отдельного endpoint).

---

## 4.4 Participants (nested under events)

### GET `/api/events/:eventId/participants`
- Access: `director | manager`
- Response `200`: массив участников в `data`.

### GET `/api/events/:eventId/participants/:id`
- Access: `director | manager`
- Response `200`: участник в `data`.

### POST `/api/events/:eventId/participants`
- Access: `director | manager`
- Response `201`: созданный участник в `data`.

### PUT `/api/events/:eventId/participants/:id`
- Access: `director | manager`
- Response `200`: обновленный участник в `data`.

### DELETE `/api/events/:eventId/participants/:id`
- Access: `director | manager`
- Response `200`: `data: null`.

### POST `/api/events/:eventId/participants/:id/request-deletion` (internal)
- Access: `director | manager`
- Response `200`: `data: null`.

### POST `/api/public/events/:eventId/participants/:id/request-deletion`
- Access: `public`
- Назначение: публичный запрос на удаление ПД участника (152-ФЗ flow).
- Rate limit: как `/api/public/register` (env `REGISTRATION_RATE_LIMIT_*`). При превышении: `429`.
- Request:
```json
{
  "phone": "+79990000000",
  "verificationCode": "123456",
  "verificationToken": "signed_token_optional"
}
```
- Верификация субъекта: телефон + обязательный second factor (OTP или signed token).
- При отсутствии required server secrets (`PD_REQUEST_OTP_SECRET` для OTP, `PD_REQUEST_TOKEN_SECRET` для signed token) endpoint возвращает `503`.
- Response `200`: `data: null`.
- Response `403`: телефон не совпал или участник не найден.
- Response `409`: запрос на удаление уже был отправлен ранее.

### POST `/api/public/events/:eventId/participants/:id/request-data`
- Access: `public`
- Назначение: заявка субъекта на предоставление копии его ПД.
- Rate limit: отдельный лимитер (env `PD_REQUEST_RATE_LIMIT_*`), при превышении `429`.
- Request:
```json
{
  "phone": "+79990000000",
  "verificationCode": "123456",
  "verificationToken": "signed_token_optional"
}
```
- Верификация субъекта: телефон + OTP/подписанный токен (anti-replay, короткий TTL).
- Second factor обязателен всегда (включая non-production).
- При отсутствии required server secrets (`PD_REQUEST_OTP_SECRET`/`PD_REQUEST_TOKEN_SECRET`) endpoint возвращает `503`.
- Response `200`:
```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "pending"
  }
}
```
- Response `403`: верификация субъекта не пройдена.
- Response `409`: активная заявка уже существует.

### POST `/api/public/events/:eventId/participants/:id/revoke-marketing-consent`
- Access: `public`
- Назначение: отзыв согласия на маркетинговую обработку без удаления основной регистрации.
- Rate limit: отдельный лимитер (env `PD_REQUEST_RATE_LIMIT_*`), при превышении `429`.
- Request:
```json
{
  "phone": "+79990000000",
  "verificationCode": "123456",
  "verificationToken": "signed_token_optional"
}
```
- Верификация субъекта: телефон + OTP/подписанный токен.
- Second factor обязателен всегда (включая non-production).
- При отсутствии required server secrets (`PD_REQUEST_OTP_SECRET`/`PD_REQUEST_TOKEN_SECRET`) endpoint возвращает `503`.
- Response `200`:
```json
{
  "success": true,
  "data": {
    "participantId": "uuid",
    "consentMarketing": false
  }
}
```
- Response `403`: верификация субъекта не пройдена.

---

## 4.5 Public registration endpoint

### POST `/api/public/register`
- Access: `public`
- Request:
```json
{
  "eventId": "uuid",
  "firstName": "Ivan",
  "lastName": "Ivanov",
  "phone": "+79990000000",
  "consentPD": true,
  "consentMarketing": false,
  "customFieldsData": {}
}
```
- `customFieldsData`: ключи строго соответствуют `event.customFields[].id`.
- Backend валидирует `customFieldsData` по схеме мероприятия:
  - required-поля обязательны;
  - тип значения должен соответствовать `CustomField.type`;
  - неизвестные ключи запрещены (`400`).
- Response `201`:
```json
{
  "success": true,
  "data": { "id": "participant_uuid", "eventId": "event_uuid" },
  "message": "Регистрация успешна"
}
```

### POST `/api/register` (deprecated alias)
- Access: `public`
- Назначение: временная обратная совместимость.
- По умолчанию alias отключен; включается только env-флагом `ENABLE_LEGACY_REGISTER_ALIAS=true`.
- Response: идентичен `/api/public/register`.

---

## 4.6 Attendance module

### GET `/api/public/events/:eventId/participants/search?q=&date=`
- Access: `public`
- Rate limit: отдельный лимитер (default 30 req / 15 min на IP). Env: `ATTENDANCE_SEARCH_RATE_LIMIT_MAX`, `ATTENDANCE_SEARCH_RATE_LIMIT_WINDOW_MS`.
- При превышении: `429`, message «Слишком много запросов поиска».
- Query: `q` — мин. 3 символа; optional `date` (ISO или DD.MM.YYYY).
- Response `200`: массив маскированных совпадений в `data` (`participantToken`, `maskedName`, `maskedPhone`, `alreadyCheckedIn`, `checkInDate`).
- `participantToken` — short-lived opaque token для следующего шага check-in; прямой `participantId` в публичном ответе не возвращается.

### POST `/api/public/events/:eventId/check-in`
- Access: `public`
- Rate limit: как `/api/public/register` (default 5 req / 15 min на IP). Env: `REGISTRATION_RATE_LIMIT_MAX`, `REGISTRATION_RATE_LIMIT_WINDOW_MS`.
- При превышении: `429`, message «Слишком много попыток check-in».
- Request: `participantToken`, `consentPD: true`, optional `checkInDate`.
- `participantId` в public check-in **не принимается** (только opaque token из search).
- Response `201`: `checkInId`, `checkInDate`, `checkedInAt`.
- Response `400`: отсутствует или невалидный `participantToken`.
- Response `409`: повторный check-in в тот же день (token → participant + `checkInDate`).

### POST `/api/events/:eventId/participants/import`
- Access: `director | manager`
- Content-Type: `multipart/form-data`, поле `file`
- Response `200`: `{ imported, skipped, total, errors }` в `data`.

### POST `/api/events/:eventId/check-in/manual`
- Access: `director | manager`
- Response `201`: `checkInId`, `checkInDate`.

### GET `/api/events/:eventId/attendance`
- Access: `director | manager`
- Response `200`: `summary` + `participants`.

### GET `/api/events/:eventId/attendance/export`
- Access: `director | manager`
- Response `200`: CSV файл.

---

## 4.7 Receipts module

### POST `/api/receipts/verify`
- Access: `public` (по коду endpoint не защищен)
- Request:
```json
{ "qr": "t=...&s=...&fn=...&i=...&fp=..." }
```
- Response `200`:
```json
{
  "success": true,
  "data": { "inn": "770...", "date": "dd.mm.yyyy", "amount": 1234.56, "message": "...", "raw": {} }
}
```

---

## 4.7.1 Audit module

### GET `/api/audit`
- Access: `director`
- Query: optional `userId`, `action`, `eventId`, `dateFrom`, `dateTo`, `limit`, `offset`.
- Response `200`: массив записей audit в `data`.

### GET `/api/audit/export`
- Access: `director`
- Query: optional `format=json|csv|xml`, `userId`, `action`, `eventId`, `dateFrom`, `dateTo`, `limit`, `offset`.
- Ограничения: `limit` ограничивается сервером (safe cap), `offset >= 0`.
- Response `200`: экспорт журнала аудита в выбранном формате (`xml` — optional/compat mode).
- Response `400`: неподдерживаемый формат экспорта.

## 4.7.2 PD Requests module

Тип `PdRequest`:
```json
{
  "id": "uuid",
  "eventId": "uuid",
  "participantId": "uuid",
  "requestType": "request_data | revoke_marketing_consent | request_deletion",
  "status": "pending | approved | rejected | completed",
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

Примечание:
- Модуль используется для публичных заявок субъекта ПД и внутренних workflow-операций.
- Публичные заявки создаются только через `/api/public/*`.

## 4.7.3 Status endpoints

### GET `/status`
- Access: `public` (инфраструктурный статус приложения)
- Response `200`:
```json
{
  "status": "OK",
  "timestamp": "2026-06-28T00:00:00.000Z",
  "uptime": 1234.56,
  "environment": "production",
  "database_status": "OK",
  "license_status": "OK",
  "checks": {
    "database": { "status": "OK" },
    "license": { "status": "OK" }
  }
}
```
- Response `503`:
```json
{
  "status": "ERROR",
  "timestamp": "2026-06-28T00:00:00.000Z",
  "uptime": 1234.56,
  "environment": "production",
  "database_status": "ERROR",
  "license_status": "OK",
  "checks": {
    "database": { "status": "ERROR", "message": "MySQL ping failed" },
    "license": { "status": "OK" }
  }
}
```

### GET `/status/health`
- Access: `public` (health-check для load balancer)
- Response `200`: `{ "status": "OK" }` при работоспособном инстансе.
- Response `5xx`: инстанс неработоспособен.

### GET `/status/metrics`
- Access: `public`
- Назначение: базовые runtime-метрики для мониторинга (Prometheus text format).
- Метрики:
  - `app_uptime_seconds`
  - `app_memory_heap_used_bytes`
  - `app_memory_rss_bytes`

### POST `/api/public/observability/frontend-errors`
- Access: `public`
- Назначение: прием ошибок frontend (ErrorBoundary) для production observability.
- Request:
```json
{
  "message": "string_required",
  "stack": "string_optional",
  "componentStack": "string_optional",
  "route": "/events/123"
}
```
- Response `202`: `{ "success": true, "data": null }`.
- Response `400`: отсутствует `message`.

---

## 4.8 Ticketing module — **Рег.Тикет** (backlog)

> **Статус реализации:** backlog (`BACKLOG_REG_TICKET.md`). Контракт зафиксирован до кода.  
> **Лицензия:** `modules` содержит `ticket`. **ЮKassa:** credentials на инстансе клиента.

### Общие типы

**TicketType**
```json
{
  "id": "uuid",
  "eventId": "uuid",
  "name": "Стандарт",
  "description": "string",
  "priceRub": 1500,
  "quota": 100,
  "soldCount": 0,
  "isActive": true
}
```

**TicketTemplate** (per event)
```json
{
  "eventId": "uuid",
  "logoUrl": "string",
  "primaryColor": "#243954",
  "blocks": [
    { "type": "title", "text": "Билет" },
    { "type": "field", "key": "participantName", "label": "Участник" },
    { "type": "qr", "source": "ticketCode" }
  ]
}
```

**Ticket**
```json
{
  "id": "uuid",
  "eventId": "uuid",
  "ticketTypeId": "uuid",
  "participantId": "uuid",
  "paymentId": "uuid",
  "ticketCode": "base64url",
  "status": "pending_payment | paid | canceled | used",
  "pdfUrl": "string_optional"
}
```

**Payment**
```json
{
  "id": "uuid",
  "eventId": "uuid",
  "ticketTypeId": "uuid",
  "amountRub": 1500,
  "currency": "RUB",
  "status": "pending | succeeded | canceled",
  "yookassaPaymentId": "string",
  "confirmationUrl": "string"
}
```

### GET `/api/events/:eventId/ticket-types`
- Access: `director | manager` (+ license `ticket`)
- Response `200`: массив `TicketType` в `data`.

### POST `/api/events/:eventId/ticket-types`
- Access: `director | manager`
- Request: `name`, `description`, `priceRub`, `quota`, optional `isActive`.
- Response `201`: `TicketType` в `data`.

### PUT `/api/events/:eventId/ticket-types/:id`
- Access: `director | manager`
- Response `200`: обновлённый `TicketType` в `data`.

### DELETE `/api/events/:eventId/ticket-types/:id`
- Access: `director | manager`
- Ограничение: нельзя удалить тип с оплаченными билетами (`409`).
- Response `200`: `data: null`.

### GET `/api/events/:eventId/ticket-template`
- Access: `director | manager`
- Response `200`: `TicketTemplate` в `data`.

### PUT `/api/events/:eventId/ticket-template`
- Access: `director | manager`
- Request: `TicketTemplate` (без `eventId` в body допустимо — берётся из path).
- Response `200`: сохранённый шаблон в `data`.

### GET `/api/events/:eventId/tickets`
- Access: `director | manager`
- Query: optional `status`, `ticketTypeId`.
- Response `200`: массив `Ticket` (+ маскированные ПД участника) в `data`.

### GET `/api/events/:eventId/tickets/export`
- Access: `director | manager`
- Response `200`: CSV.

### GET `/api/public/events/:eventId/ticket-types`
- Access: `public`
- Назначение: активные типы с доступной квотой для страницы покупки.
- Response `200`: массив `{ id, name, description, priceRub, availableCount }` в `data`.

### POST `/api/public/events/:eventId/tickets/purchase`
- Access: `public`
- Request:
```json
{
  "ticketTypeId": "uuid",
  "firstName": "Ivan",
  "lastName": "Ivanov",
  "phone": "+79990000000",
  "email": "user@mail.com",
  "consentPD": true,
  "consentMarketing": false,
  "returnUrl": "https://client.example/ticket/return"
}
```
- Response `201`:
```json
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "confirmationUrl": "https://yoomoney.ru/...",
    "status": "pending"
  }
}
```

### GET `/api/public/tickets/:ticketId`
- Access: `public` (доступ по `ticketCode` query или одноразному token — уточнить при реализации)
- Query: `code` (обязателен без session token).
- Response `200`: `Ticket` + данные для отображения/PDF в `data`.

### POST `/api/public/payments/yookassa/create`
- Access: `public`
- Назначение: альтернативный entry (если purchase split на два шага); предпочтительно через `tickets/purchase`.
- Request: `paymentId`, optional `returnUrl`.
- Response `200`: `{ confirmationUrl, status }` в `data`.

### POST `/api/payments/yookassa/webhook`
- Access: `public` (проверка подписи ЮKassa, не JWT)
- Request: тело webhook ЮKassa (JSON).
- Response `200`: `{ success: true }` — идемпотентная обработка `payment.succeeded` / `payment.canceled`.
- Побочный эффект: при `succeeded` — выпуск `Ticket` (`status: paid`), QR/PDF.

### GET `/api/public/payments/:paymentId/status`
- Access: `public`
- Response `200`: `{ status, ticketId }` в `data` (после оплаты — ссылка на билет).

### Check-in по билету

Использует существующий §4.6 с расширением:

### POST `/api/public/events/:eventId/check-in`
- Request (ticketing): optional `ticketCode` вместо `participantId` — при `eventMode = ticketing`.
- Response: как в §4.6; `method: "ticket_qr"`.

---

## 5) Что считается нарушением контракта

- Изменение payload/обязательных полей без обновления `API_CONTRACT.md`.
- Подмена путей (`/api/v1/*` вместо утвержденного `/api/*`) без отдельного решения.
- Использование во frontend endpoint'ов, отсутствующих в контракте.
- Изменение уровня доступа endpoint без фиксации в контракте и архитектурной документации.

---

## 6) История и архив

- **Канон:** `docs/active/API_CONTRACT.md`
- Исторические `src/API_SPEC*.md` и `docs/archive/API_SPEC*_ARCHIVE_*.md` — только локально (`.gitignore`); при необходимости — из истории git.

