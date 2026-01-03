# 📊 Инвентаризация структуры проекта — Точный снимок

**Дата:** 3 января 2026  
**Цель:** Определение текущей структуры и правил для безопасной реорганизации

---

## 1️⃣ Текущая структура репозитория

```
smetalab v6/
├── app/                          # Frontend (React + MUI)
│   ├── admin/
│   ├── counterparties/
│   ├── dashboard/
│   ├── estimate-templates/
│   ├── estimates/
│   │   └── components/          # ← 10 компонентов из R4
│   ├── landing/
│   ├── layout/
│   ├── menu-items/
│   ├── pages/
│   ├── projects/
│   ├── purchases/
│   ├── references/
│   ├── routes/
│   ├── sample-page/
│   ├── test/
│   └── utilities/
├── server/                       # Backend (Express)
│   ├── controllers/
│   ├── middleware/
│   ├── repositories/
│   ├── routes/
│   └── services/
├── shared/                       # Shared code (contexts, utils)
│   └── lib/
├── tests/                        # Тесты (ОТДЕЛЬНАЯ ПАПКА)
│   ├── unit/
│   │   ├── estimates/
│   │   └── ...
│   ├── integration/
│   ├── security/
│   └── production/
├── database/                     # Migrations, seeds, schema docs
├── scripts/                      # DB management scripts
├── utils-scripts/                # Utility scripts
├── _archived-scripts/            # Archived scripts
├── docs/                         # Documentation
├── templates/                    # Templates
├── backups/                      # Backups
├── public/                       # Static assets
├── metrics/                      # Metrics
├── coverage/                     # Test coverage (generated)
├── dist/                         # Build output (generated)
├── playwright-report/            # E2E reports (generated)
├── test-results/                 # Test results (generated)
├── .github/                      # GitHub Actions
├── .vercel/                      # Vercel config (generated)
├── .yarn/                        # Yarn cache
├── node_modules/                 # Dependencies
│
├── README.md                     # Main documentation
├── package.json
├── vite.config.mjs
├── vitest.config.mjs
├── jsconfig.json
├── eslint.config.mjs
├── render.yaml
├── vercel.json
├── playwright.config.js
│
└── [25 .md/.txt файлов]         # ← БАРДАК (см. п.2)
```

---

## 2️⃣ Список файлов, которые "мешают" в корне

### Категория 1: Отчёты рефакторинга (AI-генерируемые)
- `R4_DECOMPOSITION_COMPLETE.md` ✅ (только что создан)
- `R4_DECOMPOSITION_PLAN.md`
- `R3_BATCH1_SESSION_LOG.md`
- `R3_MIGRATION_CHECKLIST.md`
- `R3_SESSION_SUMMARY.md`
- `R3_STORAGE_SERVICE_PLAN.md`
- `R2_PROGRESS_LOG.md`
- `R5_ERROR_BOUNDARIES_PLAN.md`
- `R5_PHASE_C_PR_DESCRIPTION.md`
- `R5_PR_DESCRIPTION.md`

### Категория 2: Фикс-репорты / Аналитика
- `AUTO_CALCULATE_MATERIALS.md`
- `EXCEL_EXPORT_FIX.md`
- `INTEGRATION_TESTS_FIX_SUMMARY.md`
- `MATERIALS_CATALOG_DEEP_ANALYSIS.md`
- `MATERIALS_SEARCH_FIX.md`
- `MATERIALS_SEARCH_OPTIMIZATION_REPORT.md`
- `MATERIALS_SEARCH_TECHNICAL_VALIDATION.md`
- `MONOLITHIC_COMPONENTS_ANALYSIS.md`
- `PHASE1_COMPLETION_REPORT.md`
- `QUICK_START_SEARCH_OPTIMIZATION.md`
- `WEIGHT_CALCULATION_FEATURE.md`
- `PRICE_EDITING_SUMMARY.txt`

### Категория 3: Операционные документы
- `ROLLBACK_RUNBOOK.md` (может быть полезен)
- `TEST_QUARANTINE.md` (карантин тестов)

