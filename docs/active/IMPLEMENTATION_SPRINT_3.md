# План внедрения: Sprint 3 (Chunk 4 + Web Shell)

> **Статус:** completed (2026-06-29)
> **Дата:** 2026-06-29  
> **Горизонт:** 10 рабочих дней  
> **Цель:** превратить admin из API-first skeleton в рабочий инструмент оператора: закрыть sales backend (box/upsell) и дать минимально полезный UI для ежедневной работы.  
> **Канон:** [`VENDOR_ADMIN_SPEC.md`](VENDOR_ADMIN_SPEC.md) §8.6–§8.7, §9 · [`DEVELOPER_HANDBOOK.md`](DEVELOPER_HANDBOOK.md) · [`TODO.md`](TODO.md)  
> **Предыдущий спринт:** [`IMPLEMENTATION_SPRINT_2.md`](IMPLEMENTATION_SPRINT_2.md) (Chunk 2 → Chunk 3) — completed.

---

## 0. Оперативный baseline

### Уже реализовано (до Sprint 3)

| Chunk | Статус | Что есть в коде |
|:-----:|:------:|-----------------|
| 0 | done | Monorepo skeleton, `/status`, `verify-instance-token` |
| 1 | done | `packages/license-signing` (sign/verify/parse + tests) |
| 2 | done | Auth + DB + env + migrations |
| 3 | done | Customers/Instances CRUD + integration token lifecycle |

### Главный gap к “полноценной админке”

1. Нет sales API (`/box-sales`, `/upsell-sales`) и статистики выручки.
2. Web ещё skeleton (placeholder pages), нет рабочих sales страниц.
3. Нет операторского e2e флоу “завёл продажу -> увидел в списке -> сверил stats”.

### Итог Sprint 3 (ожидаемое состояние)

Operator может через UI:

1. Авторизоваться.
2. Создать продажу коробки (box sale) и апсейл (upsell sale).
3. Видеть список продаж с фильтрами и пагинацией.
4. Видеть агрегаты по продажам (`count`, `revenue`).

---

## 1. Scope и границы

### In scope (обязательно)

- Chunk 4 backend:
  - `GET/POST/GET:id/PATCH /api/v1/box-sales`
  - `GET /api/v1/box-sales/stats`
  - `GET/POST/GET:id/PATCH /api/v1/upsell-sales`
  - `GET /api/v1/upsell-sales/stats`
- Web shell (минимум для рабочего интерфейса):
  - layout + sidebar + auth guard
  - routes для sales страниц
  - list/form для box sales и upsell sales
- Тесты:
  - integration tests для sales endpoints
  - smoke-flow через API + ручной UI smoke
- Документация:
  - `DEVELOPER_HANDBOOK.md`, `TODO.md`, индексные документы

### Out of scope (следующий спринт)

- Chunk 5 (price lists import-canon)
- Chunk 6 (licenses/codes issue + verify)
- Chunk 7+ (support inbox, public callbacks)
- Chunk 11 (audit module)
- RBAC multi-role (Phase 2)

---

## 2. Правила исполнения (для более простой модели)

Этот спринт рассчитан на внедрение “моделью попроще”. Чтобы снизить риск регресса:

1. Делать **одну задачу за раз**: T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7.
2. После каждой задачи запускать локальные проверки (минимум `test:run` в затронутом пакете).
3. Не переходить к UI, пока backend API-контракты и тесты не зелёные.
4. Не делать “оптимизаций” и рефакторов вне scope.
5. Все новые поля денег хранить/отдавать строками decimal (`"180000.00"`).

---

## 3. Детальный план задач

---

### T1 — Sales domain contract + validation skeleton

**Цель:** зафиксировать единый контракт DTO/filters для box/upsell до реализации routes.

**Файлы (создать/обновить):**

- `apps/api/src/modules/boxSales/boxSalesValidation.ts`
- `apps/api/src/modules/upsellSales/upsellSalesValidation.ts`
- `apps/api/src/utils/pagination.ts` (если нужно расширение под sales filters)

**Требования:**

