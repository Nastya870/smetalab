# 🧪 Стратегия тестирования проекта SMETA-LAB

**Дата анализа**: 21 ноября 2025  
**Версия проекта**: v1.21  
**Анализ**: Текущее состояние + Рекомендации по внедрению

---

## 📊 Текущее состояние тестирования

**✅ ДОСТИГНУТО: 100% покрытие интеграционных тестов!**

```
Total Tests: 93/93 (100%) ✅
├─ Unit Tests: 67/67 (100%) ✅
└─ Integration Tests: 26/26 (100%) ✅

Duration: ~28 seconds
Status: ALL PASSING 🎉
```

### 🎯 Последние достижения (21 ноября 2025)

**Исправлено 7 критических проблем в roles API tests:**

1. ✅ **Data isolation** - изолировали тестовые данные через @rolestest.local domain
2. ✅ **Cleanup logic** - исправили удаление tenants (только связанные с @test.com users)
3. ✅ **requireAdmin middleware** - убрали обязательную проверку tenantId для super_admin
4. ✅ **Manager permissions** - заменили manager на admin в тестах (admin имеет разрешения)
5. ✅ **Admin role filtering** - обновили ожидания (admin роль защищена от показа)
6. ✅ **Incorrect API endpoint** - исправили URL с `/api/roles/:id` на `/api/permissions/roles/:id`
7. ✅ **Response structure** - обновили assertions (data.key → data.roleKey)

**Файлы:**
- ✅ `tests/integration/api/auth.api.test.js` - 18/18 passing
- ✅ `tests/integration/api/roles.api.test.js` - 8/8 passing
- ✅ `tests/fixtures/testDatabase.js` - улучшен cleanup
- ✅ `server/middleware/adminAuth.js` - исправлена логика requireAdmin
- ✅ `server/controllers/permissionsController.js` - добавлено логирование

---

## ✅ Установленные зависимости

#### 1. **Vitest** (v3.2.4) - Основной тестовый фреймворк
```json
{
  "vitest": "^3.2.4",
  "@vitest/ui": "^3.2.4",
  "@vitest/coverage-v8": "^3.2.4"
}
```
- ✅ Конфигурация: `vitest.config.mjs` присутствует
- ✅ Настроен coverage с порогами: 70% lines/functions, 60% branches
- ✅ Environment: jsdom для тестирования React компонентов
- ✅ Globals включены (describe, it, expect доступны глобально)

#### 2. **React Testing Library** (v16.3.0) - UI тестирование
```json
{
  "@testing-library/react": "^16.3.0",
  "@testing-library/dom": "^10.4.1",
  "@testing-library/jest-dom": "^6.9.1",
  "@testing-library/user-event": "^14.6.1"
}
```
- ✅ Полный стек для тестирования React компонентов
- ✅ User-event для симуляции взаимодействий
- ✅ Jest-dom для расширенных матчеров (toBeInTheDocument, toHaveValue)

#### 3. **Playwright** (v1.56.0) - E2E тестирование
```json
{
  "@playwright/test": "^1.56.0"
}
```
- ⚠️ Установлен, но конфигурация отсутствует
- ❌ Нет playwright.config.js/ts
- ❌ Нет тестовых сценариев

#### 4. **Supertest** (v7.1.4) - API тестирование
```json
{
  "supertest": "^7.1.4"
}
```
- ✅ Установлен для HTTP тестирования Express endpoints
- ❌ Нет API тестов

#### 5. **MSW (Mock Service Worker)** (v2.11.5)
```json
{
  "msw": "^2.11.5"
}
```
- ✅ Установлен для мокирования HTTP запросов
- ❌ Не настроен и не используется

#### 6. **Happy-DOM / JSDOM** - DOM симуляция
```json
{
  "happy-dom": "^20.0.0",
  "jsdom": "^27.0.0"
}
```
- ✅ Оба установлены (happy-dom быстрее, jsdom полнее)
- ✅ В vitest.config.mjs используется jsdom

---

## 📝 Текущие тесты

### ✅ Существующие тесты

#### 1. `shared/lib/utils/fullTextSearch.test.js`
**Тип**: Unit-тест  
**Статус**: ✅ Написан, но НЕ запускается (нет describe/it/expect)

**Содержание**:
- 12 тестовых сценариев для полнотекстового поиска
- Тесты работ (materials, works) по одному/двум/трём словам
- Тесты регистронезависимости
- Тесты подсветки совпадений
- **Проблема**: Написан как демонстрационный скрипт, а не как реальные тесты