### Категория 4: Другое
- `Доступы` (файл без расширения) ⚠️ **УДАЛИТЬ** (чувствительные данные!)
- `Claude.md` (AI session log)

**Итого в корне:** ~25 .md/.txt файлов, которые должны быть в `/docs` или `/archive`.

---

## 3️⃣ Что должно остаться в корне (продакшен-код)

**Обязательно в корне:**
```
smetalab v6/
├── app/                  # Frontend source code
├── server/               # Backend source code
├── shared/               # Shared code
├── tests/                # Тесты (ТЕКУЩАЯ СТРУКТУРА)
├── database/             # Migrations & schema
├── scripts/              # Operational scripts
├── public/               # Static assets
├── README.md             # Main docs
├── package.json
├── vite.config.mjs
├── vitest.config.mjs
├── jsconfig.json
├── eslint.config.mjs
├── render.yaml
├── vercel.json
├── playwright.config.js
└── .env*, .gitignore, etc.
```

**Что УБРАТЬ из корня:**
- ❌ Все отчёты рефакторинга (R2-R5)
- ❌ Все фикс-репорты (MATERIALS_*, EXCEL_*, etc.)
- ❌ Claude.md
- ❌ Доступы

---

## 4️⃣ Предпочтения по тестам

**Текущая структура:** **B. Отдельная папка `tests/`** ✅

```
tests/
├── unit/
│   ├── estimates/
│   │   └── components/
│   │       ├── EstimateTable.test.jsx
│   │       ├── EstimateHeader.test.jsx
│   │       └── ...
│   └── ...
├── integration/
├── security/
└── production/
```

**Рекомендация:** **Оставить как есть** (отдельная папка `tests/`).

**Почему:**
- ✅ Уже настроено в `vitest.config.mjs` (`include: ['tests/unit/**/*.test.{js,jsx}']`)
- ✅ Чистое разделение: code vs tests
- ✅ Проще управлять CI/CD (run tests separately)
- ✅ 140 тестов уже написаны по этой структуре

**НЕ менять** на "тесты рядом с кодом" — это потребует:
- Переписать все пути в 140 тестах
- Изменить vitest.config.mjs
- Риск регрессий

---

## 5️⃣ Что делать с инструкциями / аналитикой

### 1. Инструкции по рефакторингу (R2-R5):
- ✅ **Часть репо** (важна для команды/onboarding)
- 📁 **Переместить в:** `/docs/refactoring/`
- Пример:
  ```
  docs/
  └── refactoring/
      ├── R2_PROGRESS_LOG.md
      ├── R3_MIGRATION_CHECKLIST.md
      ├── R4_DECOMPOSITION_COMPLETE.md ← только что создан
      ├── R5_ERROR_BOUNDARIES_PLAN.md
      └── ...
  ```

### 2. Фикс-репорты / Аналитика:
- ✅ **Часть репо** (могут быть полезны при отладке)
- 📁 **Переместить в:** `/docs/technical/`
- Пример:
  ```
  docs/
  └── technical/
      ├── MATERIALS_SEARCH_FIX.md
      ├── EXCEL_EXPORT_FIX.md
      ├── WEIGHT_CALCULATION_FEATURE.md
      └── ...
  ```

### 3. Операционные документы:
- `ROLLBACK_RUNBOOK.md` → `/docs/operations/`
- `TEST_QUARANTINE.md` → `/docs/testing/`

### 4. Рабочие заметки / AI-логи:
- `Claude.md` → `/docs/ai-sessions/` или удалить
- `Доступы` → **УДАЛИТЬ из репо** (чувствительные данные!)

**Итоговая структура `/docs`:**
```
docs/
├── refactoring/        # R2-R5 отчёты
├── technical/          # Фиксы, аналитика
├── operations/         # ROLLBACK_RUNBOOK.md
├── testing/            # TEST_QUARANTINE.md
└── ai-sessions/        # (опционально) Claude.md
```

---

## 6️⃣ Требования от инструментов

### Path aliases (jsconfig.json + vite.config.mjs):
```json
"paths": {
    "app/*": ["app/*"],
    "shared/*": ["shared/*"],
    "views/*": ["app/*"]
}
```
- ✅ **Можно использовать:** `import ... from 'app/estimates/...'`
- ⚠️ **НЕ трогать:** пути `app/`, `shared/` (они в jsconfig.json)