- Валидация query: `page`, `limit`, `q`, `customerId`, `instanceId`, `dateFrom`, `dateTo`.
- Валидация body:
  - box sale: `customerId`, `packageSku`, `soldPriceRub`, `soldAt`, optional `contractRef`, `notes`, `createInstance`.
  - upsell sale: `customerId`, `sku`, `soldPriceRub`, `soldAt`, optional `instanceId`, `linkedBoxSaleId`, `notes`.
- Decimal-строки: regex для `^\d+\.\d{2}$` (без float в API contract).

**Definition of Done:**

- [ ] Validator-функции покрывают обязательные и optional поля.
- [ ] Ошибки унифицированы в envelope `VALIDATION_ERROR`.
- [ ] Готовы фикстуры для integration tests.

**Промпт для простой модели:**

```text
Реализуй только validation-слой для модулей boxSales и upsellSales в apps/api:
query filters + body validators по VENDOR_ADMIN_SPEC.md §8.6–§8.7.
Деньги строго string decimal формата 0.00. Возвращай VALIDATION_ERROR.
Без routes и repository на этом шаге.
```

---

### T2 — Box sales module (CRUD + stats)

**Цель:** закрыть весь контракт `§8.6` для `box-sales`.

**Файлы (создать/обновить):**

- `apps/api/src/modules/boxSales/boxSalesRepository.ts`
- `apps/api/src/modules/boxSales/boxSalesService.ts`
- `apps/api/src/modules/boxSales/boxSalesRoutes.ts`
- `apps/api/src/app.ts` (подключение router)

**Endpoints:**

| Method | Path | Примечание |
|--------|------|------------|
| GET | `/api/v1/box-sales` | filters + pagination + сортировка по `soldAt DESC` |
| POST | `/api/v1/box-sales` | create sale, optional `createInstance=true` |
| GET | `/api/v1/box-sales/:id` | detail |
| PATCH | `/api/v1/box-sales/:id` | partial update |
| GET | `/api/v1/box-sales/stats` | count/revenue + group by packageSku |

**Бизнес-правила:**

- `sales_user_id` заполнять из JWT user.
- Если `createInstance=true`, создавать instance record и связывать `instance_id`.
- В list-ответе вернуть customer summary (`legalName`, `inn`) без лишних полей.

**Definition of Done:**

- [ ] Все endpoints отвечают в envelope.
- [ ] Пагинация + meta корректны.
- [ ] Stats не падают на пустых данных (возвращают нули).

**Промпт для простой модели:**

```text
Реализуй модуль box-sales (repository/service/routes) по VENDOR_ADMIN_SPEC.md §8.6:
GET list, POST create, GET by id, PATCH, GET stats.
Подключи requireAuth и router в app.ts.
Если createInstance=true — создай instance и свяжи с продажей.
Добавь только необходимый код без рефакторов других модулей.
```

---

### T3 — Upsell sales module (CRUD + stats)

**Цель:** закрыть контракт `§8.7` для `upsell-sales`.

**Файлы (создать/обновить):**

- `apps/api/src/modules/upsellSales/upsellSalesRepository.ts`
- `apps/api/src/modules/upsellSales/upsellSalesService.ts`
- `apps/api/src/modules/upsellSales/upsellSalesRoutes.ts`
- `apps/api/src/app.ts` (подключение router)

**Endpoints:**

| Method | Path |
|--------|------|
| GET | `/api/v1/upsell-sales` |
| POST | `/api/v1/upsell-sales` |
| GET | `/api/v1/upsell-sales/:id` |
| PATCH | `/api/v1/upsell-sales/:id` |
| GET | `/api/v1/upsell-sales/stats` |

**Бизнес-правила:**

- `linkedBoxSaleId` optional, но если передан — ссылка должна существовать.
- `instanceId` optional для upsell, но при наличии проверять existence.
- Суммы и даты в том же формате, что и box-sales.

**Definition of Done:**

- [ ] CRUD + stats отвечают по контракту.
- [ ] Валидация ссылок (`linkedBoxSaleId`, `instanceId`) выдаёт доменные ошибки.
- [ ] Набор фильтров симметричен box-sales там, где это уместно.

