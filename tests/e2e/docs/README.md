# 🌐 E2E Tests (Playwright)

**Статус:** ✅ Настроено! 39 тестов написано

---

## 🎯 Текущее покрытие

### ✅ Реализовано (39 тестов)

#### 1. Регистрация и вход (21 тест)
- ✅ Форма логина (7 тестов)
- ✅ Регистрация (9 тестов)
- ✅ Logout (5 тестов)

#### 2. Управление проектами (9 тестов)
- ✅ Создание нового проекта
- ✅ Редактирование проекта
- ✅ Удаление проекта
- ✅ Поиск проектов
- ✅ Пустое состояние

#### 3. Работа со сметами (9 тестов)
- ✅ Создание сметы
- ✅ Добавление работ в смету
- ✅ Добавление материалов
- ✅ Расчёт итогов
- ✅ Экспорт сметы
- ✅ Удаление сметы

### ⏳ TODO (будущее)

#### Управление ролями (Admin)
- [ ] Создание новой роли
- [ ] Назначение разрешений
- [ ] Назначение роли пользователю
- [ ] Проверка ограничений доступа

#### Импорт данных
- [ ] Импорт работ из CSV
- [ ] Импорт материалов из CSV
- [ ] Валидация ошибок импорта

---

## 🚀 Установка

Playwright уже установлен! Если нужно переустановить:

```powershell
cd vite
npm install -D @playwright/test
npx playwright install chromium
```

---

## 📁 Структура E2E тестов

```
tests/e2e/
├── auth/                      ✅ Готово
│   ├── login.spec.js         # 7 тестов
│   ├── register.spec.js      # 9 тестов
│   └── logout.spec.js        # 5 тестов
├── projects/                  ✅ Готово
│   └── create-project.spec.js # 9 тестов
├── estimates/                 ✅ Готово
│   └── create-estimate.spec.js # 9 тестов
├── fixtures/
│   └── authHelpers.js        # Вспомогательные функции
└── docs/
    └── README.md             # Этот файл
```

---

## 🔧 Конфигурация

**playwright.config.js:**
```javascript
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,                    // 30 секунд на тест
  baseURL: 'http://localhost:3000',  // Dev сервер
  
  use: {
    trace: 'on-first-retry',          // Запись при retry
    screenshot: 'only-on-failure',     // Скриншот при ошибке
    video: 'retain-on-failure',        // Видео при ошибке
  },
  
  projects: [
    { name: 'chromium' },             // Только Chrome (быстрее)
  ],
  
  webServer: {
    command: 'npm run dev',           // Авто-запуск сервера
    url: 'http://localhost:3000',
    reuseExistingServer: true,        // Использовать запущенный
  },
});
```

---

## 🚀 Запуск

### Все E2E тесты
```powershell
cd vite
npx playwright test
```

### Конкретный файл
```powershell
npx playwright test tests/e2e/auth/login.spec.js
```

### С UI (интерактивный режим)
```powershell
npx playwright test --ui
```

### Debug режим
```powershell
npx playwright test --debug
```

### В headed mode (видеть браузер)
```powershell
npx playwright test --headed
```

### Просмотр HTML отчёта
```powershell
npx playwright show-report tests/e2e/reports
```

---

## 📝 Пример теста

