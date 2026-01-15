# 📁 Полная карта файлов проекта SmetaLab

> **Дата обновления:** 2026-01-15  
> **Версия:** 1.0.1  
> **Статус:** Production Ready ✅  
> **Последний коммит:** b71c7fb (fix: update yarn.lock to fix Render deploy)

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

## 🌳 Структура проекта (v1.0.1)

```
smetalab v1.0.1/
├── 📁 .agent/                           # ✅ Конфигурация агента (2 файла)
├── 📁 .github/                          # ✅ CI/CD конфигурация
├── 📁 .vscode/                          # ✅ Настройки VS Code (1 файл)
├── 📁 .yarn/                            # ✅ Yarn конфигурация
├── 📁 app/                              # ✅ Frontend (React) — 146 файлов
├── 📁 database/                         # ✅ Миграции и схема БД — 4 файла
├── 📁 docs/                             # 📝 Документация — 57 файлов
├── 📁 exports/                          # 📦 Экспорты (3 файла)
├── 📁 metrics/                          # 📦 Метрики (3 файла)
├── 📁 node_modules/                     # ✅ Зависимости (НЕ ТРОГАТЬ)
├── 📁 playwright-report/                # 🧪 E2E отчёты (3 файла)
├── 📁 public/                           # ✅ Статические ресурсы — 10 файлов
├── 📁 scripts/                          # 🔧 Скрипты — 68 файлов
├── 📁 server/                           # ✅ Backend (Express.js) — 105 файлов
├── 📁 shared/                           # ✅ Общий код frontend — 116 файлов
├── 📁 tests/                            # ✅ Тесты — 114 файлов
└── [26 корневых файлов]
```

---

## 📁 Корневые файлы (26 штук)

### Конфигурация — ✅ НУЖНЫ
| Файл | Описание |
|------|----------|
| `.env` | Переменные окружения (НЕ в git) |
| `.env.example` | Пример переменных |
| `.env.production` | Prod конфигурация |
| `.gitignore` | Игнор файлов git |
| `.prettierrc` | Форматирование кода |
| `.vercelignore` | Игнор для Vercel |
| `.yarnrc.yml` | Yarn конфигурация |
| `eslint.config.mjs` | ESLint правила |
| `jsconfig.json` | JS/TS пути |
| `vite.config.mjs` | Vite конфигурация |
| `vitest.config.mjs` | Vitest тесты |
| `playwright.config.js` | Playwright E2E |
| `render.yaml` | Render.com деплой |
| `vercel.json` | Vercel конфигурация |

### Зависимости — ✅ НУЖНЫ
| Файл | Размер |
|------|--------|
| `package.json` | 4.9 KB |
| `package-lock.json` | 476 KB |
| `yarn.lock` | 349 KB |

### Документация — 📝
| Файл | Статус |
|------|--------|
| `README.md` | ✅ Главный README |
| `PROJECT_FILE_MAP.md` | 🆕 Карта проекта |
| `TEST_REPORT.md` | 📝 Отчёт тестов |

### HTML
| Файл | Статус |
|------|--------|
| `index.html` | ✅ Главная SPA страница |

### Утилиты (временные)
| Файл | Статус |
|------|--------|
| `check_db.js` | 🔧 Проверка БД |
| `setup_index.js` | 🔧 Настройка индексов |
| `setup_works_index.js` | 🔧 Индексы works |
| `token_debug.json` | ⚠️ Отладка токенов |
| `petrovich_for_import.csv` | 📦 Импорт материалов (14MB) |

---

## 📁 .github/ — CI/CD

```
.github/
└── workflows/
    └── tests.yml                        # ✅ НУЖЕН — CI пайплайн
```

---

## 📁 server/ — Backend (105 файлов)