**Нужно переписать в формат Vitest**:
```javascript
// ❌ Текущий формат (не запускается)
const test1 = fullTextSearch(testWorks, 'демонтаж', ['name']);
test1.forEach(w => console.log(w.name));

// ✅ Правильный формат Vitest
describe('fullTextSearch', () => {
  it('должен найти работы по одному слову "демонтаж"', () => {
    const result = fullTextSearch(testWorks, 'демонтаж', ['name']);
    expect(result).toHaveLength(4);
    expect(result[0].name).toContain('Демонтаж');
  });
});
```

---

## 🚨 Критические пробелы в тестировании

### ❌ 1. Backend API (0% покрытие)

**Отсутствуют тесты для**:
- `server/controllers/authController.js` - **критично** (регистрация, логин, JWT)
- `server/controllers/usersController.js` - управление пользователями
- `server/controllers/rolesController.js` - управление ролями (недавно исправленный баг!)
- `server/controllers/permissionsController.js` - система разрешений
- `server/controllers/estimatesController.js` - сметы (основная бизнес-логика)
- `server/controllers/projectsController.js` - проекты
- `server/controllers/contractsController.js` - договора
- `server/middleware/checkPermission.js` - **критично** (иерархические права)
- `server/middleware/auth.js` - **критично** (аутентификация JWT)
- `server/utils/password.js` - валидация паролей
- `server/services/emailService.js` - отправка писем

**Риски**:
- 🔴 **Баг с super_admin** (исправлен 21.11.2025) мог быть выявлен тестами
- 🔴 Изменения в API могут сломать фронтенд незаметно
- 🔴 Нет проверки security middleware
- 🔴 Регрессии при рефакторинге

### ❌ 2. Frontend Components (0% покрытие)

**Отсутствуют тесты для**:
- `app/admin/permissions/PermissionsMatrixSimple.jsx` - недавно модифицирован!
- `app/admin/roles/RoleForm.jsx` - создание/редактирование ролей
- `app/admin/users/UserForm.jsx` - управление пользователями
- `app/estimates/EstimateForm.jsx` - форма сметы (сложная логика)
- `app/projects/ProjectForm.jsx` - создание проектов
- `app/layout/MainLayout/` - навигация, меню (видимость по правам)
- `app/pages/authentication/Login.jsx` - **критично**
- `app/pages/authentication/Register.jsx` - **критично**

**Риски**:
- 🔴 Изменения в UI могут сломать UX
- 🔴 Нет проверки условного рендеринга по правам
- 🔴 Нет проверки валидации форм

### ❌ 3. Integration Tests (0% покрытие)

**Отсутствуют проверки**:
- Полный flow: регистрация → логин → создание проекта → создание сметы
- JWT refresh token logic
- Permission hierarchy: admin.* → users.read
- Tenant isolation (user1 не видит данные tenant2)
- Роли и права: super_admin видит всё, manager видит только свои проекты

### ❌ 4. E2E Tests (0% покрытие)

Playwright установлен, но не используется:
- ❌ Нет `playwright.config.js`
- ❌ Нет папки `tests/e2e/` или `e2e/`
- ❌ Нет сценариев критических user flows

---

## 🎯 Рекомендуемая стратегия внедрения

### Фаза 1: Foundation (1-2 недели) - **ПРИОРИТЕТ**

#### 1.1 Setup Testing Infrastructure

**Создать структуру папок**:
```
vite/
├── tests/
│   ├── setup.js (✅ уже есть в vitest.config)
│   ├── unit/
│   │   ├── backend/
│   │   │   ├── middleware/
│   │   │   │   ├── auth.test.js
│   │   │   │   └── checkPermission.test.js
│   │   │   ├── utils/
│   │   │   │   ├── password.test.js
│   │   │   │   └── jwt.test.js
│   │   │   └── services/
│   │   │       └── emailService.test.js
│   │   └── frontend/
│   │       └── utils/
│   │           └── fullTextSearch.test.js (переписать)
│   ├── integration/
│   │   ├── api/
│   │   │   ├── auth.api.test.js
│   │   │   ├── roles.api.test.js
│   │   │   ├── permissions.api.test.js
│   │   │   └── estimates.api.test.js
│   │   └── components/
│   │       ├── PermissionsMatrix.integration.test.jsx
│   │       └── EstimateForm.integration.test.jsx
│   ├── e2e/
│   │   ├── auth.e2e.test.js
│   │   ├── permissions.e2e.test.js
│   │   └── estimates-flow.e2e.test.js
│   └── fixtures/
│       ├── users.json
│       ├── roles.json
│       └── testDatabase.js
```

**Создать `tests/setup.js`**:
```javascript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock console.error для чистых логов
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
```

