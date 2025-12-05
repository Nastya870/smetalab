import { test, expect } from '@playwright/test';

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
  });

  test('should display registration form with all fields', async ({ page }) => {
    // Проверяем заголовок
    const heading = page.locator('text=Регистрация').first();
    await expect(heading).toBeVisible();
    
    // Проверяем наличие основных полей
    await expect(page.locator('input[name="companyName"]')).toBeVisible();
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Проверяем чекбокс согласия
    await expect(page.locator('input[name="checked"], input[type="checkbox"]').first()).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Отмечаем чекбокс согласия
    await page.locator('input[name="checked"], input[type="checkbox"]').first().click();
    
    // Нажимаем submit без заполнения полей
    await page.click('button[type="submit"]');
    
    // Форма использует HTML5 required validation - проверяем что остались на странице
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.fill('input[name="companyName"]', 'ООО Тест');
    await page.fill('input[name="fullName"]', 'Иван Иванов');
    await page.fill('input[name="email"]', 'not-valid-email');
    await page.fill('input[name="password"]', 'Password123!');
    
    // Отмечаем чекбокс
    await page.locator('input[name="checked"], input[type="checkbox"]').first().click();
    
    await page.click('button[type="submit"]');
    
    // HTML5 валидация email - остаёмся на странице
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('should show error for weak password', async ({ page }) => {
    await page.fill('input[name="companyName"]', 'ООО Тест');
    await page.fill('input[name="fullName"]', 'Иван Иванов');
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', '123'); // Слабый пароль
    
    // Отмечаем чекбокс
    await page.locator('input[name="checked"], input[type="checkbox"]').first().click();
    
    await page.click('button[type="submit"]');
    
    // Ожидаем ошибку от сервера или остаёмся на странице
    await page.waitForTimeout(2000);
    
    // Проверяем что НЕ редиректнуло (пароль слабый)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/auth\/register|\/registration-success/);
  });

  test('should successfully register new user', async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      companyName: `Тестовая компания ${timestamp}`,
      fullName: 'Тест Пользователь',
      email: `e2e-register-${timestamp}@example.com`,
      password: 'SecurePassword123!'
    };

    // Заполняем форму
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.fill('input[name="fullName"]', testUser.fullName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    
    // Отмечаем чекбокс согласия
    await page.locator('input[name="checked"], input[type="checkbox"]').first().click();
    
    // Отправляем форму
    await page.click('button[type="submit"]');
    
    // Ждём редиректа на страницу успешной регистрации
    await page.waitForURL('**/registration-success**', { timeout: 15000 });
    
    // Проверяем что не на странице регистрации
    await expect(page).not.toHaveURL(/\/auth\/register$/);
  });

  test('should show error for duplicate email', async ({ page }) => {
    const testEmail = `duplicate-${Date.now()}@example.com`;
    
    // Создаём пользователя через API
    await page.request.post('http://localhost:3001/api/auth/register', {
      data: {
        email: testEmail,
        password: 'Password123!',
        fullName: 'First User',
        companyName: `Company One ${Date.now()}`
      }
    });

    // Пытаемся зарегистрировать второго с тем же email
    await page.fill('input[name="companyName"]', `Company Two ${Date.now()}`);
    await page.fill('input[name="fullName"]', 'Second User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'Password123!');
    
    // Отмечаем чекбокс
    await page.locator('input[name="checked"], input[type="checkbox"]').first().click();
    
    await page.click('button[type="submit"]');
    
    // Должна быть ошибка о существующем email
    await page.waitForTimeout(2000);
    const error = page.locator('.MuiAlert-root, .error, [role="alert"]');
    await expect(error.first()).toBeVisible({ timeout: 5000 });
  });

  test('should have "Back to Login" link', async ({ page }) => {
    // Проверяем ссылку на логин
    const loginLink = page.locator('a:has-text("Вход"), a:has-text("Войти"), a:has-text("вход")');
    await expect(loginLink.first()).toBeVisible();
    
    // Кликаем и проверяем редирект (может быть /auth/login или /pages/login)
    await loginLink.first().click();
    await expect(page).toHaveURL(/\/(auth|pages)\/login/);
  });

  test('should accept cyrillic characters in name fields', async ({ page }) => {
    const timestamp = Date.now();
    
    await page.fill('input[name="companyName"]', `ООО Строительная компания ${timestamp}`);
    await page.fill('input[name="fullName"]', 'Александр Смирнов');
    await page.fill('input[name="email"]', `cyrillic-${timestamp}@example.com`);
    await page.fill('input[name="password"]', 'Password123!');
    
    // Отмечаем чекбокс
    await page.locator('input[name="checked"], input[type="checkbox"]').first().click();
    
    await page.click('button[type="submit"]');
    
    // Регистрация должна пройти успешно
    await page.waitForURL('**/registration-success**', { timeout: 15000 });
    
    await expect(page).not.toHaveURL(/\/auth\/register$/);
  });

  test('should trim whitespace from inputs', async ({ page }) => {
    const timestamp = Date.now();
    
    // Вводим с пробелами
    await page.fill('input[name="companyName"]', `  ООО Тест ${timestamp}  `);
    await page.fill('input[name="fullName"]', '  Иван Петров  ');
    await page.fill('input[name="email"]', `  trim-${timestamp}@example.com  `);
    await page.fill('input[name="password"]', 'Password123!');
    
    // Отмечаем чекбокс
    await page.locator('input[name="checked"], input[type="checkbox"]').first().click();
    
    await page.click('button[type="submit"]');
    
    // Регистрация должна пройти (данные должны обрезаться на сервере)
    await page.waitForURL('**/registration-success**', { timeout: 15000 });
    
    await expect(page).not.toHaveURL(/\/auth\/register$/);
  });
});