```
server/
├── index.js                             # ✅ Главный сервер (10 KB)
├── README.md                            # 📝 Документация
│
├── 📁 cache/ (1 файл)                   # ✅ Кеширование
│   └── referencesCache.js               # Кеш справочников
│
├── 📁 config/ (7 файлов)                # ✅ Конфигурация
│   ├── database.js                      # ✅ PostgreSQL
│   ├── swagger.js                       # ✅ OpenAPI
│   └── swagger-*.js                     # ✅ Дополнительные
│
├── 📁 controllers/ (36 файлов)          # ✅ Контроллеры API
│   ├── authController.js                # Аутентификация (47 KB)
│   ├── materialsController.js           # Материалы (61 KB)
│   ├── projectsController.js            # Проекты (47 KB)
│   ├── worksController.js               # Работы (35 KB)
│   ├── estimatesController.js           # Сметы (30 KB)
│   ├── usersController.js               # Пользователи (33 KB)
│   ├── workCompletionActsController.js  # Акты (34 KB)
│   ├── *BulkController.js               # 🆕 Bulk операции
│   ├── *ImportExportController.js       # 🆕 Импорт/Экспорт
│   └── ...                              # Все остальные
│
├── 📁 routes/ (23 файла)                # ✅ Маршруты API
│   └── [все модули]                     # auth, projects, estimates...
│
├── 📁 middleware/ (6 файлов)            # ✅ Middleware
│   ├── auth.js                          # JWT
│   ├── checkPermission.js               # Права доступа
│   ├── rateLimiter.js                   # Rate limiting
│   └── errorHandler.js                  # Обработка ошибок
│
├── 📁 services/ (8 файлов)              # ✅ Бизнес-логика
│   ├── emailService.js                  # Resend
│   ├── pineconeClient.js                # AI-поиск
│   ├── semanticSearchService.js         # Семантический поиск
│   └── ...
│
├── 📁 repositories/ (14 файлов)         # ✅ Слой данных
├── 📁 utils/ (7 файлов)                 # ✅ Утилиты
└── 📁 templates/ (1 файл)               # ✅ Email шаблоны
```

---

## 📁 app/ — Frontend React (146 файлов)

```
app/
├── index.jsx                            # ✅ Точка входа
├── App.jsx                              # ✅ Главный компонент
├── config.js                            # ✅ Конфигурация
│
├── 📁 admin/ (6 файлов)                 # ✅ Админ-панель
├── 📁 counterparties/ (2 файла)         # ✅ Контрагенты
├── 📁 dashboard/ (15 файлов)            # ✅ Дашборд
├── 📁 estimates/ (36 файлов)            # ✅ Сметы (главный модуль)
├── 📁 estimate-templates/ (2 файла)     # ✅ Шаблоны смет
├── 📁 layout/ (22 файла)                # ✅ Макет
├── 📁 menu-items/ (7 файлов)            # ✅ Меню навигации
├── 📁 pages/ (22 файла)                 # ✅ Страницы (auth, errors)
├── 📁 projects/ (11 файлов)             # ✅ Проекты
├── 📁 purchases/ (1 файл)               # ✅ Закупки
├── 📁 references/ (10 файлов)           # ✅ Справочники
├── 📁 routes/ (6 файлов)                # ✅ React Router
└── 📁 utilities/ (3 файла)              # ✅ Утилиты
```

---

## 📁 database/ — База данных (4 файла)

```
database/
├── 📁 migrations/ (3 файла)             # ✅ Миграции
│   ├── 001_complete_schema.sql          # ✅ Единая схема (91 KB)
│   ├── README.md                        # 📝 Документация
│   └── REFACTORING_RESULTS.md           # 📝 Результаты рефакторинга
│
└── 📁 seeds/ (1 файл)                   # ✅ Начальные данные
    └── 002_seed_roles_permissions.sql   # ✅ Роли и разрешения (17 KB)
```

> **Примечание:** После рефакторинга все 70+ миграций объединены в одну 001_complete_schema.sql

---

## 📁 scripts/ — Администрирование (68 файлов)

```
scripts/
├── README.md                            # 📝 Документация
│
# ===== АКТУАЛЬНЫЕ =====
├── runMigrations.js                     # ✅ Главный скрипт миграций (8 KB)
├── generateBaseline.js                  # ✅ Генерация baseline (11 KB)
├── pinecone-sync-cron.mjs               # ✅ Синхронизация Pinecone
├── set-super-admin.mjs                  # ✅ Назначение супер-админа
│
# ===== УТИЛИТЫ =====
├── backup-neon-to-file.mjs              # 🔧 Бэкап БД
├── list-users-roles.mjs                 # 🔧 Список пользователей
├── import-to-render.mjs                 # 🔧 Импорт на Render (11 KB)
├── migrate-to-render.mjs                # 🔧 Миграция на Render (10 KB)
│
# ===== DEPRECATED =====
├── 📁 _deprecated/ (9 файлов)           # 📦 Устаревшие скрипты
│
# ===== ОСТАЛЬНЫЕ =====
└── [50+ скриптов]                       # 🔧 Различные утилиты
```