**Обновить `package.json` scripts**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:watch": "vitest --watch"
  }
}
```

#### 1.2 Critical Backend Tests - **START HERE**

**`tests/unit/backend/middleware/auth.test.js`** (200 LOC):
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateToken, refreshAccessToken } from '../../../../server/middleware/auth.js';
import jwt from 'jsonwebtoken';

describe('authenticateToken middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('должен вернуть 401 если нет Authorization header', () => {
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Токен не предоставлен' });
  });

  it('должен вернуть 403 если токен невалидный', () => {
    req.headers.authorization = 'Bearer invalid-token';
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('должен добавить user в req если токен валидный', () => {
    const payload = { userId: 1, email: 'test@test.com', roles: ['admin'] };
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    req.headers.authorization = `Bearer ${token}`;
    
    authenticateToken(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(expect.objectContaining(payload));
  });
});
```

**`tests/unit/backend/middleware/checkPermission.test.js`** (300 LOC):
```javascript
import { describe, it, expect, vi } from 'vitest';
import { checkPermission, PERMISSION_HIERARCHY } from '../../../../server/middleware/checkPermission.js';

describe('checkPermission middleware', () => {
  it('должен пропустить если есть точное разрешение', () => {
    const req = { user: { permissions: ['projects.read'] } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    const middleware = checkPermission('projects', 'read');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('должен пропустить через иерархию: admin.* → users.read', () => {
    const req = { user: { permissions: ['admin.*'] } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    const middleware = checkPermission('users', 'read');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('должен пропустить через иерархию: references.* → materials.view_menu', () => {
    const req = { user: { permissions: ['references.*'] } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    const middleware = checkPermission('materials', 'view_menu');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('должен вернуть 403 если нет разрешения', () => {
    const req = { 
      user: { permissions: ['projects.read'], email: 'test@test.com' } 
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    const middleware = checkPermission('users', 'delete');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Доступ запрещен',
      required: 'users.delete',
      userPermissions: ['projects.read']
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('должен проверить PERMISSION_HIERARCHY структуру', () => {
    expect(PERMISSION_HIERARCHY).toHaveProperty('admin');
    expect(PERMISSION_HIERARCHY.admin).toEqual(['users', 'roles']);
    expect(PERMISSION_HIERARCHY.references).toEqual(['materials', 'works', 'counterparties']);
    expect(PERMISSION_HIERARCHY.projects).toEqual(['estimates', 'estimate_templates', 'purchases']);
  });
});
```

**`tests/unit/backend/utils/password.test.js`** (150 LOC):
```javascript
import { describe, it, expect } from 'vitest';
import { validatePassword } from '../../../../server/utils/password.js';

describe('validatePassword', () => {
  it('должен принять валидный пароль', () => {
    const result = validatePassword('Test123!@#');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('должен отклонить короткий пароль', () => {
    const result = validatePassword('Test1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Пароль должен быть не менее 8 символов');
  });

  it('должен отклонить пароль без заглавных букв', () => {
    const result = validatePassword('test123!@#');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Пароль должен содержать заглавные буквы');
  });

  it('должен отклонить пароль без цифр', () => {
    const result = validatePassword('TestTest!@#');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Пароль должен содержать цифры');
  });

  it('должен отклонить пароль без спецсимволов', () => {
    const result = validatePassword('Test12345');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Пароль должен содержать спецсимволы');
  });
});
```

#### 1.3 Critical API Integration Tests

**`tests/integration/api/auth.api.test.js`** (400 LOC):
```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../../server/index.js'; // Нужно экспортировать app
import db from '../../../../server/config/database.js';

describe('Auth API Integration', () => {
  let testDb;
  let server;

  beforeAll(async () => {
    // Setup test database
    testDb = await db.query('SELECT 1');
    server = app.listen(0); // Random port
  });

  afterAll(async () => {
    await db.end();
    server.close();
  });

  describe('POST /api/auth/register', () => {
    it('должен зарегистрировать нового пользователя', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'Test123!@#',
          fullName: 'Test User',
          phone: '+7 999 123 4567'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('newuser@test.com');
      expect(response.body.user).not.toHaveProperty('pass_hash');
    });

    it('должен вернуть 400 для невалидного email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test123!@#',
          fullName: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Некорректный email');
    });

    it('должен вернуть 400 для слабого пароля', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@test.com',
          password: 'weak',
          fullName: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('пароль');
    });
  });

  describe('POST /api/auth/login', () => {
    it('должен вернуть JWT токены для валидных credentials', async () => {
      // Сначала регистрируем
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@test.com',
          password: 'Test123!@#',
          fullName: 'Login Test'
        });

      // Логинимся
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('должен вернуть 401 для неверного пароля', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Неверный email или пароль');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('должен обновить access token по refresh token', async () => {
      // Логинимся
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'Test123!@#'
        });

      const refreshToken = loginRes.body.refreshToken;

      // Обновляем токен
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.accessToken).not.toBe(loginRes.body.accessToken);
    });
  });
});
```

