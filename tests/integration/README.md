# Integration Тесты - Smeta Application

## 📋 Обзор

Integration тесты проверяют взаимодействие между модулями через реальные HTTP запросы к API. Используется тестовая база данных для проверки полного цикла операций.

## 📊 Статистика

| Метрика | Значение |
|---------|----------|
| **Всего тестов** | 137 |
| **Файлов тестов** | 10 |
| **Покрытие** | 100% |
| **Фреймворк** | Vitest + Supertest |

## 🏗️ Структура

```
tests/integration/
├── README.md                      # ← ВЫ ЗДЕСЬ
│
├── api/
│   ├── auth.api.test.js           # Auth API (18 тестов)
│   ├── roles.api.test.js          # Roles API (8 тестов)
│   ├── users.api.test.js          # Users API (17 тестов)
│   ├── projects.api.test.js       # Projects API (19 тестов)
│   ├── materials.api.test.js      # Materials API (16 тестов)
│   ├── works.api.test.js          # Works API (15 тестов)
│   ├── estimates.api.test.js      # Estimates API (15 тестов)
│   ├── contracts.api.test.js      # Contracts API (11 тестов)
│   ├── purchases.api.test.js      # Purchases API (10 тестов)
│   └── schedules.api.test.js      # Schedules API (8 тестов)
│
└── docs/
    └── README.md                  # Документация
```

## 🚀 Запуск

```powershell
# Все integration тесты
npm run test:integration

# Через скрипт
.\tests\scripts\run-integration.ps1

# Конкретный файл
npx vitest run tests/integration/api/auth.api.test.js

# В watch режиме
npx vitest watch tests/integration

# С подробным выводом
npx vitest run tests/integration --reporter=verbose
```

### Предварительные требования

1. **Backend запущен** на `http://localhost:3001`
2. **База данных** доступна (PostgreSQL на Render)
3. **Переменные окружения** настроены (`.env`)

---

## 📝 Описание тестов

### 1. `auth.api.test.js` — Auth API

**Путь:** `tests/integration/api/auth.api.test.js`  
**Тестирует:** `/api/auth/*` endpoints  
**Количество тестов:** 18

#### POST /api/auth/register (5 тестов)

| Тест | Статус | Описание |
|------|--------|----------|
| ✅ Валидные данные | 201 | Регистрация нового пользователя |
| ❌ Невалидный email | 400 | `invalid-email` → ошибка |
| ❌ Слабый пароль | 400 | `weak` → ошибка |
| ❌ Дублирующийся email | 409 | Email уже существует |
| ❌ Отсутствует поле | 400 | Нет password → ошибка |

```javascript
// Пример успешной регистрации
const response = await request(app)
  .post('/api/auth/register')
  .send({
    email: 'newuser@test.com',
    password: 'Test123!@#',
    fullName: 'New Test User',
    phone: '+7 999 123 4567'
  });

expect(response.status).toBe(201);
expect(response.body.data.user.email).toBe('newuser@test.com');
```

#### POST /api/auth/login (5 тестов)

| Тест | Статус | Описание |
|------|--------|----------|
| ✅ Валидные credentials | 200 | Возвращает JWT токены |
| ❌ Неверный пароль | 401 | `WrongPassword123!` |
| ❌ Несуществующий user | 401 | Email не найден |
| ❌ Невалидный email | 400 | `not-an-email` |
| ✅ JWT payload | 200 | Содержит permissions и roles |

```javascript
// Проверка JWT payload
const tokenParts = response.body.data.tokens.accessToken.split('.');
const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());

expect(payload.userId).toBeDefined();
expect(payload.email).toBe('login@test.com');
expect(Array.isArray(payload.permissions)).toBe(true);
```

#### POST /api/auth/refresh (3 теста)

| Тест | Статус | Описание |
|------|--------|----------|
| ✅ Валидный refresh token | 200 | Новый access token |
| ❌ Невалидный token | 401 | `invalid-token` |
| ❌ Отсутствует token | 400 | Нет refreshToken в body |