---

## 📁 tests/ — Тесты (114 файлов)

```
tests/
├── README.md                            # 📝 Документация (17 KB)
├── setup.js                             # ✅ Настройка
├── TODO.md                              # 📝 Планы
│
├── 📁 unit/ (32 файла)                  # ✅ Unit тесты
├── 📁 integration/ (16 файлов)          # ✅ Integration тесты
├── 📁 e2e/ (34 файла)                   # ✅ E2E тесты (Playwright)
├── 📁 security/ (7 файлов)              # ✅ Security тесты
├── 📁 performance/ (1 файл)             # 🧪 Performance тесты
├── 📁 production/ (2 файла)             # ✅ Production smoke tests
├── 📁 fixtures/                         # ✅ Тестовые данные
├── 📁 shared/ (4 файла)                 # ✅ Общие хелперы
├── 📁 scripts/ (2 файла)                # 🔧 Скрипты для тестов
├── 📁 docs/ (9 файлов)                  # 📝 Документация тестов
└── 📁 results/ (1 файл)                 # 📦 Результаты
```

---

## 📁 shared/ — Общий frontend код (116 файлов)

```
shared/
├── 📁 assets/ (11 файлов)               # ✅ Ресурсы (иконки, изображения)
├── 📁 lib/ (61 файл)                    # ✅ Библиотеки
│   ├── api/                             # API клиенты
│   ├── contexts/                        # React contexts
│   ├── hooks/                           # Custom hooks
│   ├── services/                        # Сервисы (auth, etc)
│   └── store/                           # Zustand stores
├── 📁 styles/ (1 файл)                  # ✅ Стили
└── 📁 ui/ (43 файла)                    # ✅ UI компоненты
    ├── components/                      # Переиспользуемые компоненты
    └── themes/                          # Тема MUI
```

---

## 📁 docs/ — Документация (57 файлов)

```
docs/
├── DEPLOY_GUIDE.md                      # ✅ Гайд деплоя
├── PERFORMANCE_ANALYSIS.md              # 📝 Анализ производительности
├── TYPOGRAPHY_SYSTEM.md                 # 📝 Типографика
├── WORK_PRICE_EDITING.md                # 📝 Редактирование цен
├── OPTIMIZATION_*.md                    # 📝 Оптимизации (10 файлов)
├── NOTIFICATIONS_SYSTEM.md              # 📝 Уведомления
│
├── 📁 archive/ (13 файлов)              # 📦 Старая документация
├── 📁 refactoring/ (11 файлов)          # 📝 Рефакторинг
├── 📁 technical/ (12 файлов)            # 📝 Технические доки
├── 📁 testing/ (1 файл)                 # 📝 Тестирование
└── 📁 operations/ (1 файл)              # 📝 Операции
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
| **Frontend (app/)** | 146 | React компоненты |
| **Backend (server/)** | 105 | Express.js API (36 контроллеров) |
| **Shared** | 116 | Общий код |
| **Tests** | 114 | Тесты всех видов |
| **Database** | 4 | Миграции объединены |
| **Scripts** | 68 | Админ-скрипты |
| **Docs** | 57 | Документация |
| **Config** | 26 | Корневые файлы |
| **ИТОГО** | ~640 | Без node_modules |

---

## 🔄 История изменений

### 2026-01-15 (v1.0.1)
- ✅ Исправлен `yarn.lock` для деплоя на Render
- ✅ Миграции объединены в один файл `001_complete_schema.sql`
- ✅ Удалена папка `utils-scripts/` (29 файлов → перенесены/удалены)
- ✅ Удалена папка `migrations_archive/` (70 файлов)
- ✅ Добавлен уникальный индекс `idx_materials_sku_scope_unique`
- ✅ Bulk controllers для materials и works

### 2026-01-13
- Большая очистка проекта (~85 MB удалено)
- Создана эта карта файлов
