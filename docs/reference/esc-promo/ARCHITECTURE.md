# Архитектура Regpoint (Регпоинт)

> **Статус:** принято. Обязательно к соблюдению при разработке фронтенда, бэкенда и интеграций.  
> **Связь:** `.cursor/rules/architecture.mdc`, `src/BACKEND_ARCHITECTURE.md`, `src/FRONTEND_ARCHITECTURE.md`.

---

## 1. Общая модель: модульный монолит

Регпоинт — **модульный монолит**: одно deployable-приложение (frontend SPA + backend API), разделённое на **изолированные доменные модули**.

| Принцип | Описание |
|---------|----------|
| Один деплой | Фронт и бэк выкатываются как единая система; микросервисы не используются. |
| Модули по домену | Каждый функциональный блок — отдельный модуль со своими маршрутами, сервисами и (при необходимости) таблицами БД. |
| Жёсткая изоляция | Модули **не импортируют** код друг друга напрямую. Обмен — только через публичный REST API или через общий **shared kernel** (см. §3). |
| Жёсткий REST API | Единственный контракт между фронтом и бэком и между модулями — HTTP REST. Контракт описан в спецификации API и не нарушается ad-hoc вызовами. |

### Доменные модули (текущие и планируемые)

| Модуль | Назначение | Backend (routes) | Frontend |
|--------|------------|------------------|----------|
| **auth** | JWT, сессии, refresh | `routes/auth.js` | login, guards |
| **users** | Пользователи, роли | `routes/users.js` | UsersList, профиль |
| **events** | Мероприятия / акции | `routes/events.js` | EventsList, CreateEvent, EventDetails |
| **field_templates** | Общие шаблоны полей регистрации (instance-level) | `routes/fieldTemplates.js` | `api/fieldTemplates.ts`, `hooks/useFieldTemplates.ts`, `pages/fieldTemplates/*`, picker в `CustomFieldsEditor`, `SaveFieldTemplateDialog` |
| **participants** | Участники | `routes/participants.js` | списки, карточки |
| **attendance** | Check-in, импорт списков (пилот) | `routes/attendance.js` | AttendanceCheckInPage, CheckInPage, ParticipantImportPage |
| **receipts** | Чеки, OCR, ФНС | `routes/receipts.js` | ReceiptScanner |
| **audit** | Журнал операций с ПД и действиями пользователей | `routes/audit.js` | AuditLogPage |
| **pd_requests** | Публичные запросы субъекта ПД (удаление/выгрузка/отзыв маркетинга) | `routes/public/privacy.js` (planned) | Public privacy flows (planned) |
| **pre_registration** | Публичная регистрация (backlog) | `POST /api/public/register` (legacy alias `/api/register` отключен по умолчанию, включается env `ENABLE_LEGACY_REGISTER_ALIAS=true`) | PublicRegistration |

Новые фичи добавляются **новым модулем** или расширением существующего через его публичный API, а не через прямой доступ к внутренностям соседнего модуля.

---

## 2. Жёсткий REST API

### Контракт

- Все операции фронтенда — через HTTP-клиент (`src/api/` или React Query hooks).
- Формат: JSON, коды ответов по REST-семантике (200/201/400/401/403/404/409/500).
- Версионирование: префикс `/api/`; при breaking changes — `/api/v2/` (пока v1 неявный).
- Спецификация: **`docs/active/API_CONTRACT.md`** (канон), `src/backend/README.md`, документы модулей (`EVENT_REGISTRATION_PILOT.md` и т.д.).
- Внутренний интерфейс (кабинет manager/director) использует только авторизованные сценарии API.
- Для публичных страниц регистрации/check-in используется отдельный namespace: `/api/public/*`.
- Публичные backend-роуты размещаются только в `src/backend/routes/public/*`.
- Добавление публичного endpoint вне `routes/public/*` запрещено.

### Запрещено

- Прямые SQL-запросы из фронтенда.
- Обход API (WebSocket/event bus между модулями без REST-контракта на текущем этапе).
- «Утечка» внутренних DTO модулей в публичные эндпоинты других модулей без явного контракта.

### Межмодульное взаимодействие (backend)

Внутри монолита модули **не вызывают** функции/классы соседних модулей. Допустимо:

1. **Shared kernel** — инфраструктура: `config/`, `middleware/auth.js`, `utils/logger.js`, `utils/encryption.js`, подключение к БД.
2. **Публичный сервисный слой модуля** — если модуль A нужен модуль B: либо HTTP-вызов внутри процесса через тот же REST-контракт (предпочтительно для будущего выделения), либо явно экспортированный **facade** в `modules/<name>/index.js` без доступа к внутренним файлам.