#### POST /api/auth/logout (2 теста)

| Тест | Статус | Описание |
|------|--------|----------|
| ✅ С токеном | 200 | Успешный logout |
| ❌ Без токена | 401 | Требуется авторизация |

#### GET /api/auth/me (3 теста)

| Тест | Статус | Описание |
|------|--------|----------|
| ✅ С токеном | 200 | Информация о пользователе |
| ❌ Без токена | 401 | Unauthorized |
| ❌ Невалидный токен | 403 | Forbidden |

---

### 2. `roles.api.test.js` — Roles API

**Путь:** `tests/integration/api/roles.api.test.js`  
**Тестирует:** `/api/roles/*` и `/api/permissions/roles/*`  
**Количество тестов:** 8

#### ⚠️ REGRESSION TEST: Bug от 21.11.2025

**Проблема:** Super admin с несколькими ролями `[super_admin, admin]` видел tenant roles (manager, estimator) вместо global roles.

**Причина:** Код проверял только первую роль:
```javascript
// ❌ Было
const isSuperAdmin = roleKey === 'super_admin';

// ✅ Стало
const userRoles = await getUserRoles(userId);
const isSuperAdmin = userRoles.includes('super_admin');
```

#### GET /api/roles (4 теста)

| Тест | Пользователь | Ожидание |
|------|--------------|----------|
| ✅ Super Admin | super_admin + admin | Только global roles |
| ✅ Проверка всех ролей | [super_admin, admin] | isSuperAdmin = true |
| ✅ Структура ответа | super_admin | id, key, name, tenant_id: null |
| ✅ Tenant Admin | admin (tenant) | Только tenant roles |

```javascript
// REGRESSION TEST: Super Admin Bug
it('должен вернуть ТОЛЬКО global roles для super_admin', async () => {
  const response = await request(app)
    .get('/api/roles')
    .set('Authorization', `Bearer ${superAdminToken}`);

  const roleKeys = response.body.data.map(r => r.key);

  // ✅ Должен видеть global roles
  expect(roleKeys).toContain('super_admin');
  expect(roleKeys).toContain('admin');

  // ❌ НЕ должен видеть tenant roles
  expect(roleKeys).not.toContain('manager');
  expect(roleKeys).not.toContain('estimator');
  expect(roleKeys).not.toContain('supplier');
});
```

#### GET /api/permissions/roles/:id (1 тест)

| Тест | Описание |
|------|----------|
| ✅ Детали роли | Полная информация + permissions |

```javascript
// Структура ответа
{
  success: true,
  data: {
    roleKey: 'super_admin',
    permissions: [
      { key: 'admin.create', name: '...' },
      { key: 'admin.read', name: '...' },
      // ...
    ]
  }
}
```

#### Edge Cases (3 теста)

| Тест | Статус | Описание |
|------|--------|----------|
| ❌ Без токена | 401 | Unauthorized |
| ❌ Невалидный токен | 403 | Forbidden |
| ❌ Несуществующая роль | 404 | Not Found |

---

## 🔧 Утилиты для тестов

### testDatabase.js

**Путь:** `tests/fixtures/testDatabase.js`

```javascript
import testDb from '../../fixtures/testDatabase.js';

// Создание тестового пользователя с тенантом
const { user, tenant } = await testDb.createTestUser({
  email: 'test@test.com',
  password: 'Test123!@#',
  fullName: 'Test User'
});

// Назначение роли
await testDb.assignRoleToUser(user.id, 'admin', tenant.id);

// Получение разрешений роли
const permissions = await testDb.getRolePermissions(roleId);

// Очистка тестовых данных (@test.com)
await testDb.cleanupTestData();

// Закрытие пула соединений
await testDb.closePool();
```

---

## 📋 Setup/Teardown

