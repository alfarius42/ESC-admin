# Cursor Context — индекс ключевых документов

> **Цель:** быстрая навигация без загрузки всех файлов.  
> **Использование:** начать с этого файла; подгружать документы только по необходимости.  
> **Если не нашли:** искать в `docs/active/DOCUMENTATION_INDEX.md`.

---

## Быстрый старт

### При начале работы

1. **`.cursor/rules/`** — правила проекта (уже применяются агентом).
2. **`README.md`** — описание и запуск.
3. **`docs/active/`** — ТЗ и backlog admin (подгружать по задаче).
4. **`docs/reference/esc-promo/`** — референс **клиентского продукта** (не канон admin API).

### Документация по задачам

| Задача | Документ |
|--------|----------|
| **Карта кода, модули, ops (support / onboarding)** | `docs/active/DEVELOPER_HANDBOOK.md` (§0 quick lookup) |
| Быстрый старт | `README.md` (ежедневный dev, PowerShell) |
| Генерация кодовой базы admin | `docs/active/VENDOR_ADMIN_SPEC.md` §0, §18 (чанки) |
| **Скелетон + граница API ESC-Promo** | `docs/active/ADMIN_SKELETON_SPEC.md` |
| Backlog MVP | `docs/active/TODO.md` |
| **Активный спринт (Chunk 5 price lists)** | `docs/active/TODO.md` § Chunk 5 |
| Завершённый Sprint 3 (Chunk 4 + Web Shell) | `docs/active/IMPLEMENTATION_SPRINT_3.md` |
| Завершённый Sprint 1 (Chunk 0 → 1) | `docs/active/IMPLEMENTATION_NEAREST_TASKS.md` |
| Завершённый Sprint 2 (Chunk 2 → 3) | `docs/active/IMPLEMENTATION_SPRINT_2.md` |
| Admin ↔ коробка, токены | `docs/active/VENDOR_INTEGRATION.md` |
| REST admin API | `docs/active/VENDOR_ADMIN_SPEC.md` §8 |
| Activate / verify на коробке | `docs/reference/esc-promo/API_CONTRACT.md` §2 |
| Формат activation code | `docs/reference/esc-promo/BOX_PRODUCT_SPEC.md` §4 |
| Trust boundary | `docs/reference/esc-promo/ARCHITECTURE.md` §5.4 |

---

## Категории

### Admin (источник истины — этот репо)

- **`docs/active/DEVELOPER_HANDBOOK.md`** — module map, фактическое состояние кода, env, flows, troubleshooting; обновлять с кодом (`.cursor/rules/documentation.mdc`).
- **`docs/active/ADMIN_SKELETON_SPEC.md`** — Chunk 0 skeleton, жёсткая граница API с ESC-Promo.
- **`docs/active/VENDOR_ADMIN_SPEC.md`** — полное ТЗ vendor-admin.
- **`docs/active/VENDOR_INTEGRATION.md`** — offline-first, per-instance token, verify-code.
- **`docs/active/TODO.md`** — прогресс чанков 0–12.
- **`docs/active/IMPLEMENTATION_SPRINT_3.md`** — завершённый Sprint 3: Chunk 4 + Web Shell.
- **`docs/active/IMPLEMENTATION_SPRINT_2.md`** — завершённый Sprint 2 (Chunk 2 + Chunk 3).
- **`docs/active/IMPLEMENTATION_NEAREST_TASKS.md`** — завершённый Sprint 1 (Chunk 0 → Chunk 1).

### Референс продукта ESC-Promo (копии, read-only)

> Строим admin **для** этой коробки. Не путать с admin API.

- **`docs/reference/esc-promo/API_CONTRACT.md`** — канон REST коробки.
- **`docs/reference/esc-promo/ARCHITECTURE.md`** — модульный монолит, границы доверия.
- **`docs/reference/esc-promo/BOX_PRODUCT_SPEC.md`** — лицензия и lifecycle на VPS клиента.
- **`docs/reference/esc-promo/README.md`** — правила синхронизации с ESC-Promo.

### Только в ESC-Promo (не копируем)

- **`SUPPORT_CHAT.md`**, **`BUSINESS_MODEL.md`**, **`PRODUCT_LINE.md`** — открывать в репо продукта.

### Индекс и процесс

- **`docs/active/DOCUMENTATION_INDEX.md`** — полный индекс.
- **`docs/active/GIT_WORKFLOW.md`** — feature → develop → main, CI, PR.
- **`docs/active/GITHUB_RULES.md`** — branch protection, default branch, PR policy.
- **`.cursor/rules/development-process.mdc`** — docs-first, формат коммитов.
- **`.cursor/rules/git-workflow.mdc`** — ветки и merge policy.

---

## Логика поиска

1. Открыть этот файл → найти категорию → подгрузить один документ.
2. Не нашли → `DOCUMENTATION_INDEX.md`.
3. Вопрос про коробку → `docs/reference/esc-promo/`; про admin API → `VENDOR_ADMIN_SPEC.md` §8.

---

## Экономия токенов

- Не загружать все документы сразу.
- Референс ESC-Promo — только нужные § (activate, license format).
- При добавлении ключевых документов обновлять этот файл и `DOCUMENTATION_INDEX.md`.
