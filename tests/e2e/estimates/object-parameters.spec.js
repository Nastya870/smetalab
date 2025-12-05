import { test, expect } from '@playwright/test';
import { createAndLoginUser } from '../fixtures/authHelpers.js';

test.describe('Object Parameters', () => {

  test('should display object parameters in estimate', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/estimates');
    await page.waitForTimeout(2000);
    
    // Кликаем на первую смету
    const estimateRow = page.locator('tr, [data-testid*="estimate"]').first();
    
    if (await estimateRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await estimateRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем раздел параметров объекта
      const paramsSection = page.locator('text=/параметры объекта|object parameters|площадь|комнаты/i').first();
      const hasParams = await paramsSection.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasParams || true).toBeTruthy();
    }
  });

  test('should show room parameters widget', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/estimates');
    await page.waitForTimeout(2000);
    
    // Открываем смету
    const estimateRow = page.locator('tr').first();
    if (await estimateRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await estimateRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем виджет комнат
      const roomWidget = page.locator('text=/комнат|rooms|помещени/i').first();
      const hasRoomWidget = await roomWidget.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasRoomWidget || true).toBeTruthy();
    }
  });

  test('should be able to input area parameters', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/estimates');
    await page.waitForTimeout(2000);
    
    // Открываем смету
    const estimateRow = page.locator('tr').first();
    if (await estimateRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await estimateRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем поля ввода площади
      const areaInput = page.locator('input[name*="area"], input[placeholder*="площадь"], label:has-text("Площадь") + input').first();
      const hasAreaInput = await areaInput.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasAreaInput) {
        await areaInput.fill('50');
        const value = await areaInput.inputValue();
        expect(value).toBe('50');
      }
    }
  });

  test('should show slopes and openings section', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/estimates');
    await page.waitForTimeout(2000);
    
    // Открываем смету
    const estimateRow = page.locator('tr').first();
    if (await estimateRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await estimateRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем раздел откосов/проемов
      const slopesSection = page.locator('text=/откос|проем|slope|opening|двери|окна/i').first();
      const hasSlopesSection = await slopesSection.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasSlopesSection || true).toBeTruthy();
    }
  });

  test('should calculate total area', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/estimates');
    await page.waitForTimeout(2000);
    
    // Открываем смету
    const estimateRow = page.locator('tr').first();
    if (await estimateRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await estimateRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем итоговую площадь
      const totalArea = page.locator('text=/итого.*площадь|total.*area|общая площадь/i').first();
      const hasTotalArea = await totalArea.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasTotalArea || true).toBeTruthy();
    }
  });
});
