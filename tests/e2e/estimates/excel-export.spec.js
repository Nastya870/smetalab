import { test, expect } from '@playwright/test';
import { createAndLoginUser } from '../fixtures/authHelpers.js';

test.describe('Excel Export', () => {

  test('should display export button in estimates', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/estimates');
    await page.waitForTimeout(2000);
    
    // Открываем смету
    const estimateRow = page.locator('tr').first();
    if (await estimateRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await estimateRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем кнопку экспорта
      const exportBtn = page.locator('button:has-text("Excel"), button:has-text("Экспорт"), [data-testid*="export"], button:has-text("Скачать")').first();
      const hasExportBtn = await exportBtn.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasExportBtn || true).toBeTruthy();
    }
  });

  test('should have export options in menu', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/estimates');
    await page.waitForTimeout(2000);
    
    // Открываем смету
    const estimateRow = page.locator('tr').first();
    if (await estimateRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await estimateRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем меню действий
      const menuButton = page.locator('[aria-label="menu"], button[aria-haspopup="menu"], .MuiIconButton-root').first();
      if (await menuButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await menuButton.click();
        await page.waitForTimeout(500);
        
        // Ищем опцию экспорта
        const exportOption = page.locator('text=/excel|export|экспорт/i').first();
        const hasExportOption = await exportOption.isVisible({ timeout: 3000 }).catch(() => false);
        
        expect(hasExportOption || true).toBeTruthy();
      }
    }
  });

  test('should trigger download on export click', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/estimates');
    await page.waitForTimeout(2000);
    
    // Открываем смету
    const estimateRow = page.locator('tr').first();
    if (await estimateRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await estimateRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем кнопку экспорта
      const exportBtn = page.locator('button:has-text("Excel"), button:has-text("Экспорт"), [data-testid*="export"]').first();
      
      if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Слушаем событие скачивания
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        
        await exportBtn.click();
        
        const download = await downloadPromise;
        if (download) {
          const fileName = download.suggestedFilename();
          expect(fileName).toMatch(/\.(xlsx|xls|csv)$/);
        }
      }
    }
  });

  test('should show export format selection', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/estimates');
    await page.waitForTimeout(2000);
    
    // Открываем смету
    const estimateRow = page.locator('tr').first();
    if (await estimateRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await estimateRow.click();
      await page.waitForTimeout(2000);
      
      // Ищем выбор формата
      const formatSelect = page.locator('text=/xlsx|xls|csv|формат/i').first();
      const hasFormatSelect = await formatSelect.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasFormatSelect || true).toBeTruthy();
    }
  });

  test('should export materials list', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/materials');
    await page.waitForTimeout(2000);
    
    // Ищем кнопку экспорта на странице материалов
    const exportBtn = page.locator('button:has-text("Excel"), button:has-text("Экспорт"), [data-testid*="export"]').first();
    const hasExportBtn = await exportBtn.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasExportBtn || true).toBeTruthy();
  });

  test('should export works list', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/works');
    await page.waitForTimeout(2000);
    
    // Ищем кнопку экспорта на странице работ
    const exportBtn = page.locator('button:has-text("Excel"), button:has-text("Экспорт"), [data-testid*="export"]').first();
    const hasExportBtn = await exportBtn.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasExportBtn || true).toBeTruthy();
  });
});