При рефакторинге backend целевая структура:

```
src/backend/
├── modules/
│   ├── auth/
│   ├── events/
│   ├── attendance/
│   └── ...
├── shared/          # kernel: config, middleware, utils
└── server.js        # монтирует routes модулей
```

Текущая плоская структура (`routes/`, `middleware/`) — допустима до рефакторинга; **правила изоляции** действуют уже сейчас.

---

## 3. Shared kernel (общее ядро)

Разрешённые общие зависимости:

- Аутентификация и авторизация (`middleware/auth.js`, JWT).
- Логирование, шифрование ПД, audit.
- Подключение к БД, миграции.
- Общие типы/константы без доменной логики.

Shared kernel **не содержит** бизнес-правил конкретного модуля.

## 3.1 Privacy / 152-ФЗ boundaries

- Источник legal-контента: `events.compliance` (per-event тексты + внешние URL политики/согласий).
- Legal-страницы в продукте не хостятся: CMS/templating legal pages не используется.
- Публичные privacy-сценарии (`request-data`, `revoke-marketing-consent`, `request-deletion`) реализуются только под `/api/public/*`.
- В публичных privacy-сценариях second factor обязателен всегда; fallback на dev bypass запрещён.
- Прямой participant identifier в публичном поиске (`/api/public/events/:eventId/participants/search`) не возвращается.
- Public search/check-in связаны через short-lived opaque token; public check-in принимает только `participantToken` (не `participantId`).
- Внутренние workflow-действия по заявкам субъекта ПД выполняются модулем `pd_requests` и журналируются модулем `audit`.

---

## 4. Frontend

- SPA (React), маршрутизация через router.
- Данные — только через API-слой и hooks; in-memory/mock — только для dev/MSW.
- Прямые `fetch` в страницах/компонентах запрещены; только `src/api/*` + hooks.
- UI-модули фронта зеркалят доменные модули бэка (`pages/`, `api/`, `hooks/` по сущностям).
- Компоненты одного домена не импортируют внутренние хелперы другого домена; общее — в `shared/` / `components/ui/`.
- Shared contract types хранятся в `src/shared/contracts.ts`; `src/types/index.ts` реэкспортирует их для frontend.
- Валидация custom fields — единый runtime source of truth в `src/shared/validateCustomFields.cjs` (CJS-ядро + ESM-обертка `src/shared/validateCustomFields.js`); frontend TS использует типизированный адаптер `src/utils/validateCustomFields.ts`.

### 4.1 Router и композиция приложения (mandatory)

- Канонический роутер frontend: `react-router-dom` (`BrowserRouter`, `Routes`, `Route`, `Navigate`).
- `src/App.tsx` — только bootstrap/композиция (`ErrorBoundary`, `Toaster`, router mount), целевой размер < 100 строк.
- Feature-routing: декларация маршрутов в `src/app/routes/*` с группировкой по доменам:
  - `public` (`/event/:id`, `/check-in/:id`);
  - `auth` (`/login`);
  - `events` (`/events/*`);
  - `settings` (`/settings/*`);
  - `admin` (`/users`, `/audit`, `/license`).
- Страницы получают навигацию через router primitives (`useNavigate`, `useLocation`) или facade-хелперы, но не через ручной `window.history`.
- Lazy-loading для тяжелых страниц допускается как опциональный этап, контракт URL не меняется.

---

## 5. Продукт и линейка модулей

**Бренд:** **Регпоинт** (UI). **Поставка:** коробка, self-hosted.

| Модуль | Назначение |
|--------|------------|
| **Рег.Поинт** | Регистрация на мероприятия |
| **Рег.Промо** | Регистрация в промоакции |
| **Рег.Про** | Мероприятия + промо + API ФНС |
| **Рег.Тикет** | Билеты, шаблоны, ЮKassa (backlog) |

**Технологическая база:** этот репозиторий (`ESC-Promo` / **Рег.Промо**) — единый модульный монолит для всех модулей линейки. Архитектура, REST-контракт и изоляция доменов общие; различия — лицензия и `event_mode`, не отдельные кодовые базы.

Канон номенклатуры: **`docs/active/PRODUCT_LINE.md`**. Backlog билетов: **`BACKLOG_REG_TICKET.md`**.

### 5.1 Единая карта «лицензия → модуль UI → event_mode»