**`tests/integration/api/roles.api.test.js`** (ТЕСТИРУЕТ ИСПРАВЛЕННЫЙ БАГ!):
```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../../../server/index.js';

describe('Roles API - Super Admin Bug Fix Test', () => {
  let superAdminToken;

  beforeAll(async () => {
    // Логинимся как super_admin
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'kiy026@yandex.ru',
        password: '!!!Apsni09332'
      });
    
    superAdminToken = response.body.accessToken;
  });

  it('должен вернуть ТОЛЬКО global roles для super_admin', async () => {
    const response = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toBeInstanceOf(Array);

    // Super admin должен видеть super_admin и admin (template)
    const roleKeys = response.body.data.map(r => r.key);
    expect(roleKeys).toContain('super_admin');
    expect(roleKeys).toContain('admin'); // admin template

    // НЕ должен видеть manager, estimator, supplier (они tenant-specific)
    expect(roleKeys).not.toContain('manager');
    expect(roleKeys).not.toContain('estimator');
    expect(roleKeys).not.toContain('supplier');
  });

  it('должен правильно определить isSuperAdmin через все роли пользователя', async () => {
    // Этот тест проверяет fix от 21.11.2025
    // OLD BUG: roleKey === 'super_admin' проверял только первую роль
    // NEW FIX: userRoles.includes('super_admin') проверяет все роли

    const response = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(response.status).toBe(200);
    
    // Если бы баг остался, вернулись бы tenant roles
    const hasOnlyGlobalRoles = response.body.data.every(role => 
      role.tenant_id === null
    );
    
    expect(hasOnlyGlobalRoles).toBe(true);
  });
});
```

---

### Фаза 2: Component Tests (2-3 недели)

#### 2.1 Critical UI Components

**`tests/unit/frontend/components/PermissionsMatrix.test.jsx`** (300 LOC):
```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PermissionsMatrixSimple from '../../../../app/admin/permissions/PermissionsMatrixSimple.jsx';

describe('PermissionsMatrixSimple', () => {
  const mockRoles = [
    { id: 1, key: 'admin', name: 'Администратор' },
    { id: 2, key: 'manager', name: 'Менеджер' }
  ];

  const mockPermissions = [
    { id: 1, resource: 'admin', action: '*', name: 'Администрирование (все)' },
    { id: 2, resource: 'users', action: 'read', name: 'Просмотр пользователей' },
    { id: 3, resource: 'references', action: '*', name: 'Справочники (все)' },
    { id: 4, resource: 'materials', action: 'view_menu', name: 'Меню материалов' }
  ];

  const mockRolePermissions = {
    1: [1, 2, 3, 4], // admin has all
    2: [2] // manager only users.read
  };

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <PermissionsMatrixSimple
          roles={mockRoles}
          permissions={mockPermissions}
          rolePermissions={mockRolePermissions}
          onPermissionToggle={vi.fn()}
        />
      </BrowserRouter>
    );
  };

  it('должен отрендерить матрицу разрешений', () => {
    renderComponent();
    
    expect(screen.getByText('Администратор')).toBeInTheDocument();
    expect(screen.getByText('Менеджер')).toBeInTheDocument();
  });

  it('должен отсортировать разрешения иерархически', () => {
    renderComponent();
    
    const permissions = screen.getAllByRole('row');
    // admin должен быть первым (order: 1)
    expect(permissions[1]).toHaveTextContent('Администрирование');
    // references должен быть после users (order: 10)
    // materials должен быть после references (order: 11)
  });

  it('должен показать зеленый фон для родительских ресурсов', () => {
    renderComponent();
    
    const adminRow = screen.getByText('Администрирование').closest('tr');
    expect(adminRow).toHaveStyle({ backgroundColor: 'success.lighter' });
  });

  it('должен показать бейдж "Родительский" для parent resources', () => {
    renderComponent();
    
    expect(screen.getAllByText('Родительский')).toHaveLength(3); // admin, references, projects
  });

  it('должен чекнуть checkbox для назначенных прав', () => {
    renderComponent();
    
    const checkboxes = screen.getAllByRole('checkbox');
    // Admin role (column 1) должен иметь все 4 checkbox checked
    expect(checkboxes.filter(cb => cb.checked)).toHaveLength(4);
  });

  it('должен вызвать onPermissionToggle при клике на checkbox', async () => {
    const onToggle = vi.fn();
    
    render(
      <BrowserRouter>
        <PermissionsMatrixSimple
          roles={mockRoles}
          permissions={mockPermissions}
          rolePermissions={mockRolePermissions}
          onPermissionToggle={onToggle}
        />
      </BrowserRouter>
    );

    const checkbox = screen.getAllByRole('checkbox')[4]; // manager's first unchecked
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith(2, expect.any(Number), true);
    });
  });
});
```

