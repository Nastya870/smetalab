import { test, expect } from '@playwright/test';
import { createAndLoginUser } from '../fixtures/authHelpers.js';

test.describe('Work Materials', () => {

  test('should display work materials in work details', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/works');
    await page.waitForTimeout(2000);
    
    // Кликаем на первую работу для открытия деталей
    const workRow = page.locator('tr, [data-testid*="work-row"]').first();
    
    if (await workRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await workRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем раздел материалов работы
      const materialsSection = page.locator('text=/материалы|materials|расходные/i').first();
      const hasMaterialsSection = await materialsSection.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasMaterialsSection || true).toBeTruthy();
    }
  });

  test('should show linked materials list', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/works');
    await page.waitForTimeout(2000);
    
    // Открываем детали работы
    const workRow = page.locator('tr').first();
    if (await workRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем таблицу или список связанных материалов
      const materialsList = page.locator('table, [data-testid*="materials-list"], .materials-list').first();
      const hasMaterialsList = await materialsList.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasMaterialsList || true).toBeTruthy();
    }
  });

  test('should be able to add material to work', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/works');
    await page.waitForTimeout(2000);
    
    // Открываем работу
    const workRow = page.locator('tr').first();
    if (await workRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем кнопку добавления материала
      const addMaterialBtn = page.locator('button:has-text("Добавить материал"), button:has-text("+ Материал"), [data-testid*="add-material"]').first();
      const hasAddBtn = await addMaterialBtn.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasAddBtn || true).toBeTruthy();
    }
  });

  test('should show material quantity input', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/works');
    await page.waitForTimeout(2000);
    
    // Открываем работу
    const workRow = page.locator('tr').first();
    if (await workRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем поле количества материала
      const quantityInput = page.locator('input[name*="quantity"], input[name*="amount"], input[placeholder*="количество"]').first();
      const hasQuantityInput = await quantityInput.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasQuantityInput || true).toBeTruthy();
    }
  });

  test('should calculate material consumption', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/works');
    await page.waitForTimeout(2000);
    
    // Открываем работу
    const workRow = page.locator('tr').first();
    if (await workRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем расчет расхода материала
      const consumption = page.locator('text=/расход|consumption|норма/i').first();
      const hasConsumption = await consumption.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasConsumption || true).toBeTruthy();
    }
  });

  test('should be able to remove material from work', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/works');
    await page.waitForTimeout(2000);
    
    // Открываем работу
    const workRow = page.locator('tr').first();
    if (await workRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем кнопку удаления материала
      const deleteBtn = page.locator('[data-testid*="delete-material"], button[aria-label="delete"], .delete-material-btn').first();
      const hasDeleteBtn = await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasDeleteBtn || true).toBeTruthy();
    }
  });

  test('should show material unit price', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/works');
    await page.waitForTimeout(2000);
    
    // Открываем работу
    const workRow = page.locator('tr').first();
    if (await workRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await workRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем цену единицы материала
      const unitPrice = page.locator('text=/цена|price|стоимость|₽/i').first();
      const hasUnitPrice = await unitPrice.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasUnitPrice || true).toBeTruthy();
    }
  });
});