```javascript
describe('API Tests', () => {
  // Очистка ПЕРЕД всеми тестами
  beforeAll(async () => {
    await testDb.cleanupTestData();
  });

  // Очистка ПЕРЕД каждым тестом
  beforeEach(async () => {
    await testDb.cleanupTestData();
  });

  // Закрытие соединений ПОСЛЕ всех тестов
  afterAll(async () => {
    await testDb.cleanupTestData();
    await testDb.closePool();
  });
});
```

---

## 🔒 Изоляция данных

### Проблема конфликтов

Разные test suites могут конфликтовать при параллельном запуске.

### Решение: Уникальные email domains

```javascript
// auth.api.test.js        → @authtest.local
// roles.api.test.js       → @rolestest.local
// users.api.test.js       → @userstest.local
// projects.api.test.js    → @projectstest.local
// materials.api.test.js   → @materialstest.local
// works.api.test.js       → @workstest.local
// estimates.api.test.js   → @estimatestest.local
// contracts.api.test.js   → @contractstest.local
// purchases.api.test.js   → @purchasestest.local
// schedules.api.test.js   → @schedulestest.local
```

### Cleanup по домену

```javascript
// Очистка только своих данных
await testDb.testPool.query(`
  DELETE FROM users WHERE email LIKE '%@rolestest.local%'
`);
```

---

## 🐛 Решение проблем

### Тест падает с "ECONNREFUSED"

```powershell
# Backend не запущен
cd vite
npm run server
```

### Ошибка "duplicate key value"

```sql
-- Очистите тестовые данные вручную
DELETE FROM user_role_assignments WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com%'
);
DELETE FROM users WHERE email LIKE '%@test.com%';
```

### Cleanup удаляет чужие данные

**Проблема:** `cleanupTestData()` удаляла tenants других тестов.

**Решение:** Модифицирован cleanup чтобы удалять только tenants принадлежащие @test.com users.

### Super Admin получает 403

**Было:** Middleware `requireAdmin` требовал tenantId даже для super_admin.

**Решение:** Убрана проверка tenantId для super_admin.

---

## 📈 Best Practices

### 1. Изоляция данных

```javascript
// ✅ Уникальный email domain для каждого test suite
const user = await testDb.createTestUser({
  email: 'unique-suite@specific-domain.local'
});
```

