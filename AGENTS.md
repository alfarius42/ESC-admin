# AGENTS — контекст для Cursor

## Проект

**ESC-Admin** — vendor-side admin для линейки Регпоинт.  
**Клиент:** ESC-Promo (коробка). Активация offline-first.

## Навигация

| Задача | Файл |
|--------|------|
| **Support / module map (human + AI)** | `docs/active/DEVELOPER_HANDBOOK.md` |
| Быстрый старт | `CURSOR_CONTEXT.md` |
| Полный индекс | `docs/active/DOCUMENTATION_INDEX.md` |
| ТЗ admin | `docs/active/VENDOR_ADMIN_SPEC.md` |
| Интеграция admin ↔ коробка | `docs/active/VENDOR_INTEGRATION.md` |
| Backlog | `docs/active/TODO.md` |
| **Активный спринт** | `docs/active/IMPLEMENTATION_SPRINT_2.md` |
| **Референс продукта** | `docs/reference/esc-promo/` |

## Два канона (не путать)

| Система | Документ |
|---------|----------|
| Admin API | `VENDOR_ADMIN_SPEC.md` §8 |
| Коробка (референс) | `docs/reference/esc-promo/API_CONTRACT.md` |

## Генерация кодовой базы

Чанки 0–12 последовательно (`VENDOR_ADMIN_SPEC.md` §18). После чанка — `pnpm test:run`.

## Правила проекта

| Файл | Назначение |
|------|------------|
| `.cursor/rules/project-overview.mdc` | Контекст, API contract, docs index |
| `.cursor/rules/reference-boundary.mdc` | Read-only референс ESC-Promo |
| `.cursor/rules/typescript-standards.mdc` | TS, envelope, license signing |
| `.cursor/rules/git-workflow.mdc` | Remote, ветки, CI (детали — User Rules) |

**Handbook:** `docs/active/DEVELOPER_HANDBOOK.md` — обновлять с кодом.

## Git

Remote: `https://github.com/alfarius42/ESC-admin`.

**Ветки:** `feature/*` → PR в `develop` (CI green) → `main` только для production.  
См. `docs/active/GIT_WORKFLOW.md`, `.cursor/rules/git-workflow.mdc`.

Коммит/push — только по запросу пользователя (User Rules).
