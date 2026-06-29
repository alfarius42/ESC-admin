# Полный индекс документации — ESC-Admin (Regpoint Vendor Admin)

Список документации репозитория. Обновлять при добавлении новых документов.

---

## Корень проекта

- **README.md** — описание проекта, стек, git setup.
- **CURSOR_CONTEXT.md** — легковесный индекс для навигации (начинать с него).
- **AGENTS.md** — контекст для Cursor-агента (чанки, git, документация).
- **.cursor/rules/** — правила Cursor (стандарты, git, TypeScript, документация, процесс).

---

## Актуальная документация admin (`docs/active/`)

Документы **этого репозитория** — источник истины для vendor-admin.

- **DOCUMENTATION_INDEX.md** (этот файл) — полный индекс.
- **VENDOR_ADMIN_SPEC.md** — **implementation-ready ТЗ:** API §8, SQL, UI, чанки генерации 0–12.
- **VENDOR_INTEGRATION.md** — интеграция admin ↔ коробка: token, verify-code, deploy, offline-first.
- **TODO.md** — backlog MVP admin и чеклист интеграции с ESC-Promo.
- **GIT_WORKFLOW.md** — ветки feature → develop → main, CI, PR.
- **GITHUB_RULES.md** — branch protection, default branch, PR template, CI checks.

---

## CI/CD

- **`.github/workflows/ci.yml`** — GitHub Actions: push `feature/**`, `develop`; PR → `develop`, `main`.
- Quality gates (после Chunk 0): `pnpm check:no-any`, `test:run`, `build`.

## Референс продукта (`docs/reference/esc-promo/`)

> **Копии из ESC-Promo.** Описывают **клиентскую коробку**, не admin API.  
> См. [README](../reference/esc-promo/README.md) — правила синхронизации.

- **API_CONTRACT.md** — канонический REST-контракт коробки (activate, integration endpoints).
- **ARCHITECTURE.md** — архитектура модульного монолита ESC-Promo, trust boundary §5.4.
- **BOX_PRODUCT_SPEC.md** — спецификация коробки: Docker, лицензия, activation codes, lifecycle.

---

## Архив (`docs/archive/`)

Устаревшие или заменённые документы admin. При переносе — дата в commit message.

---

## Логика поиска

1. **CURSOR_CONTEXT.md** — категория и быстрый выбор документа.
2. **DOCUMENTATION_INDEX.md** (этот файл) — полный список.
3. Интеграция с коробкой → `VENDOR_INTEGRATION.md` + референс `docs/reference/esc-promo/API_CONTRACT.md` §2.
4. Реализация admin API → `VENDOR_ADMIN_SPEC.md` §8 (не путать с API_CONTRACT коробки).

---

## Конвенции (как в ESC-Promo)

- **Сначала документация, потом код** — см. `.cursor/rules/development-process.mdc`.
- Новые admin-спеки → `docs/active/`, имя `SCREAMING_SNAKE.md`, запись в этот индекс.
- Референс продукта **не редактировать** здесь — обновлять в ESC-Promo и перекопировать.
- Деньги в admin API — строки `"180000.00"`; даты — ISO 8601 UTC.

---

## Вне ESC-Admin (только ссылка, без копии)

| Документ | Репозиторий | Зачем admin |
|----------|-------------|-------------|
| `SUPPORT_CHAT.md` | ESC-Promo | Support chat protocol |
| `BUSINESS_MODEL.md` | ESC-Promo | SKU import-canon §6 |
| `PRODUCT_LINE.md` | ESC-Promo | Модули Регпоинт |