**tests/e2e/auth/login.spec.js:**
```javascript
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Вход');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should successfully login', async ({ page }) => {
    // Создаём пользователя через API
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User',
      companyName: 'Test Company'
    };

    await page.request.post('http://localhost:3001/api/auth/register', {
      data: testUser
    });

    // Логинимся через UI
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Проверяем редирект
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

---

## 🔧 Вспомогательные функции

**tests/e2e/fixtures/authHelpers.js:**

```javascript
// Создать тестового пользователя
export async function createTestUser(page, userData = {}) {
  const timestamp = Date.now();
  const user = {
    email: `e2e-test-${timestamp}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    companyName: `Test Company ${timestamp}`,
    ...userData
  };

  await page.request.post('http://localhost:3001/api/auth/register', {
    data: user
  });

  return user;
}

// Залогинить через API
export async function loginViaAPI(page, context, email, password) {
  const response = await page.request.post('http://localhost:3001/api/auth/login', {
    data: { email, password }
  });

  const { token } = await response.json();

  await context.addCookies([{
    name: 'token',
    value: token,
    domain: 'localhost',
    path: '/'
  }]);

  return token;
}

// Создать и залогинить
export async function createAndLoginUser(page, context, userData = {}) {
  const user = await createTestUser(page, userData);
  const token = await loginViaAPI(page, context, user.email, user.password);
  return { ...user, token };
}
```

**Использование:**
```javascript
import { createAndLoginUser } from '../fixtures/authHelpers.js';

test('protected page', async ({ page, context }) => {
  const user = await createAndLoginUser(page, context);
  await page.goto('/dashboard');
  // Теперь пользователь авторизован!
});
```

---

## 📊 Первый запуск - результаты

### ✅ Что работает
- Playwright установлен
- Конфигурация создана
- 39 тестов написано
- Dev сервер запускается
- Скриншоты и видео записываются при ошибках

### ❌ Что нужно починить

**1. Роутинг (критично)**
- Приложение не редиректит на /login для неавторизованных
- Все страницы перенаправляют на главную

**2. API регистрации**
- Возвращает 400 ошибки
- Нужно проверить валидацию полей

**3. Селекторы UI**
- Некоторые элементы не найдены
- Нужно добавить data-testid атрибуты

**ЭТО НОРМАЛЬНО!** E2E тесты находят настоящие баги в приложении.

---

## 🐛 Отладка

### 1. Посмотреть скриншоты и видео

После failed теста:
```
vite/test-results/
  auth-login-should-xxx-chromium/
    test-failed-1.png     ← Скриншот момента ошибки
    video.webm            ← Видео всего теста
    error-context.md      ← Контекст ошибки
```

### 2. Запустить в headed режиме

```powershell
npx playwright test --headed
```

Браузер откроется и вы увидите что происходит в реальном времени.

### 3. Пауза в тесте

```javascript
await page.pause(); // Тест остановится, откроется Playwright Inspector
```

### 4. Console logs

```javascript
page.on('console', msg => console.log('Browser:', msg.text()));
```

### 5. Только один тест

```javascript
test.only('specific test', async ({ page }) => {
  // ...
});
```

---

## 🎯 Следующие шаги

### Фаза 1: Починить базовый роутинг ⏳

1. **Проблема**: Приложение не перенаправляет на /login
2. **Решение**: Добавить проверку токена в роутинге
3. **Файлы**: `src/routes/index.jsx` или аналогичный

```javascript
// Пример защищённого роута
if (!token && isProtectedRoute) {
  return <Navigate to="/login" />;
}
```

### Фаза 2: Починить API регистрации ⏳

1. **Проблема**: `/api/auth/register` возвращает 400
2. **Решение**: Проверить валидацию в `server/routes/auth.js`
3. **Тест**: Отправить запрос через Postman/curl

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User",
    "companyName": "Test Company"
  }'
```

### Фаза 3: Обновить селекторы ⏳

1. **Проблема**: Элементы не найдены
2. **Решение**: Добавить `data-testid` атрибуты

```jsx
// Было
<button type="submit">Войти</button>

// Стало
<button type="submit" data-testid="login-submit">Войти</button>

// В тесте
await page.click('[data-testid="login-submit"]');
```

### Фаза 4: Расширить покрытие 📋

- [ ] Добавить тесты для сеттингов
- [ ] Добавить тесты для пермиссий
- [ ] Добавить тесты для поставщиков
- [ ] Добавить тесты для импорта/экспорта

---

## 📚 Полезные команды

```powershell
# Запуск только auth тестов
npx playwright test tests/e2e/auth

# Запуск в 1 worker (последовательно)
npx playwright test --workers=1

# Показать браузер
npx playwright test --headed

# Только failed тесты
npx playwright test --last-failed

# Список всех тестов
npx playwright test --list

# Codegen - запись действий в браузере
npx playwright codegen http://localhost:3000
```

---

## 🔍 Best Practices для селекторов

### ✅ Рекомендуемые подходы

1. **data-testid** (лучший):
```javascript
<button data-testid="submit-button">Submit</button>
await page.click('[data-testid="submit-button"]');
```

2. **По роли**:
```javascript
await page.click('button[type="submit"]');
```

3. **По тексту**:
```javascript
await page.click('button:has-text("Submit")');
```

4. **По label/name**:
```javascript
await page.fill('input[name="email"]', 'test@example.com');
```

### ❌ Избегать

- **ID** - часто динамические
- **Классы** - часто меняются при стилизации
- **Xpath** - хрупкие и сложные

---

## 📈 CI/CD Интеграция

Когда будет готово GitHub Actions:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: tests/e2e/reports/
```

---

## 🎓 Ресурсы

- [Playwright Docs](https://playwright.dev) - официальная документация
- [Best Practices](https://playwright.dev/docs/best-practices) - лучшие практики
- [API Reference](https://playwright.dev/docs/api/class-playwright) - справочник API
- [Selectors Guide](https://playwright.dev/docs/selectors) - руководство по селекторам

---

## 💡 Советы

1. **Используйте page.waitForURL()** вместо page.waitForTimeout()
2. **Делайте тесты независимыми** - каждый должен работать отдельно
3. **Используйте beforeEach** для общей подготовки
4. **Проверяйте не только success**, но и error случаи
5. **Добавляйте скриншоты** при ошибках (уже настроено)
6. **Используйте authHelpers** для создания пользователей

---

## 🆘 Помощь

Если тесты падают:

1. Запустите с `--headed` чтобы увидеть что происходит
2. Посмотрите скриншоты в `vite/test-results/`
3. Проверьте что dev сервер запущен: `npm run dev`
4. Проверьте что база данных доступна
5. Используйте `await page.pause()` для пошаговой отладки
6. Используйте `npx playwright codegen` для записи действий

---

**Статус**: ✅ Инфраструктура готова, 39 тестов написано, ожидает починки роутинга и API

**Последнее обновление**: 22 ноября 2024
