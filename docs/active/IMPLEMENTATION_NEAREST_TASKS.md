# План внедрения: ближайшие задачи (Chunk 0 → Chunk 1)

> **Статус:** completed (Sprint 1 закрыт 2026-06-29)  
> **Следующий спринт:** [`IMPLEMENTATION_SPRINT_2.md`](IMPLEMENTATION_SPRINT_2.md)
> **Горизонт:** ближайшие 5–7 рабочих дней  
> **Цель:** запустить минимальный каркас `ESC-Admin` и подготовить базу для чанков 2+ без блокеров.

---

## 0. Оперативный статус (2026-06-29)

### Уже внедрено

- [x] Monorepo skeleton (`apps/api`, `apps/web`, `packages/license-signing`, workspaces, root scripts).
- [x] Docker-compose с MySQL 8 + Dockerfile для API/Web.
- [x] API skeleton: `/status`, `/status/health`, `/api/v1/integrations/verify-instance-token`, stubs `501`.
- [x] DB skeleton: `001_skeleton.sql`, migrate/seed scripts для test instance.
- [x] `verify-instance-token` переведён на DB-backed проверку token hash (с env fallback для тестов).
- [x] Добавлен timeout middleware для integration routes (`INTEGRATION_TOKEN_VERIFY_TIMEOUT_MS`).
- [x] Chunk 1 core: `license-signing` (`base64url`, `sign`, `parse`, `verify`, `capabilities`) + unit tests.
- [x] Исправлен баг зацикливания/глубокой рекурсии в parser (`code/envelope` wrappers): добавлен лимит вложенности + тест.
- [x] Chunk 2 (partial): auth module (`/auth/login`, `/auth/me`, `/auth/logout`) + `requireAuth`.
- [x] Chunk 2 (partial): db scaffolding `db/client.ts`, migration runner по всем `.sql`, `db:seed` для admin user.
- [x] Chunk 2 (partial): `001_initial.sql` (полная schema §10) добавлена вместо skeleton migration.
- [x] Auth переведён на strict DB-only login (fallback отключён).
- [x] Прогнаны quality gates: `check:no-any`, `test:run`, `build` — green.

### В работе / осталось до закрытия ближайшего этапа

- [ ] Cross-check совместимости подписи с конкретным ключом/потоком из ESC-Promo (вне unit-тестов пакета).
- [x] Обновить `TODO.md` по фактически закрытым пунктам Chunk 0/1.
- [x] Подготовить вход в Chunk 2: ORM decision log + каркас auth/db modules.
- [x] Закрыть clean-path Chunk 2: strict DB-only login + отказ от legacy seed fallback.
- [ ] Закрыть оставшиеся пункты Chunk 2 (ORM слой + привязка auth/login к реальному seeded user через живую БД в smoke).

---

## 1. Приоритеты на сейчас

### P0 — запустить skeleton (Chunk 0)

1. Подготовить monorepo структуру (`pnpm-workspace.yaml`, root `package.json`, `apps/api`, `apps/web`, `packages/license-signing` stub).
2. Поднять MySQL 8 в `docker-compose.yml` и добавить базовые Dockerfile для `api`/`web`.
3. Реализовать в `apps/api`:
   - `GET /status`
   - `GET /status/health`
   - `POST /api/v1/integrations/verify-instance-token`
   - заглушки `501`: `/api/v1/integrations/verify-code`, `/api/v1/auth/login`
4. Добавить минимальную миграцию `001_skeleton.sql` для таблицы `instances` и seed test-instance.
5. Проверить acceptance Chunk 0 из `ADMIN_SKELETON_SPEC.md` §7.

### P1 — закрыть крипто-базу (Chunk 1)

1. Реализовать `packages/license-signing` по `VENDOR_ADMIN_SPEC.md` §7.
2. Зафиксировать формат envelope и parse-ветки (b64url.sig / JSON envelope / plain JSON).
3. Написать обязательные unit-тесты `sign/verify/parse`.
4. Провести cross-check на совместимость подписи с логикой ESC-Promo.

### P2 — снизить риск следующего шага (под Chunk 2)

1. Подготовить каркас `db:migrate`/`db:seed`.
2. Утвердить выбор ORM (Drizzle recommended).
3. Подготовить `.env.example` с полным набором переменных для API/auth/signing.

---

## 2. Ближайшие задачи по дням

## Day 1 — инфраструктура skeleton

- [x] Создать структуру репозитория по `ADMIN_SKELETON_SPEC.md` §5.2.
- [x] Настроить root scripts: `dev`, `build`, `test:run`, `docker:up`, `docker:down`.
- [x] Добавить `docker-compose.yml` (MySQL + api + web) и healthcheck БД.
- [x] Подготовить `.env.example` (integration timeout, check interval, базовые API переменные).