### Vitest:
```javascript
include: [
  'tests/unit/**/*.test.{js,jsx}',
  'tests/integration/**/*.test.{js,jsx}',
  'tests/security/**/*.test.{js,jsx}',
  'tests/production/**/*.test.{js,jsx}'
]
```
- ⚠️ **НЕ переносить тесты** в другую структуру

### Vercel:
- Root expected: `vite.config.mjs`, `package.json`, `vercel.json`
- ✅ Не требует изменений (build from root)

### Render.com (backend):
- Root expected: `render.yaml`, `server/`
- ✅ Не требует изменений

**Вывод:**
- ✅ **Absolute imports используются** (`app/*`, `shared/*`)
- ⚠️ **Пути жёстко завязаны** — не ломать структуру `app/`, `shared/`, `tests/`
- ✅ **Можно безопасно перемещать** только `.md` файлы в `/docs`

---

## 🎯 Итоговая рекомендация

### Что можно (и нужно) сделать БЕЗОПАСНО:

1. ✅ Создать структуру `/docs`:
   ```
   docs/
   ├── refactoring/
   ├── technical/
   ├── operations/
   └── testing/
   ```

2. ✅ Переместить все `.md` файлы из корня в `/docs` (кроме `README.md`)

3. ✅ Удалить `Доступы` из репо (чувствительные данные)

4. ✅ Обновить `.gitignore` если нужно

### Что НЕ трогать:
- ❌ Структуру `app/`, `server/`, `shared/`, `tests/`
- ❌ Пути в `jsconfig.json`, `vitest.config.mjs`
- ❌ Config файлы (vite, vercel, render)

---

## 📋 План выполнения (следующий шаг)

### Шаг 1: Создать структуру директорий
```bash
mkdir docs\refactoring
mkdir docs\technical
mkdir docs\operations
mkdir docs\testing
mkdir docs\ai-sessions
```

### Шаг 2: Переместить файлы в `/docs/refactoring/`
```bash
mv R2_PROGRESS_LOG.md docs\refactoring\
mv R3_*.md docs\refactoring\
mv R4_*.md docs\refactoring\
mv R5_*.md docs\refactoring\
mv PHASE1_COMPLETION_REPORT.md docs\refactoring\
```

### Шаг 3: Переместить файлы в `/docs/technical/`
```bash
mv AUTO_CALCULATE_MATERIALS.md docs\technical\
mv EXCEL_EXPORT_FIX.md docs\technical\
mv INTEGRATION_TESTS_FIX_SUMMARY.md docs\technical\
mv MATERIALS_*.md docs\technical\
mv MONOLITHIC_COMPONENTS_ANALYSIS.md docs\technical\
mv PRICE_EDITING_SUMMARY.txt docs\technical\
mv QUICK_START_SEARCH_OPTIMIZATION.md docs\technical\
mv WEIGHT_CALCULATION_FEATURE.md docs\technical\
```

### Шаг 4: Переместить операционные файлы
```bash
mv ROLLBACK_RUNBOOK.md docs\operations\
mv TEST_QUARANTINE.md docs\testing\
mv Claude.md docs\ai-sessions\
```

### Шаг 5: Удалить чувствительные данные
```bash
rm Доступы
```

### Шаг 6: Закоммитить изменения
```bash
git add .
git commit -m "chore: Reorganize documentation into /docs structure

- Move refactoring reports to docs/refactoring/
- Move technical docs to docs/technical/
- Move operational docs to docs/operations/
- Move testing docs to docs/testing/
- Remove sensitive files from repository
- Clean up root directory (25+ .md files moved)

No code changes, only file organization."
```

---

## ✅ Критерии успеха

После выполнения:
- ✅ Корень содержит только продакшен-файлы
- ✅ Все документы организованы по категориям в `/docs`
- ✅ Чувствительные данные удалены
- ✅ Тесты проходят (структура не изменена)
- ✅ Build работает (пути не изменены)
- ✅ Git history чистая (один коммит для реорганизации)