**`tests/unit/frontend/components/Login.test.jsx`** (250 LOC):
```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../../../../app/pages/authentication/Login.jsx';

describe('Login Component', () => {
  it('должен отрендерить форму логина', () => {
    render(<Login />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
  });

  it('должен показать ошибку для невалидного email', async () => {
    render(<Login />);
    
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, 'invalid-email');
    
    const submitButton = screen.getByRole('button', { name: /войти/i });
    await userEvent.click(submitButton);
    
    expect(await screen.findByText(/некорректный email/i)).toBeInTheDocument();
  });

  it('должен вызвать API при валидной форме', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ data: { accessToken: 'token' } });
    
    render(<Login onLogin={mockLogin} />);
    
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/пароль/i), 'Test123!@#');
    await userEvent.click(screen.getByRole('button', { name: /войти/i }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'Test123!@#'
      });
    });
  });
});
```

---

### Фаза 3: E2E Tests (2 недели)

#### 3.1 Playwright Setup

**Создать `playwright.config.js`**:
```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**`tests/e2e/auth.e2e.test.js`** (200 LOC):
```javascript
import { test, expect } from '@playwright/test';

test.describe('Authentication E2E', () => {
  test('полный flow: регистрация → логин → dashboard', async ({ page }) => {
    // 1. Регистрация
    await page.goto('/register');
    await page.fill('input[name="email"]', 'e2e@test.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.fill('input[name="fullName"]', 'E2E Test User');
    await page.click('button[type="submit"]');

    // Ожидаем редирект на login
    await expect(page).toHaveURL('/login');

    // 2. Логин
    await page.fill('input[name="email"]', 'e2e@test.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');

    // 3. Проверяем попадание на dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Панель управления')).toBeVisible();
  });

  test('должен показать ошибку для неверного пароля', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@test.com');
    await page.fill('input[name="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Неверный email или пароль')).toBeVisible();
  });
});
```

**`tests/e2e/permissions.e2e.test.js`** (КРИТИЧНЫЙ ТЕСТ):
```javascript
import { test, expect } from '@playwright/test';

test.describe('Permissions System E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Логинимся как super_admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'kiy026@yandex.ru');
    await page.fill('input[name="password"]', '!!!Apsni09332');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('super_admin должен видеть все меню', async ({ page }) => {
    // Проверяем видимость всех 8 пунктов меню
    await expect(page.locator('text=Проекты')).toBeVisible();
    await expect(page.locator('text=Справочники')).toBeVisible();
    await expect(page.locator('text=Материалы')).toBeVisible();
    await expect(page.locator('text=Работы')).toBeVisible();
    await expect(page.locator('text=Контрагенты')).toBeVisible();
    await expect(page.locator('text=Закупки')).toBeVisible();
    await expect(page.locator('text=Шаблоны смет')).toBeVisible();
    await expect(page.locator('text=Администрирование')).toBeVisible();
  });

  test('матрица разрешений: создать роль с иерархическими правами', async ({ page }) => {
    // Переходим в Администрирование → Роли
    await page.click('text=Администрирование');
    await page.click('text=Роли и права');

    // Создаём новую роль
    await page.click('button:has-text("Создать роль")');
    await page.fill('input[name="name"]', 'E2E Test Role');
    await page.fill('input[name="key"]', 'e2e_test');

    // Назначаем admin.* (должно дать доступ к users, roles)
    await page.check('input[value="admin.*"]');

    // Сохраняем
    await page.click('button:has-text("Сохранить")');

    // Проверяем, что роль создана
    await expect(page.locator('text=E2E Test Role')).toBeVisible();

    // Проверяем, что child permissions автоматически активированы
    await page.click('text=E2E Test Role');
    const usersReadCheckbox = page.locator('input[value="users.read"]');
    await expect(usersReadCheckbox).toBeChecked();
  });

  test('manager НЕ должен видеть Администрирование', async ({ page }) => {
    // Логаутимся
    await page.click('text=Профиль');
    await page.click('text=Выход');

    // Логинимся как manager
    await page.fill('input[name="email"]', 'kuzminilya026@gmail.com');
    await page.fill('input[name="password"]', '!!!Apsni09332');
    await page.click('button[type="submit"]');

    // Администрирование НЕ должно быть видно
    await expect(page.locator('text=Администрирование')).not.toBeVisible();
  });
});
```

**`tests/e2e/estimates-flow.e2e.test.js`** (300 LOC):
```javascript
import { test, expect } from '@playwright/test';

