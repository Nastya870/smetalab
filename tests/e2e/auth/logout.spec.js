import { test, expect } from '@playwright/test';

test.describe('Logout Flow', () => {
  let testUser;

  // Хелпер для выхода из системы (UI ProfileSection)
  async function performLogout(page) {
    // 1. Клик на кнопку аккаунта (Chip с aria-label="user-account")
    const userAccountButton = page.locator('[aria-label="user-account"]');
    await userAccountButton.click();
    await page.waitForTimeout(500);
    
    // 2. Клик на пункт "Выйти" в открывшемся меню
    const logoutMenuItem = page.locator('text="Выйти"').first();
    await logoutMenuItem.click();
    await page.waitForTimeout(300);
    
    // 3. Подтверждаем в диалоге - нажимаем "Да"
    const confirmButton = page.locator('button:has-text("Да")');
    await confirmButton.click();
  }

  test.beforeEach(async ({ page }) => {
    // Создаём и логиним пользователя перед каждым тестом
    const timestamp = Date.now();
    testUser = {
      email: `e2e-logout-${timestamp}@example.com`,
      password: 'TestPassword123!',
      fullName: 'Logout Test User',
      companyName: `Test Company ${timestamp}`,
      skipEmailVerification: true // E2E режим - email сразу подтверждён
    };

    // Регистрация через API
    const regResponse = await page.request.post('http://localhost:3001/api/auth/register', {
      data: testUser
    });
    
    if (!regResponse.ok()) {
      const errorBody = await regResponse.text();
      throw new Error(`Registration failed: ${regResponse.status()} - ${errorBody}`);
    }

    // Логин через UI
    await page.goto('/auth/login');
    await page.fill('input[name="email"], input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Ждём успешного логина (редирект на /app)
    await page.waitForURL('**/app**', { timeout: 15000 });
  });

  test('should successfully logout user', async ({ page }) => {
    // Выполняем выход
    await performLogout(page);
    
    // Ожидаем редиректа на главную или страницу логина
    await Promise.race([
      page.waitForURL('**/auth/login', { timeout: 10000 }),
      page.waitForURL('**/', { timeout: 10000 })
    ]);
    
    // Проверяем что не в приложении
    await expect(page).not.toHaveURL(/\/app/);
  });

  test('should clear authentication data after logout', async ({ page }) => {
    // Выполняем выход
    await performLogout(page);
    
    // Ожидаем редиректа (может быть /auth/login или /pages/login)
    await Promise.race([
      page.waitForURL('**/auth/login', { timeout: 10000 }),
      page.waitForURL('**/pages/login', { timeout: 10000 }),
      page.waitForURL('**/', { timeout: 10000 })
    ]);

    // Проверяем что токен удалён из localStorage
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(accessToken).toBeFalsy();

    // Пытаемся зайти на защищённую страницу
    await page.goto('/app');
    
    // Должны редиректнуться обратно на login (любой из вариантов)
    await Promise.race([
      page.waitForURL('**/auth/login', { timeout: 10000 }),
      page.waitForURL('**/pages/login', { timeout: 10000 })
    ]);
    await expect(page).toHaveURL(/\/(auth|pages)\/login/);
  });

  test('should not access protected routes after logout', async ({ page }) => {
    // Выполняем выход
    await performLogout(page);
    
    // Ожидаем редиректа
    await Promise.race([
      page.waitForURL('**/auth/login', { timeout: 10000 }),
      page.waitForURL('**/pages/login', { timeout: 10000 }),
      page.waitForURL('**/', { timeout: 10000 })
    ]);

    // Пытаемся зайти на защищённую страницу /app
    await page.goto('/app');
    
    // Ждём загрузки страницы и возможного редиректа
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
    
    // Проверяем что мы не остались залогиненными - нет меню пользователя
    const userAccountButton = page.locator('[aria-label="user-account"]');
    const isLoggedIn = await userAccountButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    // Если не видно кнопку аккаунта - значит мы не залогинены (ОК)
    // Если мы на странице логина - тоже ОК
    const url = page.url();
    const isLoginPage = url.includes('/login');
    
    expect(!isLoggedIn || isLoginPage).toBeTruthy();
  });

  test('should show login form after logout', async ({ page }) => {
    // Выполняем выход
    await performLogout(page);
    
    // Ожидаем редиректа
    await Promise.race([
      page.waitForURL('**/auth/login', { timeout: 10000 }),
      page.waitForURL('**/', { timeout: 10000 })
    ]);
    
    // Переходим на логин если нас перебросило на главную
    if (!page.url().includes('/auth/login')) {
      await page.goto('/auth/login');
    }

    // Проверяем что форма логина отображается
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should be able to login again after logout', async ({ page }) => {
    // Выполняем выход
    await performLogout(page);
    
    // Ожидаем редиректа
    await Promise.race([
      page.waitForURL('**/auth/login', { timeout: 10000 }),
      page.waitForURL('**/', { timeout: 10000 })
    ]);
    
    // Переходим на логин если нас перебросило на главную
    if (!page.url().includes('/auth/login')) {
      await page.goto('/auth/login');
    }

    // Логинимся снова
    await page.fill('input[name="email"], input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Должны попасть обратно на /app
    await page.waitForURL('**/app**', { timeout: 10000 });
    
    // Проверяем что мы в приложении
    await expect(page).toHaveURL(/\/app/);
  });
});
