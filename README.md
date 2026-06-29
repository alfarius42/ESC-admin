# ESC-Admin (Regpoint Vendor Admin)

Внутренняя система vendor: учёт коробок и апсейлов, прайс-листы, генерация кодов активации, support inbox.

**Репозиторий:** [github.com/alfarius42/ESC-admin](https://github.com/alfarius42/ESC-admin)  
**Клиентский продукт:** [ESC-Promo](https://github.com/alfarius42/ESC-Promo) — референс в `docs/reference/esc-promo/`

## Навигация

| Файл | Назначение |
|------|------------|
| [CURSOR_CONTEXT.md](CURSOR_CONTEXT.md) | Быстрый индекс для агента |
| [docs/active/DOCUMENTATION_INDEX.md](docs/active/DOCUMENTATION_INDEX.md) | Полный индекс документации |
| [AGENTS.md](AGENTS.md) | Контекст Cursor (чанки, git) |

## Документация

| Раздел | Содержание |
|--------|------------|
| `docs/active/` | ТЗ admin (источник истины) |
| `docs/reference/esc-promo/` | **Референс коробки** — API, архитектура, product spec (копии ESC-Promo) |

## Стек (целевой)

Node 20 · Express 4 · PostgreSQL 16 · React 18 · Vite 5 · Tailwind v4 · pnpm workspaces

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