| Ключ лицензии (`license.json`) | Модуль UI | Разрешённые `event_mode` | Статус |
|---|---|---|---|
| `point` | **Рег.Поинт** | `attendance_list`, `pre_registration` | MVP/Box (core) |
| `promo` | **Рег.Промо** | `promo` (без receipts/FNS) | После пилота, до full Pro |
| `pro` | **Рег.Про** | `attendance_list`, `pre_registration`, `promo` + receipts/FNS | MVP+ |
| `ticket` | **Рег.Тикет** | `ticketing` | Backlog |

- `ticket` требует `point` (или стек `pro + ticket`).
- `pro` функционально включает сценарии `point` и `promo` на уровне продукта.

### 5.1.1 Product keys vs runtime capabilities (канон)

- `modules` в лицензии хранит только продуктовые ключи: `point`, `promo`, `pro`, `ticket`.
- Runtime-capabilities вычисляются backend-слоем и не задаются напрямую в payload:
  - `point` -> `attendance_list`, `pre_registration`
  - `promo` -> `promo`
  - `pro` -> `attendance_list`, `pre_registration`, `promo` + receipts/FNS
  - `ticket` -> `ticketing` (+ сценарные зависимости `point`)
- В dev допускается отдельный env-режим полного доступа.
- В production работают только модули, активированные ключом или пилот-ключом.

### 5.2 Приоритет по волнам (spec-first)

| Волна | Обязательные блоки | Backlog |
|---|---|---|
| Pilot (11 июля) | `attendance_list`, импорт, check-in, attendance-отчёт | pre-registration full flow, ticketing |
| Box MVP | Контракт API, per-event compliance, базовый status/health, role-access | Docker/лицензирование полного цикла, grace/read-only UI |
| Post-MVP | Promo/Pro расширения, receipts hardening | Рег.Тикет |

**Не входит в scope без явного решения:** multi-tenant platform admin, SaaS-billing, оплата подписок vendor внутри приложения (оплата билетов — **ЮKassa на инстансе клиента**).

### 5.3 Подключение модулей в коробке

- Поставка модулей в коробке: **единый дистрибутив** (ядро + все модульные реализации).
- Активация модулей: через код активации (primary UX) и fallback `license.json`; далее действует runtime-gate.
- Отдельная инсталляция модулей поверх ядра в текущем контуре не применяется.
- Runtime-gate на backend обязателен для всех модулей: отсутствие capability -> `403 LICENSE_MODULE_DISABLED`.

### 5.4 Vendor-admin (trust boundary)

| Компонент | Где живёт | Связь с коробкой |
|-----------|-----------|------------------|
| **Vendor-admin** | Отдельный репо/VPS/local | Offline: подписанные коды |
| **LICENSE_PRIVATE_KEY** | Только vendor-admin | Никогда в ESC-Promo |
| **LICENSE_PUBLIC_KEY** | Backend коробки | Verify подписи кодов |
| **Per-instance token** | Выпуск admin → `.env` коробки | Verify, **support chat** |
| **Support chat** | Director → box facade → vendor-admin | Box ID + company в admin inbox |

Канон интegrации: **`VENDOR_INTEGRATION.md`**, **`SUPPORT_CHAT.md`**. Multi-tenant platform admin **внутри** ESC-Promo по-прежнему out of scope.

---

## 6. Проверка соблюдения

- Code review: нет cross-import между доменными `routes/` / `services/` / `pages/` разных модулей.
- Новый эндпоинт — документирован до или вместе с реализацией.
- Фронт не обращается к данным минуя `src/api/`.
- Backend routes не содержат объемной бизнес-логики: обработчики вызывают сервисы/контроллеры доменного модуля.
- `/status` возвращает агрегированный статус подсистем (`database_status`, `license_status`, `status`), `/status/health` — минимальный LB health-check.
- `/status/metrics` отдает runtime-метрики в Prometheus text format.
- Frontend ошибки отправляются на `/api/public/observability/frontend-errors` из `ErrorBoundary`.

---

## 7. Связанные документы

- `docs/active/EVENT_REGISTRATION_PILOT.md` — модуль attendance (пилот).
- `docs/active/BOX_PRODUCT_SPEC.md` — коробка: Docker, license, compliance per event.
- `docs/active/BUSINESS_MODEL.md` — пакеты, апсейлы, цены.
- `docs/active/DEVELOPMENT_ORDER_AND_TECH.md` — порядок работ и стек.
- `docs/active/API_CONTRACT.md` — обязательный API-контракт.
- `src/BACKEND_ARCHITECTURE.md` — детали бэкенда.
- `.cursor/rules/architecture.mdc` — правило для агента Cursor.