### 2. Транзакции

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
}
```

### 3. Cleanup после тестов

```javascript
// ✅ Всегда очищайте в afterAll
afterAll(async () => {
  await testDb.cleanupTestData();
  await testDb.closePool();
});
```

### 4. Проверка структуры ответа

```javascript
// ✅ Проверяйте полную структуру
expect(response.body).toMatchObject({
  success: true,
  data: {
    user: expect.objectContaining({
      email: 'test@test.com'
    })
  }
});
```

---

## 📊 Сводка по endpoints

### Auth API (18 тестов)
| Endpoint | Метод | Тестов | Статус |
|----------|-------|--------|--------|
| `/api/auth/register` | POST | 5 | ✅ |
| `/api/auth/login` | POST | 5 | ✅ |
| `/api/auth/refresh` | POST | 3 | ✅ |
| `/api/auth/logout` | POST | 2 | ✅ |
| `/api/auth/me` | GET | 3 | ✅ |

### Roles API (8 тестов)
| Endpoint | Метод | Тестов | Статус |
|----------|-------|--------|--------|
| `/api/roles` | GET | 4 | ✅ |
| `/api/permissions/roles/:id` | GET | 1 | ✅ |
| Edge Cases | — | 3 | ✅ |

### Users API (17 тестов)
| Endpoint | Метод | Тестов | Статус |
|----------|-------|--------|--------|
| `/api/users` | GET | 4 | ✅ |
| `/api/users/:id` | GET | 3 | ✅ |
| `/api/users` | POST | 4 | ✅ |
| `/api/users/:id` | PUT | 3 | ✅ |
| `/api/users/:id` | DELETE | 3 | ✅ |

### Projects API (19 тестов)
| Endpoint | Метод | Тестов | Статус |
|----------|-------|--------|--------|
| `/api/projects` | GET | 4 | ✅ |
| `/api/projects/:id` | GET | 3 | ✅ |
| `/api/projects` | POST | 4 | ✅ |
| `/api/projects/:id` | PUT | 4 | ✅ |
| `/api/projects/:id` | DELETE | 4 | ✅ |

### Materials API (16 тестов)
| Endpoint | Метод | Тестов | Статус |
|----------|-------|--------|--------|
| `/api/materials` | GET | 3 | ✅ |
| `/api/materials/:id` | GET | 3 | ✅ |
| `/api/materials` | POST | 4 | ✅ |
| `/api/materials/:id` | PUT | 3 | ✅ |
| `/api/materials/:id` | DELETE | 3 | ✅ |

### Works API (15 тестов)
| Endpoint | Метод | Тестов | Статус |
|----------|-------|--------|--------|
| `/api/works` | GET | 3 | ✅ |
| `/api/works/:id` | GET | 3 | ✅ |
| `/api/works` | POST | 3 | ✅ |
| `/api/works/:id` | PUT | 3 | ✅ |
| `/api/works/:id` | DELETE | 3 | ✅ |

### Estimates API (15 тестов)
| Endpoint | Метод | Тестов | Статус |
|----------|-------|--------|--------|
| `/api/estimates` | GET | 3 | ✅ |
| `/api/estimates/:id` | GET | 3 | ✅ |
| `/api/estimates` | POST | 3 | ✅ |
| `/api/estimates/:id` | PUT | 3 | ✅ |
| `/api/estimates/:id` | DELETE | 3 | ✅ |

### Contracts API (11 тестов)
| Endpoint | Метод | Тестов | Статус |
|----------|-------|--------|--------|
| `/api/contracts` | GET | 3 | ✅ |
| `/api/contracts/:id` | GET | 2 | ✅ |
| `/api/contracts` | POST | 2 | ✅ |
| `/api/contracts/:id` | PUT | 2 | ✅ |
| `/api/contracts/:id` | DELETE | 2 | ✅ |

### Purchases API (10 тестов)
| Endpoint | Метод | Тестов | Статус |
|----------|-------|--------|--------|
| `/api/purchases` | GET | 2 | ✅ |
| `/api/purchases/:id` | GET | 2 | ✅ |
| `/api/purchases` | POST | 2 | ✅ |
| `/api/purchases/:id` | PUT | 2 | ✅ |
| `/api/purchases/:id` | DELETE | 2 | ✅ |

### Schedules API (8 тестов)
| Endpoint | Метод | Тестов | Статус |
|----------|-------|--------|--------|
| `/api/schedules` | GET | 2 | ✅ |
| `/api/schedules/:id` | GET | 2 | ✅ |
| `/api/schedules` | POST | 2 | ✅ |
| `/api/schedules/:id` | DELETE | 2 | ✅ |

---

## 🐞 Баги найденные тестами (Декабрь 2025)

Integration тесты помогли найти следующие баги до продакшена:

| Файл | Баг | Исправление |
|------|-----|-------------|
| `usersController.js` | Поле `avatar` вместо `avatar_url` | Исправлено на `avatar_url` |
| `worksController.js` | Поле `category` вместо `phase` | Исправлено на `phase` |
| `routes/users.js` | Route `/roles` после `/:id` | Перемещён выше |
| `auth.api.test.js` | Cleanup удалял parallel test users | Уникальный email domain |

---

## 📚 Связанные документы

- [tests/README.md](../README.md) — Главный гайд
- [tests/unit/README.md](../unit/README.md) — Unit тесты
- [tests/e2e/README.md](../e2e/README.md) — E2E тесты
- [docs/PERMISSIONS_REFERENCE.md](../docs/PERMISSIONS_REFERENCE.md) — Справочник разрешений
- [docs/ROLES_ARCHITECTURE.md](../docs/ROLES_ARCHITECTURE.md) — Архитектура ролей
- [docs/SESSION_21-22_NOV.md](../docs/SESSION_21-22_NOV.md) — Детали сессии исправлений

---

*Последнее обновление: Декабрь 2025*
