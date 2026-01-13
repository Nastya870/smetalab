import { test, expect } from '@playwright/test';

/**
 * Production Smoke Tests
 * Использует существующий аккаунт админа, не создает новых пользователей
 */

const ADMIN_CREDENTIALS = {
  email: 'Kiy026@yandex.ru',
  password: '!!!Apsni09332'
};

test.describe('Production Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Логин с существующим аккаунтом
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"], input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[name="password"], input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Ждем редиректа после логина
    await page.waitForURL(/\/app/, { timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test('should login successfully', async ({ page }) => {
    // Проверяем что залогинились
    await expect(page).toHaveURL(/\/app/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to projects page', async ({ page }) => {
    await page.goto('/app/projects');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveURL(/\/app\/projects/);
    // Проверяем что страница загрузилась (навигация или контент)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to estimate templates', async ({ page }) => {
    await page.goto('/app/estimate-templates');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveURL(/\/app\/estimate-templates/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to materials reference', async ({ page }) => {
    await page.goto('/app/references/materials');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveURL(/\/app\/references\/materials/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to works reference', async ({ page }) => {
    await page.goto('/app/references/works');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveURL(/\/app\/references\/works/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to purchases', async ({ page }) => {
    await page.goto('/app/purchases');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveURL(/\/app\/purchases/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have navigation menu', async ({ page }) => {
    // Проверяем наличие навигационного меню
    const nav = page.locator('nav, [role="navigation"], header').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('should display user profile or avatar', async ({ page }) => {
    // Проверяем что пользователь залогинен (есть аватар или email)
    const userIndicator = page.locator('[aria-label*="profile"], [aria-label*="account"], img[alt*="avatar"], button:has-text("Kiy026")').first();
    await expect(userIndicator).toBeVisible({ timeout: 10000 });
  });
});
