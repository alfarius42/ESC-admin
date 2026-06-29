# Git workflow — ESC-Admin

> **Модель:** feature → develop → main  
> **CI:** `.github/workflows/ci.yml` на GitHub Actions

---

## Ветки

| Ветка | Роль | Кто пушит |
|-------|------|-----------|
| `feature/*` | Разработка задачи/чанка | Developer / агент (локально + push) |
| `develop` | Интеграция, staging-проверки | Только через merge PR |
| `main` | **Production** | Только релизный PR из `develop` |

`main` не используется для ежедневной разработки.

---

## Стандартный цикл

```text
develop ──► feature/my-task ──► commit ──► push ──► CI
                                              │
                                              ▼
                                         PR → develop
                                              │
                              CI green + ручные тесты
                                              │
                                              ▼
                                         merge develop
                                              │
                         (когда готов релиз)  ▼
                                         PR → main
```

### 1. Начало задачи

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/vendor-admin-chunk-0
```

### 2. Работа и коммиты

```bash
# формат: <тип>: <описание>
git add ...
git commit -m "feat: monorepo skeleton and docker compose"
```

Типы: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`.

### 3. Push и CI

```bash
git push -u origin feature/vendor-admin-chunk-0
```

GitHub Actions запускает `ci` на push в `feature/**`.

### 4. Pull Request в develop

```bash
gh pr create --base develop --title "feat: monorepo skeleton" --body "$(cat <<'EOF'
## Summary
- ...

## Test plan
- [ ] pnpm test:run локально
- [ ] CI green
EOF
)"
```

CI также runs on `pull_request` → `develop`.

### 5. Merge

После **green CI** и ручного тестирования — merge PR в `develop` (squash или merge commit — на выбор maintainer).

### 6. Production (main)

Когда версия готова к продакшну:

```bash
gh pr create --base main --head develop --title "release: v0.1.0"
```

Merge в `main` только после проверки релиза. Деплой с `main`.

---

## CI (GitHub Actions)

| Триггер | Когда |
|---------|-------|
| `push` → `feature/**` | Каждый push feature-ветки |
| `push` → `develop` | После merge интеграции |
| `pull_request` → `develop`, `main` | PR review |

### Quality gates (после Chunk 0)

- `pnpm check:no-any`
- `pnpm test:run`
- `pnpm build`

До появления `package.json` CI проходит в режиме docs-only (placeholder).

---

## Локальные проверки перед PR

При наличии кода — прогнать локально то же, что CI:

```bash
pnpm install
pnpm check:no-any
pnpm test:run
pnpm build
```

---

## Первичная настройка remote

Если `develop` ещё нет на GitHub (после initial commit):

```bash
git checkout -b develop
git push -u origin develop
```

Рекомендуется в GitHub Settings → Branches:

- Default branch: `develop` (для PR) или оставить `main` с protection
- Protection `main`: require PR, require CI
- Protection `develop`: require CI

---

## Запреты

- Push фич напрямую в `main`
- Merge в `main` минуя `develop` (кроме documented hotfix — Phase 2)
- Force-push в `main` / `develop`
- Коммит секретов (`.env`, ключи)

---

## Связанные файлы

- `.cursor/rules/git-workflow.mdc` — правила для агента
- `.github/workflows/ci.yml` — pipeline
