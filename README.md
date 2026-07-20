# ESC-Admin (Regpoint Vendor Admin)

Внутренняя система vendor: учёт коробок и апсейлов, прайс-листы, генерация кодов активации, support inbox.

**Репозиторий:** [github.com/alfarius42/ESC-admin](https://github.com/alfarius42/ESC-admin)  
**Клиентский продукт:** [ESC-Promo](https://github.com/alfarius42/ESC-Promo) — референс в `docs/reference/esc-promo/`

## Навигация

| Файл | Назначение |
|------|------------|
| [docs/active/DEVELOPER_HANDBOOK.md](docs/active/DEVELOPER_HANDBOOK.md) | Карта модулей, API, env, troubleshooting |
| [CURSOR_CONTEXT.md](CURSOR_CONTEXT.md) | Быстрый индекс для агента |
| [docs/active/DOCUMENTATION_INDEX.md](docs/active/DOCUMENTATION_INDEX.md) | Полный индекс документации |
| [AGENTS.md](AGENTS.md) | Контекст Cursor (чанки, git) |

## Документация

| Раздел | Содержание |
|--------|------------|
| `docs/active/` | ТЗ admin (источник истины) |
| `docs/reference/esc-promo/` | **Референс коробки** — API, архитектура, product spec (копии ESC-Promo) |

## Стек (целевой)

Node 20 · Express 4 · MySQL 8 · React 18 · Vite 5 · Tailwind v4 · pnpm workspaces

## Git и ветки

| Ветка | Назначение |
|-------|------------|
| `feature/*` | Разработка → push → CI |
| `develop` | Merge после green CI + тестов |
| `main` | Только production |

Подробно: [docs/active/GIT_WORKFLOW.md](docs/active/GIT_WORKFLOW.md)

```bash
gh auth status
git checkout develop && git pull
git checkout -b feature/my-task
# ... commit, push, gh pr create --base develop
```

## Безопасность

`LICENSE_PRIVATE_KEY` — только backend; `.env` не в git.

---

## Ежедневный dev (PowerShell, Windows)

> Рекомендуемый режим: **MySQL в Docker**, API + Web **локально** (быстрее hot-reload).  
> Полный стек в Docker — см. [Полный Docker](#полный-docker-опционально).

### Первый раз (setup)

```powershell
cd C:\ESC-Admin
corepack enable
corepack pnpm install
Copy-Item .env.example .env
corepack pnpm db:up
Start-Sleep -Seconds 15
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm db:seed-dev
```

Если проект запускался до перехода на `001_initial.sql`, сначала сделай reset:

```powershell
corepack pnpm db:reset
Start-Sleep -Seconds 15
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm db:seed-dev
```

### Каждый день — старт

```powershell
cd C:\ESC-Admin
corepack pnpm db:up
corepack pnpm dev
```

- API: http://localhost:4000/status  
- Web: http://localhost:5174  
- MySQL: `localhost:3307` (user `vendor`, pass `vendor`, db `regpoint_vendor`)

### Каждый день — остановка

```powershell
# Ctrl+C в терминале с pnpm dev, затем:
corepack pnpm db:down
```

MySQL-данные сохраняются в Docker volume `mysqldata`.

### Smoke-проверка API

В **отдельном** терминале (API должен быть запущен):

```powershell
cd C:\ESC-Admin
corepack pnpm smoke
```

Или вручную:

```powershell
Invoke-RestMethod http://localhost:4000/status

$body = @{
  runtimeInstanceId = "a1b2c3d4e5f6g7h8i9j0k1l2"
  validUntil        = "2027-06-14T23:59:59.000Z"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri http://localhost:4000/api/v1/integrations/verify-instance-token `
  -Method Post `
  -Headers @{ "X-Instance-Token" = "replace-with-plain-token" } `
  -ContentType "application/json" `
  -Body $body
```

Dev token по умолчанию: `replace-with-plain-token` (см. `.env` → `INTEGRATION_INSTANCE_TOKEN_PLAIN`).

### Полезные команды

| Задача | Команда |
|--------|---------|
| Только API | `corepack pnpm dev:api` |
| Только Web | `corepack pnpm dev:web` |
| Логи MySQL | `corepack pnpm db:logs` |
| Миграции | `corepack pnpm db:migrate` |
| Seed admin user | `corepack pnpm db:seed` |
| Seed dev instance | `corepack pnpm db:seed-dev` |
| Тесты | `corepack pnpm test:run` |
| Сборка | `corepack pnpm build` |
| CI parity | `corepack pnpm check:no-any; corepack pnpm test:run; corepack pnpm build` |

### MySQL CLI (из Docker)

```powershell
docker compose exec mysql mysql -uvendor -pvendor regpoint_vendor
```

Пример запроса:

```sql
SELECT id, runtime_instance_id, instance_status, last_token_verified_at FROM instances;
```

### Сброс БД (dev)

```powershell
corepack pnpm db:reset
Start-Sleep -Seconds 15
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm db:seed-dev
```

---

## Полный Docker (опционально)

API + Web + MySQL в контейнерах (медленнее для разработки UI):

```powershell
cd C:\ESC-Admin
Copy-Item .env.example .env -ErrorAction SilentlyContinue
corepack pnpm docker:up
docker compose logs -f
```

Остановка:

```powershell
corepack pnpm docker:down
```

---

## Порты

Параллельный запуск с **ESC-Promo** (коробка) на одной машине — порты **разведены намеренно**.

| Сервис | ESC-Promo (коробка) | ESC-Admin (vendor) | Где задано |
|--------|---------------------|-------------------|------------|
| Web (Vite / nginx) | `3002` / `80` | **`5174`** | `apps/web/vite.config.mjs`, `WEB_PORT` |
| API (Express) | `3001` | **`4000`** | `PORT` в `.env` |
| MySQL (host) | `3306` | **`3307`** → `3306` в контейнере | `MYSQL_HOST_PORT`, `docker-compose.yml` |

Локальный dev (рекомендуемый): MySQL в Docker, API + Web локально.

| Сервис | URL / порт |
|--------|------------|
| API | http://localhost:4000/status |
| Web | http://localhost:5174 (`/api` проксируется на API) |
| MySQL | `localhost:3307` (user `vendor`, pass `vendor`, db `regpoint_vendor`) |
