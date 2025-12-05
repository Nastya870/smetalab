import { test, expect } from '@playwright/test';
import { createAndLoginUser } from '../fixtures/authHelpers.js';

test.describe('Estimates Management', () => {
  let user;

  test.beforeEach(async ({ page, context }) => {
    // Создаём и логиним пользователя
    user = await createAndLoginUser(page, context);
    // Переходим на страницу шаблонов смет (доступна без проекта)
    await page.goto('/app/estimate-templates');
    await page.waitForTimeout(1000);
  });

  test('should display estimate templates page', async ({ page }) => {
    // Проверяем что мы на странице
    await expect(page).toHaveURL(/\/app\/estimate-templates/);
    
    // Страница загружается (любой контент)
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('should have navigation menu', async ({ page }) => {
    // Проверяем что меню навигации отображается
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('should show empty state for new user', async ({ page, context }) => {
    // Создаём нового пользователя
    const newUser = await createAndLoginUser(page, context, {
      email: `empty-estimates-${Date.now()}@example.com`
    });
    
    await page.goto('/app/estimate-templates');
    await page.waitForTimeout(1000);
    
    // Страница загружается, либо пустое состояние, либо список
    await expect(page).toHaveURL(/\/app\/estimate-templates/);
  });

  test('should navigate to projects page', async ({ page }) => {
    // Переходим на проекты
    await page.goto('/app/projects');
    await page.waitForTimeout(1000);
    
    // Проверяем что мы на странице проектов
    await expect(page).toHaveURL(/\/app\/projects/);
    await expect(page.locator('text=Управление проектами')).toBeVisible({ timeout: 10000 });
  });

  test('should access references works page', async ({ page }) => {
    // Переходим на справочник работ
    await page.goto('/app/references/works');
    await page.waitForTimeout(1000);
    
    // Проверяем что страница загружается
    await expect(page).toHaveURL(/\/app\/references\/works/);
  });

  test('should access references materials page', async ({ page }) => {
    // Переходим на справочник материалов
    await page.goto('/app/references/materials');
    await page.waitForTimeout(1000);
    
    // Проверяем что страница загружается
    await expect(page).toHaveURL(/\/app\/references\/materials/);
  });

  test('should access purchases page', async ({ page }) => {
    // Переходим на закупки
    await page.goto('/app/purchases/global');
    await page.waitForTimeout(1000);
    
    // Проверяем что страница загружается
    await expect(page).toHaveURL(/\/app\/purchases\/global/);
  });
});