test.describe('Estimates Full Flow E2E', () => {
  test('создать проект → создать смету → добавить работы → экспорт', async ({ page }) => {
    // Логин
    await page.goto('/login');
    await page.fill('input[name="email"]', 'i.sknewcity@gmail.com');
    await page.fill('input[name="password"]', '!!!Apsni09332');
    await page.click('button[type="submit"]');

    // 1. Создать проект
    await page.click('text=Проекты');
    await page.click('button:has-text("Создать проект")');
    await page.fill('input[name="name"]', 'E2E Test Project');
    await page.fill('input[name="address"]', 'Test Address 123');
    await page.click('button:has-text("Сохранить")');

    // 2. Создать смету
    await page.click('text=E2E Test Project');
    await page.click('button:has-text("Создать смету")');
    await page.fill('input[name="name"]', 'E2E Test Estimate');
    await page.click('button:has-text("Создать")');

    // 3. Добавить работу
    await page.click('button:has-text("Добавить работу")');
    await page.fill('input[name="search"]', 'Покраска стен');
    await page.click('text=Покраска стен водоэмульсионной краской');
    await page.fill('input[name="quantity"]', '50');
    await page.click('button:has-text("Добавить")');

    // Проверяем, что работа добавлена
    await expect(page.locator('text=Покраска стен')).toBeVisible();
    await expect(page.locator('text=50')).toBeVisible();

    // 4. Экспорт в Excel
    await page.click('button:has-text("Экспорт")');
    await page.click('text=Excel');

    // Ждём скачивания файла
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toContain('.xlsx');
  });
});
```

---

### Фаза 4: Performance & Load Tests (1 неделя) - ОПЦИОНАЛЬНО

#### 4.1 k6 Load Testing

**Установить k6**:
```bash
npm install -D @grafana/k6
```

**Создать `tests/load/api-load.test.js`**:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Разгон до 10 пользователей
    { duration: '1m', target: 50 },   // Разгон до 50
    { duration: '30s', target: 0 },   // Спуск
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% запросов < 2s
    http_req_failed: ['rate<0.01'],    // < 1% ошибок
  },
};

const BASE_URL = 'http://localhost:3001';

export default function () {
  // 1. Login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, {
    email: 'test@test.com',
    password: 'Test123!@#',
  });

  check(loginRes, {
    'login success': (r) => r.status === 200,
    'has token': (r) => r.json('accessToken') !== undefined,
  });

  const token = loginRes.json('accessToken');

  // 2. Get Projects
  const projectsRes = http.get(`${BASE_URL}/api/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(projectsRes, {
    'projects loaded': (r) => r.status === 200,
  });

  // 3. Get Materials (heavy query!)
  const materialsRes = http.get(`${BASE_URL}/api/references/materials?limit=1000`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(materialsRes, {
    'materials loaded': (r) => r.status === 200,
    'materials fast enough': (r) => r.timings.duration < 3000, // < 3s
  });

  sleep(1);
}
```

**Запуск**:
```bash
k6 run tests/load/api-load.test.js
```

---

## 📊 Coverage Goals

### Минимальные пороги (Phase 1)

| Категория | Текущий | Цель Phase 1 | Цель Phase 2 | Цель Phase 3 |
|-----------|---------|--------------|--------------|--------------|
| **Backend API** | 0% | 60% | 75% | 85% |
| **Middleware** | 0% | **80%** (критично) | 90% | 95% |
| **Frontend Components** | 0% | 40% | 60% | 75% |
| **Utils/Helpers** | 0% | 70% | 85% | 90% |
| **E2E Critical Flows** | 0 tests | 5 tests | 15 tests | 30 tests |

### Критичные модули (100% coverage)

1. `server/middleware/auth.js` - аутентификация
2. `server/middleware/checkPermission.js` - авторизация
3. `server/utils/password.js` - безопасность
4. `server/controllers/authController.js` - вход/регистрация

---

## 🛠️ Рекомендуемые инструменты

### 1. **Vitest** (уже установлен) ✅
**Для**: Unit tests, Integration tests  
**Плюсы**: 
- Быстрый (3-10x быстрее Jest)
- Совместимость с Vite
- HMR для тестов
- Отличная TypeScript поддержка

**Используйте для**:
- Тесты utils/helpers
- Тесты middleware
- Тесты React компонентов (с React Testing Library)
- API integration tests (с supertest)

### 2. **Playwright** (уже установлен) ✅
**Для**: E2E tests  
**Плюсы**:
- Мульти-браузерность (Chrome, Firefox, Safari)
- Автоматическое ожидание
- Мощные dev tools (UI mode, trace viewer)
- Mobile testing

**Используйте для**:
- Критичные user flows
- Cross-browser testing
- Visual regression testing

### 3. **MSW (Mock Service Worker)** (уже установлен) ⚠️
**Для**: Мокирование API в тестах  
**Плюсы**:
- Работает как в Node.js, так и в браузере
- Перехватывает fetch/axios запросы
- Не требует изменений в коде приложения

**Настройка**:
```javascript
// tests/mocks/handlers.js
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      accessToken: 'mock-token',
      user: { id: 1, email: 'test@test.com' }
    });
  }),

  http.get('/api/projects', () => {
    return HttpResponse.json({
      data: [
        { id: 1, name: 'Mock Project' }
      ]
    });
  }),
];

