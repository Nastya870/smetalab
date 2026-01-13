# 🧪 Тестирование проекта# 🧪 Тестирование проекта



**Всё о тестах в одном месте!**  **Последнее обновление:** 22 ноября 2025  

**Статус:** ✅ 93/93 passing (100%)**Всё о тестах в одном месте!**



------



## 📊 Текущий статус## 📊 Текущий статус



``````

✅ Unit Tests:        67/67 passing✅ Unit Tests:        67/67 passing (100%)

✅ Integration Tests: 26/26 passing✅ Integration Tests: 26/26 passing (100%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ИТОГО:            93/93 tests (100%)🎯 ИТОГО:            93/93 passing (100%)

``````



------



## 📂 Структура tests/## 📂 Структура tests/



``````

tests/tests/

├── 📘 README.md                 # ← ВЫ ЗДЕСЬ├── 📘 README.md                 # ← ВЫ ЗДЕСЬ (главный гайд)

├── 📋 TODO.md                   # План развития├── 📋 TODO.md                   # План развития

│├── ⚙️ setup.js                  # Настройка jsdom

├── 🧪 unit/                     # 67 тестов ✅│

│   ├── backend/                 # middleware, utils├── 🧪 unit/                     # Unit тесты (67 passing)

│   └── docs/README.md           # 📖 Документация│   ├── backend/

││   │   ├── middleware/          # checkPermission, auth

├── 🔗 integration/              # 26 тестов ✅│   │   └── utils/               # JWT, password, bcrypt

│   ├── api/                     # auth, roles│   ├── frontend/

│   └── docs/README.md           # 📖 Документация│   │   └── utils/

││   └── docs/

├── 🌐 e2e/                      # Playwright (будущее)│       └── README.md            # 📖 Что тестируется, как запускать

│   └── docs/README.md│

│├── 🔗 integration/              # Integration тесты (26 passing)

├── ⚡ performance/              # k6 (будущее)│   ├── api/

│   └── docs/README.md│   │   ├── auth.api.test.js    # Auth endpoints (18 тестов)

││   │   └── roles.api.test.js   # Roles endpoints (8 тестов)

├── 🔄 shared/│   └── docs/

│   ├── fixtures/                # testDatabase.js│       └── README.md            # 📖 API endpoints, troubleshooting

│   └── utilities/               # list-users.mjs, decode-jwt и др.│

│├── 🌐 e2e/                      # E2E тесты (Playwright) - FUTURE

├── 🛠️ scripts/                  # Скрипты запуска│   └── docs/

│   ├── run-integration.ps1│       └── README.md            # 📖 Сценарии, установка Playwright

│   └── run-servers.ps1│

│├── ⚡ performance/              # Performance тесты (k6) - FUTURE

└── 📚 docs/                     # Архитектура│   └── docs/

    ├── SESSION_21-22_NOV.md    # Детали сессии│       └── README.md            # 📖 Метрики, установка k6

    ├── TESTING_STRATEGY.md│

    ├── PERMISSIONS_REFERENCE.md├── 🔄 shared/                   # Общие ресурсы

    └── ROLES_ARCHITECTURE.md│   ├── fixtures/

```│   │   └── testDatabase.js     # Утилиты для тестовой БД

│   └── utilities/               # БД утилиты

---│       ├── list-users.mjs

│       ├── list-tenants.mjs

## 🚀 Быстрый старт│       ├── decode-jwt-token.cjs

│       └── ...

```powershell│

# Все тесты├── 🛠️ scripts/                  # Скрипты запуска

npm test│   ├── run-integration.ps1     # Запуск integration тестов

│   └── run-servers.ps1         # Запуск backend + frontend

# Только unit│

npm run test:unit└── 📚 docs/                     # Архитектурная документация

    ├── SESSION_21-22_NOV.md    # Детали сессии тестирования

# Только integration    ├── TESTING_STRATEGY.md

npm run test:integration    ├── PERMISSIONS_REFERENCE.md

# или: .\tests\scripts\run-integration.ps1    ├── ROLES_ARCHITECTURE.md

    └── ...

# С coverage```

npm run test:coverage

---

# UI режим

npm run test:ui## 🚀 Быстрый старт



# Запустить серверы### Запустить все тесты

.\tests\scripts\run-servers.ps1```powershell

```# Из корня vite/

npm test

---```



## 📖 Документация### Запустить только unit тесты

```powershell

### По типам тестовnpm run test:unit

- **[unit/docs/README.md](unit/docs/README.md)** — Unit тесты```

- **[integration/docs/README.md](integration/docs/README.md)** — Integration API

- **[e2e/docs/README.md](e2e/docs/README.md)** — E2E (Playwright)### Запустить только integration тесты

- **[performance/docs/README.md](performance/docs/README.md)** — Performance (k6)```powershell

npm run test:integration

### Архитектура

- **[docs/PERMISSIONS_REFERENCE.md](docs/PERMISSIONS_REFERENCE.md)** — Разрешения# Или через скрипт

- **[docs/ROLES_ARCHITECTURE.md](docs/ROLES_ARCHITECTURE.md)** — Роли.\test-scripts\run-integration.ps1

- **[docs/SESSION_21-22_NOV.md](docs/SESSION_21-22_NOV.md)** — Детали сессии```



---### Запустить с coverage

```powershell

## 🔧 Утилитыnpm run test:coverage

```

```powershell

# БД утилиты### Запустить интерактивный UI

node tests/shared/utilities/list-users.mjs```powershell

node tests/shared/utilities/list-tenants.mjsnpm run test:ui

node tests/shared/utilities/list-tables.mjs# Откроется http://localhost:51204

```

# Auth отладка

node tests/shared/utilities/decode-jwt-token.cjs---

```

## 📦 Что тестируется?

---

### 1. Unit Tests (67 тестов)

## 📦 Что тестируется?

**Расположение:** `tests/unit/**/*.test.js`

### Unit (67)

- ✅ Auth: JWT токены, валидация#### Auth utilities (`tests/unit/auth.test.js`)

- ✅ Password: bcrypt, хеширование- ✅ Генерация JWT токенов (access + refresh)

- ✅ Permissions: wildcards, иерархия- ✅ Проверка токенов

- ✅ Извлечение payload из токенов

### Integration (26)- ✅ Обработка истёкших токенов

- ✅ Auth API: register, login, refresh, logout, me- ✅ Обработка невалидных токенов

- ✅ Roles API: list, get, permissions

#### Password utilities (`tests/unit/password.test.js`)

---- ✅ Хеширование паролей (bcrypt)

- ✅ Сравнение паролей

## 🎯 Следующие шаги- ✅ Валидация силы пароля (минимум 8 символов)



См. **[TODO.md](TODO.md)**:#### Permissions middleware (`tests/unit/checkPermission.test.js`)

1. ✅ Идеальная структура tests/- ✅ Проверка базовых разрешений

2. ⏳ CI/CD (GitHub Actions)- ✅ Wildcard разрешения (`admin.*`)

3. ⏳ E2E (Playwright)- ✅ Иерархические разрешения (`admin.read` → `materials.read`)

4. ⏳ Performance (k6)- ✅ Отказ в доступе без разрешений



------



## ✅ Преимущества### 2. Integration Tests (26 тестов)



- ✅ Всё в одном месте (`tests/`)**Расположение:** `tests/integration/api/**/*.test.js`

- ✅ Логическая организация

- ✅ Документация рядом с тестами#### Auth API (`tests/integration/api/auth.api.test.js`) - 18 тестов

- ✅ Готово для E2E и Performance

- ✅ Стандартная структура**POST /api/auth/register** (5 тестов)

- ✅ Регистрация с валидными данными (201)

---- ✅ Ошибка при невалидном email (400)

- ✅ Ошибка при слабом пароле (400)

**Обновлено:** 22 ноября 2025 🎯- ✅ Ошибка при дублирующемся email (409)

- ✅ Ошибка при отсутствии обязательного поля (400)

**POST /api/auth/login** (5 тестов)
- ✅ Вход с правильными credentials (200)
- ✅ Ошибка при неверном пароле (401)
- ✅ Ошибка при несуществующем пользователе (401)
- ✅ Ошибка при невалидном формате email (400)
- ✅ JWT payload содержит роли и разрешения

**POST /api/auth/refresh** (3 теста)
- ✅ Обновление access token по refresh token (200)
- ✅ Ошибка при невалидном refresh token (401)
- ✅ Ошибка при отсутствии refresh token (400)

**POST /api/auth/logout** (2 теста)
- ✅ Успешный logout (200)
- ✅ Ошибка при отсутствии токена (401)

**GET /api/auth/me** (3 теста)
- ✅ Получение информации о текущем пользователе (200)
- ✅ Ошибка без токена (401)
- ✅ Ошибка с невалидным токеном (403)

#### Roles API (`tests/integration/api/roles.api.test.js`) - 8 тестов

**GET /api/roles** (4 теста)
- ✅ Super admin видит только глобальные роли (super_admin, admin шаблон)
- ✅ Super admin определяется по ВСЕМ ролям пользователя
- ✅ Логирование корректной информации о super_admin
- ✅ Tenant admin видит только tenant roles своего тенанта (кроме admin)

**GET /api/permissions/roles/:id** (1 тест)
- ✅ Получение полной информации о роли с разрешениями

**Edge Cases** (3 теста)
- ✅ Ошибка 401 без токена
- ✅ Ошибка 403 с невалидным токеном
- ✅ Ошибка 404 для несуществующей роли

---

## 🔧 Архитектура тестов

### Unit Tests
```
tests/unit/
├── auth.test.js           # JWT, токены
├── password.test.js       # Хеширование, валидация
└── checkPermission.test.js # Middleware разрешений
```

### Integration Tests
```
tests/integration/
├── api/
│   ├── auth.api.test.js   # Auth endpoints (18 тестов)
│   └── roles.api.test.js  # Roles endpoints (8 тестов)
└── setup.js               # Настройка jsdom
```

### Test Utilities
```
tests/fixtures/
└── testDatabase.js        # Утилиты для работы с тестовой БД
    ├── cleanupTestData()      # Очистка @test.com данных
    ├── createTestUser()       # Создание тестового пользователя
    ├── createTestTenant()     # Создание тестовой компании
    ├── assignRoleToUser()     # Назначение роли
    └── getRolePermissions()   # Получение разрешений роли
```

---

## 🎯 Ключевые исправления (21-22 ноября 2025)

### Проблема 1: Data isolation
**Было:** Roles tests конфликтовали с auth tests  
**Решение:** Изолировали данные через `@rolestest.local` email domain

### Проблема 2: Cleanup удалял чужие tenants
**Было:** `cleanupTestData` удалял все tenants с паттерном "Test %"  
**Решение:** Модифицировали cleanup чтобы удалять только tenants принадлежащие @test.com users

### Проблема 3: requireAdmin блокировал super_admin
**Было:** Middleware требовал tenantId даже для super_admin  
**Решение:** Убрали проверку tenantId для super_admin

**Изменённые файлы:**
- `tests/fixtures/testDatabase.js` — cleanup logic
- `server/middleware/adminAuth.js` — requireAdmin middleware
- `tests/integration/api/roles.api.test.js` — изоляция данных

---

## 🐛 Отладка

### Если тесты падают

**1. Проверьте переменные окружения**
```powershell
# Должен быть .env файл с DATABASE_URL
cat .env | Select-String "DATABASE_URL"
```

**2. Проверьте подключение к БД**
```powershell
node test-scripts/debug/list-users.mjs
```

**3. Очистите тестовые данные вручную**
```sql
DELETE FROM user_role_assignments WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com%');
DELETE FROM user_tenants WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com%');
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com%');
DELETE FROM users WHERE email LIKE '%@test.com%';
```

**4. Запустите тесты по-одному**
```powershell
# Только auth тесты
npx vitest run tests/integration/api/auth.api.test.js

# Только roles тесты
npx vitest run tests/integration/api/roles.api.test.js
```

---

## 📚 Дополнительная документация

- **README_TESTING.md** — детали сессии 21-22 ноября (исправления)
- **TODO.md** — план дальнейших действий (CI/CD, E2E, performance)
- **docs/TESTING_STRATEGY.md** — общая стратегия тестирования
- **docs/PERMISSIONS_REFERENCE.md** — справочник по разрешениям
- **docs/ROLES_ARCHITECTURE.md** — архитектура системы ролей

---

## 🎓 Best Practices

### 1. Изоляция данных
```javascript
// ✅ Используйте уникальные email domains для разных test suites
beforeAll(async () => {
  const user = await testDb.createTestUser({
    email: 'unique-suite@test.com' // Уникальный domain
  });
});
```

### 2. Транзакции в fixtures
```javascript
// ✅ Используйте транзакции для атомарности
const client = await testPool.connect();
await client.query('BEGIN');
try {
  // ... операции
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### 3. Cleanup после тестов
```javascript
// ✅ Всегда очищайте данные в afterAll
afterAll(async () => {
  await testDb.cleanupTestData();
  await testDb.closePool();
});
```

---

## 🚦 CI/CD (TODO)

**Планируется:**
- GitHub Actions workflow для автоматического запуска тестов
- Coverage reports в Codecov
- Status badges в README

**См. также:** `TODO.md` для полного плана

---

## 📞 Контакты

**Вопросы по тестам?**
- См. `README_TESTING.md` для детальной информации
- См. `docs/TESTING_STRATEGY.md` для общей стратегии

**Последнее обновление:** 22 ноября 2025
