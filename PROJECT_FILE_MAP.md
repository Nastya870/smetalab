# 📁 Полная карта файлов проекта SmetaLab

> **Дата обновления:** 2026-01-13  
> **Версия API:** 1.14.0  
> **Статус:** Production Ready ✅  
> **Последняя очистка:** ~84 MB удалено

## 📊 Легенда

| Метка | Значение |
|-------|----------|
| ✅ НУЖЕН | Актуальный, используется в prod |
| 🆕 НОВЫЙ | Недавно добавлен |
| ⚠️ УСТАРЕЛ | Старый, можно удалить |
| 🗑️ УДАЛИТЬ | Мусор, удалить |
| 📦 АРХИВ | Архивный, для истории |
| 🔧 УТИЛИТА | Вспомогательный скрипт |
| 📝 ДОКУМЕНТ | Документация |
| 🧪 ТЕСТ | Тестовый файл |

---

## 🌳 Структура проекта (после очистки)

```
smetalab v6/
├── 📁 .github/                          # ✅ CI/CD конфигурация
├── 📁 .vscode/                          # ✅ Настройки VS Code
├── 📁 .yarn/                            # ✅ Yarn конфигурация
├── 📁 app/                              # ✅ Frontend (React) — 151 файл
├── 📁 backups/                          # 📦 Бэкапы БД (1 файл)
├── 📁 database/                         # ✅ Миграции и схема БД — 88 файлов
├── 📁 db-export/                        # 📦 Экспорты данных
├── 📁 docs/                             # 📝 Документация — 57 файлов
├── 📁 export-for-edit/                  # 📦 CSV для редактирования
├── 📁 exports/                          # 📦 Экспорты
├── 📁 metrics/                          # 📦 Метрики
├── 📁 node_modules/                     # ✅ Зависимости (НЕ ТРОГАТЬ)
├── 📁 playwright-report/                # 🧪 E2E отчёты
├── 📁 public/                           # ✅ Статические ресурсы — 10 файлов
├── 📁 scripts/                          # 🔧 Скрипты — 63 файла
├── 📁 server/                           # ✅ Backend (Express.js) — 99 файлов
├── 📁 shared/                           # ✅ Общий код frontend — 118 файлов
├── 📁 templates/                        # ✅ Шаблоны документов
├── 📁 test-results/                     # 🧪 Результаты тестов
├── 📁 tests/                            # ✅ Тесты — 115 файлов
├── 📁 utils-scripts/                    # 🔧 Утилиты — 29 файлов
└── [25 корневых файлов]
```

---

## 📁 Корневые файлы (25 штук)

### Конфигурация — ✅ НУЖНЫ
| Файл | Описание |
|------|----------|
| `.env` | Переменные окружения (НЕ в git) |
| `.env.example` | Пример переменных |
| `.env.production` | Prod конфигурация |
| `.gitignore` | Игнор файлов git |
| `.npmrc` | NPM конфигурация |
| `.prettierrc` | Форматирование кода |
| `.vercelignore` | Игнор для Vercel |
| `.yarnrc.yml` | Yarn конфигурация |
| `eslint.config.mjs` | ESLint правила |
| `jsconfig.json` | JS/TS пути |
| `vite.config.mjs` | Vite конфигурация |
| `vitest.config.mjs` | Vitest тесты |
| `playwright.config.js` | Playwright E2E |
| `render.yaml` | Render.com деплой |

### Зависимости — ✅ НУЖНЫ
| Файл | Размер |
|------|--------|
| `package.json` | 4.8 KB |
| `package-lock.json` | 299 KB |
| `yarn.lock` | 360 KB |

### Документация — 📝
| Файл | Статус |
|------|--------|
| `README.md` | ✅ Главный README |
| `PROJECT_FILE_MAP.md` | 🆕 Карта проекта |
| `BUGLOG.md` | 📝 Лог багов |
| `DEPLOYMENT_SUMMARY.md` | 📝 Итоги деплоя |
| `TEST_REPORT.md` | 📝 Отчёт тестов |
| `NEON_CLEANUP.md` | ⚠️ Устарел (Neon) |

### HTML
| Файл | Статус |
|------|--------|
| `index.html` | ✅ Главная SPA страница |