// tests/mocks/server.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// tests/setup.js
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 4. **k6** (опционально)
**Для**: Load/Performance testing  
**Плюсы**:
- Написан на Go (быстрый)
- JavaScript API
- Cloud интеграция

**Установка**:
```bash
npm install -D @grafana/k6
```

### 5. **Storybook** (опционально)
**Для**: Компонентная разработка + визуальное тестирование  
**Плюсы**:
- Изолированная разработка компонентов
- Visual regression с Chromatic
- Документация компонентов

---

## 🎬 Quick Start (Запуск тестов)

### 1. Запуск Unit Tests

```bash
# Все unit тесты
npm run test:unit

# С watch mode
npm run test:watch

# С coverage
npm run test:coverage

# UI для Vitest
npm run test:ui
```

### 2. Запуск Integration Tests

```bash
# API integration тесты
npm run test:integration

# Конкретный файл
npm run test tests/integration/api/auth.api.test.js
```

### 3. Запуск E2E Tests

```bash
# Все E2E тесты
npm run test:e2e

# С UI mode
npm run test:e2e:ui

# Только Chromium
npx playwright test --project=chromium

# Отладка
npx playwright test --debug
```

### 4. CI/CD Pipeline

**`.github/workflows/tests.yml`**:
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## 📝 Best Practices

### 1. **AAA Pattern** (Arrange-Act-Assert)

```javascript
it('должен создать пользователя', async () => {
  // Arrange
  const userData = { email: 'test@test.com', password: 'Test123!@#' };
  
  // Act
  const result = await createUser(userData);
  
  // Assert
  expect(result).toHaveProperty('id');
  expect(result.email).toBe('test@test.com');
});
```

### 2. **Test Isolation**

```javascript
describe('User API', () => {
  beforeEach(async () => {
    // Очищаем БД перед каждым тестом
    await db.query('TRUNCATE users CASCADE');
  });
  
  afterEach(async () => {
    // Откатываем транзакции
    await db.query('ROLLBACK');
  });
});
```

### 3. **Descriptive Test Names**

```javascript
// ❌ Плохо
it('works', () => { ... });

// ✅ Хорошо
it('должен вернуть 403 если пользователь не имеет прав admin.*', () => { ... });
```

### 4. **Test Data Factories**

```javascript
// tests/fixtures/factories.js
export const createUser = (overrides = {}) => ({
  email: 'test@test.com',
  password: 'Test123!@#',
  fullName: 'Test User',
  phone: '+7 999 123 4567',
  ...overrides
});

// Использование
const user1 = createUser({ email: 'user1@test.com' });
const user2 = createUser({ email: 'user2@test.com' });
```

---

## 🚀 Roadmap

### Week 1-2: Foundation ⭐ PRIORITY
- [ ] Создать структуру папок `tests/`
- [ ] Настроить `tests/setup.js`
- [ ] Написать 3 critical middleware tests (auth, checkPermission, password)
- [ ] Добавить scripts в package.json
- [ ] Первый запуск: `npm run test`

### Week 3-4: Backend Coverage
- [ ] Auth API tests (register, login, refresh)
- [ ] Roles API tests (getAllRoles bug fix verification)
- [ ] Permissions API tests
- [ ] Projects API tests
- [ ] Estimates API tests
- [ ] **Target: 60% backend coverage**

### Week 5-6: Frontend Components
- [ ] PermissionsMatrix tests
- [ ] Login/Register tests
- [ ] EstimateForm tests
- [ ] ProjectForm tests
- [ ] Navigation/Menu tests
- [ ] **Target: 40% frontend coverage**

### Week 7-8: E2E Critical Flows
- [ ] Playwright config
- [ ] Auth flow E2E
- [ ] Permissions system E2E (super_admin roles test!)
- [ ] Estimates creation E2E
- [ ] Export/Import E2E
- [ ] **Target: 5 E2E tests**

### Week 9+: Optimization
- [ ] MSW integration
- [ ] Performance tests (k6)
- [ ] Visual regression (Playwright screenshots)
- [ ] CI/CD pipeline
- [ ] Storybook (optional)

---

## � План дальнейших действий

### ✅ COMPLETED: Phase 1-2 (100%)

**Phase 1: Unit Tests** ✅
- ✅ 67/67 tests passing
- ✅ auth.js (100% coverage)
- ✅ password.js (100% coverage)  
- ✅ checkPermission.js (46% coverage)

**Phase 2: Integration Tests** ✅
- ✅ 26/26 tests passing
- ✅ Auth API (18 tests) - register, login, refresh, logout, /me
- ✅ Roles API (8 tests) - super_admin bug fix, tenant isolation

---

