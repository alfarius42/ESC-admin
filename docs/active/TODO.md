# ESC-Admin — активный backlog

> Обновляй статус при закрытии задач. Архивируй выполненное в `docs/archive/`.

## MVP (генерация по чанкам)

См. `VENDOR_ADMIN_SPEC.md` §18 (план чанков 0–12).

| # | Задача | Статус |
|---|--------|--------|
| 0 | Monorepo skeleton, docker, migrate | ⬜ |
| 1 | `packages/license-signing` + tests | ⬜ |
| 2 | API: config, db, auth | ⬜ |
| 3 | customers, instances | ⬜ |
| 4 | boxSales, upsellSales | ⬜ |
| 5 | priceLists + import-canon | ⬜ |
| 6 | licenses, codes (issue + verify) | ⬜ |
| 7 | dashboard, public API, support API | ⬜ |
| 8 | web shell (layout, auth) | ⬜ |
| 9 | sales UI + instance Box ID | ⬜ |
| 10 | pricing, codes, SupportInbox | ⬜ |
| 11 | audit log, support e2e | ⬜ |
| 12 | README, интеграционная документация | ⬜ |

## Интеграция с ESC-Promo

| # | Задача | Статус |
|---|--------|--------|
| I1 | Совместимость подписи с `license/service.js` | ⬜ |
| I2 | Online verify-code (`VENDOR_INTEGRATION.md` §4.3) | ⬜ |
| I3 | Support chat + Box ID manual link | ⬜ |
| I4 | Cross-repo manual test checklist (§17 spec) | ⬜ |

## Phase 2 (не в MVP)

- RBAC multi-user
- activation-callback / heartbeat
- code revoke
- TOTP, email renewals, CSV export

## Связанные документы

### Референс продукта (локальные копии)

| Документ | Путь |
|----------|------|
| `API_CONTRACT.md` | `docs/reference/esc-promo/` |
| `ARCHITECTURE.md` | `docs/reference/esc-promo/` |
| `BOX_PRODUCT_SPEC.md` | `docs/reference/esc-promo/` |

### Только в ESC-Promo

| Документ | Зачем |
|----------|-------|
| `SUPPORT_CHAT.md` | Support chat protocol |
| `BUSINESS_MODEL.md` | SKU import-canon |