---

## 📁 .github/ — CI/CD

```
.github/
└── workflows/
    └── tests.yml                        # ✅ НУЖЕН — CI пайплайн
```

---

## 📁 server/ — Backend (99 файлов)

```
server/
├── index.js                             # ✅ Главный сервер
├── README.md                            # 📝 Документация
│
├── 📁 config/ (7 файлов)                # ✅ Конфигурация
│   ├── database.js                      # ✅ PostgreSQL
│   ├── swagger.js                       # ✅ OpenAPI
│   ├── swagger-additional-docs.js       # 🆕 Новая документация
│   └── swagger-*.js                     # ✅ Дополнительные
│
├── 📁 controllers/ (28 файлов)          # ✅ Контроллеры API
│   ├── authController.js                # Аутентификация
│   ├── estimatesController.js           # Сметы
│   ├── materialsController.js           # Материалы
│   ├── projectsController.js            # Проекты
│   └── ...                              # Все остальные
│
├── 📁 routes/ (23 файла)                # ✅ Маршруты API
│   └── [все модули]                     # auth, projects, estimates...
│
├── 📁 middleware/ (6 файлов)            # ✅ Middleware
│   ├── auth.js                          # JWT
│   ├── checkPermission.js               # Права доступа
│   └── ...
│
├── 📁 services/ (8 файлов)              # ✅ Бизнес-логика
│   ├── emailService.js                  # Resend
│   ├── pineconeClient.js                # AI-поиск
│   └── ...
│
├── 📁 repositories/ (13 файлов)         # ✅ Слой данных
├── 📁 utils/ (7 файлов)                 # ✅ Утилиты
└── 📁 templates/ (3 файла)              # ✅ Email шаблоны
```

---

## 📁 app/ — Frontend React (151 файл)

```
app/
├── index.jsx                            # ✅ Точка входа
├── App.jsx                              # ✅ Главный компонент
│
├── 📁 admin/                            # ✅ Админ-панель
├── 📁 counterparties/                   # ✅ Контрагенты
├── 📁 dashboard/                        # ✅ Дашборд (15 файлов)
├── 📁 estimates/                        # ✅ Сметы (35 файлов)
├── 📁 estimate-templates/               # ✅ Шаблоны смет
├── 📁 layout/                           # ✅ Макет (22 файла)
├── 📁 pages/                            # ✅ Страницы (22 файла)
├── 📁 projects/                         # ✅ Проекты (11 файлов)
├── 📁 purchases/                        # ✅ Закупки
├── 📁 references/                       # ✅ Справочники (10 файлов)
├── 📁 routes/                           # ✅ Роутинг
└── 📁 menu-items/                       # ✅ Меню
```

---

## 📁 database/ — База данных (88 файлов)

```
database/
├── README.md                            # 📝 Описание
├── ER_DIAGRAM.md                        # 📝 ER диаграмма
├── MIGRATIONS_ANALYSIS.md               # 📝 Анализ миграций
│
├── 📁 migrations/ (7 файлов)            # ✅ Актуальные миграции
│   ├── 001_complete_schema.sql          # ✅ Baseline для новых БД
│   ├── 062_create_schema_version.sql    # ✅ Версионирование
│   ├── 063_drop_suppliers.sql           # ✅ Удаление suppliers
│   ├── 064_cleanup_expired_tokens.sql   # ✅ Очистка токенов
│   └── *.md                             # 📝 Документация
│
├── 📁 migrations_archive/ (70 файлов)   # 📦 Архив миграций
│   └── 002-061                          # История (НЕ УДАЛЯТЬ)
│
├── 📁 seeds/ (3 файла)                  # ✅ Сиды
│   ├── 001_create_system_tenant.sql     # ✅ Системный тенант
│   ├── 002_seed_roles_permissions.sql   # ✅ Роли (59 разрешений)
│   └── 003_create_test_superadmin.sql   # 🧪 Тестовый админ
│
└── 📁 scripts/ (2 файла)                # 🔧 Скрипты
```

---

## 📁 scripts/ — Администрирование (63 файла)