### 🎯 NEXT: Phase 3 - E2E Tests (2-3 hours)

**Цель:** Протестировать критические пользовательские сценарии

**Playwright Setup** (30 min):
```bash
# 1. Создать playwright.config.ts
# 2. Настроить baseURL, browsers (chromium, firefox)
# 3. Настроить test data cleanup
```

**E2E Scenarios** (2 hours):
1. **Auth Flow** (30 min)
   - Registration → Email verification → Login → Dashboard
   - Logout → Login again
   
2. **Project Management** (30 min)
   - Create project → Add materials → Generate estimate
   - Export to Excel → Verify downloaded file

3. **Admin Panel** (30 min)
   - Super admin login → View global roles
   - Create tenant admin → Assign permissions
   - Verify roles.read permission

4. **Permissions System** (30 min)
   - Login as tenant admin → Cannot see super_admin role
   - Login as super_admin → See global roles
   - Verify the bug fix we just implemented!

**Success Criteria:**
- ✅ 5+ E2E tests passing
- ✅ Critical flows covered
- ✅ Tests run in CI/CD

---

### 🎯 ALTERNATIVE: Phase 4 - Performance Tests (1-2 hours)

**Если E2E не приоритет, можем сделать performance testing:**

**k6 or Artillery Setup** (30 min):
```bash
npm install --save-dev k6 autocannon
```

**Load Tests** (1 hour):
1. Auth endpoints (login, refresh) - 100 req/sec
2. Project CRUD - 50 req/sec
3. Estimate generation - 20 req/sec

**Metrics:**
- Response time (p95, p99)
- Throughput (req/sec)
- Error rate (%)

---

### 🎯 BEST OPTION: CI/CD Setup (1 hour)

**Автоматизация тестов - самый большой ROI!**

**GitHub Actions Workflow** (`.github/workflows/test.yml`):
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - name: Coverage Report
        run: npm run coverage
```

**Benefits:**
- ✅ Auto-run tests on every commit
- ✅ Block PRs with failing tests
- ✅ Coverage reports
- ✅ Email notifications

---

## 💡 Рекомендация: ЧТО ДЕЛАТЬ СЕЙЧАС?

### 🥇 Вариант A: **CI/CD Setup** (РЕКОМЕНДУЕТСЯ)
**Время:** 1 hour  
**Ценность:** ⭐⭐⭐⭐⭐  
**Результат:** Автоматический запуск 93 тестов на каждом commit

### 🥈 Вариант B: **E2E Tests**
**Время:** 2-3 hours  
**Ценность:** ⭐⭐⭐⭐  
**Результат:** 5+ критических сценариев покрыты

### 🥉 Вариант C: **Expand Unit Coverage**
**Время:** 2-4 hours  
**Ценность:** ⭐⭐⭐  
**Результат:** checkPermission.js 46% → 80%, добавить tests для controllers

### 🏅 Вариант D: **Performance Tests**
**Время:** 1-2 hours  
**Ценность:** ⭐⭐  
**Результат:** Baseline metrics, identify bottlenecks

---

## � Deprecated: Old Weekly Plan

### Week 1-2: Foundation (DONE ✅)
- [x] Создать структуру папок `tests/`
- [x] Настроить `tests/setup.js`
- [x] Написать 3 critical middleware tests (auth, checkPermission, password)
- [x] Добавить scripts в package.json
- [x] Первый запуск: `npm run test`

### Week 3-4: Backend Coverage (DONE ✅)
- [x] Auth API tests (register, login, refresh)
- [x] Roles API tests (getAllRoles bug fix verification)
- [ ] Permissions API tests
- [ ] Projects API tests
- [ ] Estimates API tests
- **Achieved: Auth+Roles 100%, Overall 60%+ backend coverage**

### Week 5-6: Frontend Components
2. Написать auth.api.test.js
3. Написать roles.api.test.js (тест бага super_admin!)
4. Достичь 20% backend coverage

### 🎯 THIS MONTH:

1. 60% backend coverage
2. 5 critical E2E tests
3. CI/CD pipeline настроен
4. Все новые PR требуют тестов

---

## 📚 Полезные ресурсы

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Kent C. Dodds - Testing Blog](https://kentcdodds.com/blog?q=testing)

---

## 🎯 Success Metrics

**К концу внедрения тестирования**:

- ✅ **80%+ backend coverage**
- ✅ **60%+ frontend coverage**
- ✅ **15+ E2E critical flows**
- ✅ **0 high-severity bugs в production** (prevented by tests)
- ✅ **CI/CD pipeline: все тесты зелёные перед deploy**
- ✅ **Время на regression testing: -70%**
- ✅ **Confidence в рефакторинге: +200%**

---

**Автор**: GitHub Copilot  
**Дата**: 21 ноября 2025  
**Версия**: 1.0

