# GitHub — правила репозитория

> Применено через GitHub API / Settings. JSON-шаблоны: `.github/branch-protection-*.json`

---

## Ветки на remote

| Ветка | Default | Назначение |
|-------|:-------:|------------|
| `develop` | ✅ | Интеграция, PR target для feature |
| `main` | | Production only |
| `feature/*` | | Создаются локально, push → CI |

**Default branch:** `develop` (новые PR и clone по умолчанию).

---

## Branch protection

### `develop`

| Правило | Значение |
|---------|----------|
| Pull request required | ✅ (0 approvals — solo workflow) |
| Status check | `quality-gates` (strict) |
| Force push | ❌ |
| Delete branch | ❌ |
| Enforce admins | ❌ |

### `main` (строже)

| Правило | Значение |
|---------|----------|
| Pull request required | ✅ |
| Status check | `quality-gates` (strict) |
| Force push | ❌ |
| Delete branch | ❌ |
| Enforce admins | ✅ |

**Merge в `main`:** только PR из `develop` (release), после green CI.

---

## CI (Actions)

Workflow: `.github/workflows/ci.yml`

| Событие | Ветки |
|---------|-------|
| `push` | `feature/**`, `develop` |
| `pull_request` | → `develop`, → `main` |

Check name для branch protection: **`quality-gates`**.

---

## Pull Request

- Шаблон: `.github/pull_request_template.md`
- Target по умолчанию: **`develop`**
- Release PR: `develop` → `main`

```bash
gh pr create --base develop --head feature/my-task
gh pr create --base main --head develop --title "release: v0.1.0"
```

---

## Повторное применение protection

```bash
gh api --method PUT repos/alfarius42/ESC-admin/branches/develop/protection \
  --input .github/branch-protection-develop.json

gh api --method PUT repos/alfarius42/ESC-admin/branches/main/protection \
  --input .github/branch-protection-main.json
```

---

## Связанные файлы

- `docs/active/GIT_WORKFLOW.md` — полный цикл разработки
- `.cursor/rules/git-workflow.mdc` — правила для агента