## Day 2 — API skeleton + интеграционный endpoint

- [x] Поднять Express app (`app.ts`, `index.ts`, error handler, `apiResponse`).
- [x] Реализовать `instanceTokenAuth` через `sha256(X-Instance-Token)`.
- [x] Реализовать `/status`, `/status/health`, `/integrations/verify-instance-token`.
- [x] Добавить `501 NOT_IMPLEMENTED` для `/integrations/verify-code` и `/auth/login` (позже заменён реальной auth-реализацией Chunk 2).
- [x] Добавить timeout на integration routes (`<= 3000ms`).

## Day 3 — DB skeleton + smoke

- [x] Добавить `001_skeleton.sql` (таблица `instances`) и seed test token hash.
- [x] Подключить API к MySQL (минимальный repository для verify-token).
- [x] Проверить 200/401 сценарии для `verify-instance-token`.
- [x] Проверить `pnpm build` и `pnpm test:run` (smoke).

## Day 4 — Web placeholder + dev DX

- [x] Поднять Vite React shell (`App.tsx`, `PlaceholderPage.tsx`, stub `/login`).
- [x] Убедиться, что web доступен на `:5174`.
- [x] Проверить, что в web bundle нет приватных ключей.

## Day 5 — Chunk 1 (license-signing)

- [x] Реализовать `types/base64url/sign/verify/parse/capabilities`.
- [x] Покрыть unit-тестами roundtrip + invalid key + parse форматов.
- [ ] Сделать совместимость с ESC-Promo `license/service.js` обязательным чекпойнтом.

## Day 6 — Chunk 2 (старт)

- [x] Добавить auth-модуль (`/auth/login`, `/auth/me`, `/auth/logout`).
- [x] Добавить `requireAuth` middleware (JWT Bearer).
- [x] Добавить db scaffolding (`db/client.ts`, multi-file migration runner, `db:seed`).
- [x] Закрыть оставшиеся middleware/utils (`rateLimit`, `pagination`, `cryptoAtRest`).

---

## 3. Технический чеклист внедрения

### 3.1 Репозиторий и скрипты

- [ ] `pnpm-workspace.yaml` подключает `apps/*` и `packages/*`
- [ ] root `package.json` содержит команды из `ADMIN_SKELETON_SPEC.md` §5.6
- [ ] команды запускаются из PowerShell без ручного `cd`

### 3.2 Docker и окружение

- [ ] MySQL 8 в compose (порт, volume, healthcheck)
- [ ] `apps/api` и `apps/web` имеют Dockerfile
- [ ] `.env.example` синхронизирован с `VENDOR_ADMIN_SPEC.md` §12
- [ ] секреты не попадают в git

### 3.3 API контракты

- [ ] единый envelope `{ success, data, error }`
- [ ] `verify-instance-token` возвращает коды ошибок по канону (401/403/404)
- [ ] недоступность admin не нарушает offline-first принцип для коробки

### 3.4 Тестирование и критерии готовности

- [ ] `pnpm build` green
- [ ] `pnpm test:run` green
- [ ] ручной smoke по Chunk 0 acceptance (`ADMIN_SKELETON_SPEC.md` §7)

---

## 4. Риски и меры

| Риск | Влияние | Мера |
|------|---------|------|
| Несовместимость подписи с ESC-Promo | Коды не активируются на коробке | Сразу в Chunk 1 сделать cross-check roundtrip с тем же `LICENSE_PUBLIC_KEY` |
| Разнобой env между локальным и docker | Нестабильный запуск | Единый `.env.example` + фиксированные default значения |
| Смещение границы API (добавим лишние online вызовы) | Нарушение offline-first | Следовать `ADMIN_SKELETON_SPEC.md` §3: periodic только `verify-instance-token` |
| Утечка приватного ключа | Критичный security инцидент | Private key только backend env, проверка bundle и gitignore |

---

## 5. Definition of Done (ближайший этап)

Этап считается завершённым, когда:

1. Chunk 0 полностью закрыт по acceptance из `ADMIN_SKELETON_SPEC.md` §7.
2. Chunk 1 закрыт по `VENDOR_ADMIN_SPEC.md` §7 (код + тесты).
3. В `TODO.md` отмечены выполненные пункты `Подготовка`, `Chunk 0`, `Chunk 1`.
4. Есть короткий отчёт в PR: что сделано, чем проверено, какие риски остались.

---

## 6. Связанные документы

- `docs/active/TODO.md` — полный backlog 0–12 и интеграция
- `docs/active/ADMIN_SKELETON_SPEC.md` — канон Chunk 0 и API boundary
- `docs/active/VENDOR_ADMIN_SPEC.md` — полное implementation-ready ТЗ
- `docs/active/VENDOR_INTEGRATION.md` — online/offline правила интеграции