```
scripts/
├── README.md                            # 📝 Документация
│
# ===== АКТУАЛЬНЫЕ =====
├── runMigrations.js                     # ✅ Главный скрипт миграций
├── generateBaseline.js                  # ✅ Генерация baseline
├── pinecone-sync-cron.mjs               # ✅ Синхронизация Pinecone
├── set-super-admin.mjs                  # ✅ Назначение супер-админа
│
# ===== УТИЛИТЫ =====
├── backup-neon-to-file.mjs              # 🔧 Бэкап БД
├── check-db-schema.mjs                  # 🔧 Проверка схемы
├── list-users-roles.mjs                 # 🔧 Список пользователей
├── verify-migration.mjs                 # 🔧 Проверка миграций
│
# ===== DEPRECATED =====
├── 📁 _deprecated/ (9 файлов)           # 📦 Устаревшие миграции
│
# ===== ТЕСТОВЫЕ =====
└── test-*.mjs                           # 🧪 Тестовые скрипты
```

---

## 📁 tests/ — Тесты (115 файлов)

```
tests/
├── README.md                            # 📝 Документация
├── setup.js                             # ✅ Настройка
│
├── 📁 unit/ (32 файла)                  # ✅ Unit тесты
├── 📁 integration/ (16 файлов)          # ✅ Integration тесты
├── 📁 e2e/ (35 файлов)                  # ✅ E2E тесты
├── 📁 security/ (7 файлов)              # ✅ Security тесты
├── 📁 fixtures/                         # ✅ Тестовые данные
└── 📁 shared/                           # ✅ Общие хелперы
```

---

## 📁 shared/ — Общий frontend код (118 файлов)

```
shared/
├── 📁 assets/ (11 файлов)               # ✅ Ресурсы
├── 📁 lib/ (61 файл)                    # ✅ Библиотеки, хуки, сторы
├── 📁 ui/ (45 файлов)                   # ✅ UI компоненты
└── 📁 styles/                           # ✅ Стили, тема MUI
```

---

## 📁 docs/ — Документация (57 файлов)

```
docs/
├── DEPLOY_GUIDE.md                      # ✅ Гайд деплоя
├── PERFORMANCE_ANALYSIS.md              # 📝 Анализ производительности
├── TYPOGRAPHY_SYSTEM.md                 # 📝 Типографика
│
├── 📁 archive/ (13 файлов)              # 📦 Старая документация
├── 📁 refactoring/ (11 файлов)          # 📝 Рефакторинг
├── 📁 technical/ (12 файлов)            # 📝 Технические доки
└── 📁 operations/                       # 📝 Операции
```

---

## 📁 Локальные папки (НЕ в git)

| Папка | В .gitignore | Генерируется |
|-------|--------------|--------------|
| `node_modules/` | ✅ | `yarn install` |
| `dist/` | ✅ | `yarn build` |
| `coverage/` | ✅ | `yarn test --coverage` |
| `.vercel/` | ✅ | Vercel CLI |
| `.ag_logs/` | ✅ | Antigravity |

---

## 📊 Статистика проекта

| Категория | Файлов | Описание |
|-----------|--------|----------|
| **Frontend (app/)** | 151 | React компоненты |
| **Backend (server/)** | 99 | Express.js API |
| **Shared** | 118 | Общий код |
| **Tests** | 115 | Тесты всех видов |
| **Database** | 88 | Миграции, сиды |
| **Scripts** | 63 | Админ-скрипты |
| **Docs** | 57 | Документация |
| **Config** | 25 | Корневые файлы |
| **ИТОГО** | ~750 | Без node_modules |

---

## 🧹 История очистки (2026-01-13)

### Удалено:
| Элемент | Размер |
|---------|--------|
| `_archived-scripts/` | 55 файлов |
| `dist/` | ~15 MB |
| `coverage/` | 7.7 MB |
| `.ag_logs/` | 2.4 MB |
| `.vercel/` | 633 B |
| `backups/neon-backup-2025-12-18.sql` | 56 MB |
| Временные файлы (.bak, .json) | ~1.5 MB |
| **ИТОГО** | **~85.5 MB** |

### Осталось после очистки:
- 22 директории
- 25 корневых файлов
- ~750 файлов кода (без node_modules)