**Промпт для простой модели:**

```text
Реализуй модуль upsell-sales (repository/service/routes) по VENDOR_ADMIN_SPEC.md §8.7.
Нужны list/create/detail/update/stats, requireAuth, envelope responses.
Проверь валидность linkedBoxSaleId и instanceId при create/update.
Не трогай UI на этом шаге.
```

---

### T4 — Integration tests + API smoke hardening

**Цель:** зафиксировать поведение sales API автотестами.

**Файлы (создать/обновить):**

- `apps/api/tests/boxSales.integration.test.ts`
- `apps/api/tests/upsellSales.integration.test.ts`
- `apps/api/tests/salesStats.integration.test.ts` (или объединить с модулями)

**Тест-кейсы минимум:**

1. Create box sale -> appears in list.
2. Create upsell sale -> appears in list.
3. Stats endpoint returns expected `count`/`revenue`.
4. Validation errors (bad decimal, missing required fields) -> 400.
5. Unauthorized access -> 401.

**Definition of Done:**

- [ ] Все новые integration tests green.
- [ ] Нет регресса в текущих tests (`auth/customers/instances/integration-route`).

**Промпт для простой модели:**

```text
Добавь integration tests для box-sales и upsell-sales:
create/list/detail/update/stats + negative validation + unauthorized.
Запусти test:run для @esc-admin/api и исправь падения.
```

---

### T5 — Web shell: layout, auth guard, routes

**Цель:** уйти от placeholder shell к рабочему каркасу приложения.

**Файлы (создать/обновить):**

- `apps/web/src/App.tsx`
- `apps/web/src/layouts/AppLayout.tsx`
- `apps/web/src/components/SidebarNav.tsx`
- `apps/web/src/features/auth/*` (если ещё нет: session/token guard)
- `apps/web/src/pages/LoginPage.tsx`

**Обязательные маршруты Sprint 3:**

- `/login`
- `/`
- `/sales/boxes`
- `/sales/boxes/new`
- `/sales/upsells`
- `/sales/upsells/new`

**Definition of Done:**

- [ ] Неавторизованный пользователь уходит на `/login`.
- [ ] После логина доступен sidebar + sales routes.
- [ ] Нет fallback на placeholder для sales путей.

**Промпт для простой модели:**

```text
Собери рабочий web shell в apps/web:
AppLayout + Sidebar + auth guard + маршруты sales страниц.
Сохрани текущий стек React Router, без внешних UI-библиотек.
Нужно минимум для оператора: login и переходы на sales pages.
```

---

### T6 — Sales pages UI (list + create form)

**Цель:** сделать 4 рабочих страницы Sprint 3.

**Файлы (создать/обновить):**

- `apps/web/src/pages/sales/BoxSalesListPage.tsx`
- `apps/web/src/pages/sales/NewBoxSalePage.tsx`
- `apps/web/src/pages/sales/UpsellSalesListPage.tsx`
- `apps/web/src/pages/sales/NewUpsellSalePage.tsx`
- `apps/web/src/lib/apiClient.ts` (или эквивалент client wrapper)

**UI-минимум:**

- List pages: таблица (date, customer, sku/package, amount), pagination.
- Form pages: required поля, inline validation, submit, success redirect.
- Ошибки API показывать оператору понятным текстом.

**Definition of Done:**

- [ ] Box/upsell создаются через UI и видны в списках.
- [ ] Списки читают реальные API данные.
- [ ] Пустое состояние и ошибка запроса обработаны.

**Промпт для простой модели:**

```text
Реализуй 4 sales страницы в apps/web:
BoxSalesList, NewBoxSale, UpsellSalesList, NewUpsellSale.
Подключи к API /box-sales и /upsell-sales, сделай базовую валидацию форм,
после успешного создания редирект на соответствующий список.
```

---

### T7 — Документация, smoke, quality gates

**Цель:** завершить спринт как воспроизводимый инкремент.

**Обновить документы:**

- `docs/active/DEVELOPER_HANDBOOK.md`:
  - §0 quick lookup (добавить box/upsell модули и web pages)
  - §2 modules map (api + web additions)
  - §3 API status (sales endpoints -> implemented)
  - §10 roadmap (Chunk 4 -> implemented)
- `docs/active/TODO.md`:
  - отметить Chunk 4 выполненным
- `CURSOR_CONTEXT.md` и `docs/active/DOCUMENTATION_INDEX.md` (если менялись ссылки)

**Обязательные проверки перед PR:**

```powershell
corepack pnpm check:no-any
corepack pnpm test:run
corepack pnpm build
corepack pnpm smoke
```

**Definition of Done Sprint 3:**

- [ ] T1–T6 выполнены.
- [ ] Quality gates green локально.
- [ ] Handbook и backlog синхронизированы с кодом.
- [ ] Подготовлен PR в `develop` с test plan.

**Промпт для простой модели:**

```text
Заверши Sprint 3:
обнови DEVELOPER_HANDBOOK.md и TODO.md под фактические изменения Chunk 4,
прогони check:no-any, test:run, build, smoke.
Составь краткий test plan и список изменённых модулей.
```

---

## 4. Календарный план (10 дней)

| День | Блок | Выход |
|:----:|------|-------|
| 1 | T1 | зафиксирован validation contract |
| 2–3 | T2 | box-sales API + stats |
| 4 | T3 | upsell-sales API + stats |
| 5 | T4 | integration tests + стабилизация API |
| 6 | T5 | web shell и навигация |
| 7–8 | T6 | sales pages list/form |
| 9 | T7 (часть 1) | full quality gates |
| 10 | T7 (часть 2) | docs sync + demo + PR |

---

## 5. Риски и контрмеры

| Риск | Влияние | Контрмера |
|------|---------|-----------|
| Слабая модель начинает “рефакторить всё” | Потеря времени, регресс | Жёсткий task-by-task протокол T1→T7 |
| UI раньше стабильного API | Переделки фронта | Backend freeze к концу дня 5 |
| Непоследовательные decimal/date форматы | Ломаются формы/статистика | Единые validators и тест-кейсы на формат |
| Документация не обновлена | Следующий агент работает вслепую | T7 обязателен, без него спринт не закрыт |

---

## 6. Финальный smoke-чеклист

```text
[ ] POST /auth/login -> token
[ ] POST /box-sales -> 201
[ ] GET /box-sales -> запись видна
[ ] GET /box-sales/stats -> count/revenue корректны
[ ] POST /upsell-sales -> 201
[ ] GET /upsell-sales -> запись видна
[ ] GET /upsell-sales/stats -> count/revenue корректны
[ ] UI /sales/boxes -> list отображается
[ ] UI /sales/boxes/new -> create + redirect
[ ] UI /sales/upsells -> list отображается
[ ] UI /sales/upsells/new -> create + redirect
[ ] check:no-any + test:run + build + smoke -> green
```

---

## 7. Что идёт сразу после Sprint 3

**Sprint 4 recommendation:** Chunk 5 + Chunk 6 (price lists + licenses/codes), чтобы закрыть полный контур “продажа -> лицензия -> код -> verify”.

Связанные разделы:

- [`TODO.md`](TODO.md) § Chunk 5, Chunk 6
- [`VENDOR_ADMIN_SPEC.md`](VENDOR_ADMIN_SPEC.md) §8.8–§8.9, §7

---

## 8. Связанные документы

| Документ | Зачем |
|----------|-------|
| [`VENDOR_ADMIN_SPEC.md`](VENDOR_ADMIN_SPEC.md) §8.6–§8.7 | Канон sales API |
| [`DEVELOPER_HANDBOOK.md`](DEVELOPER_HANDBOOK.md) | Фактическая карта модулей |
| [`TODO.md`](TODO.md) | Backlog и прогресс chunk 4+ |
| [`IMPLEMENTATION_SPRINT_2.md`](IMPLEMENTATION_SPRINT_2.md) | Предыдущий завершённый спринт |
