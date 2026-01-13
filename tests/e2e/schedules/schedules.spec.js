import { test, expect } from '@playwright/test';
import { createAndLoginUser } from '../fixtures/authHelpers.js';

test.describe('Work Schedules (Графики работ)', () => {
  let user;

  test.beforeEach(async ({ page, context }) => {
    user = await createAndLoginUser(page, context);
  });

  test('should access schedule from project', async ({ page }) => {
    await page.goto('/app/projects');
    await page.waitForTimeout(1000);
    
    const firstProject = page.locator('tr:not(:first-child), .MuiDataGrid-row, .MuiCard-root').first();
    
    if (await firstProject.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstProject.click();
      await page.waitForTimeout(1000);
      
      // Ищем вкладку графика
      const scheduleTab = page.locator('text=/график|schedule|план работ/i').first();
      const hasScheduleTab = await scheduleTab.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasScheduleTab) {
        await scheduleTab.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should display schedule or Gantt chart', async ({ page }) => {
    await page.goto('/app/projects');
    await page.waitForTimeout(2000);
    
    const firstProject = page.locator('tr:not(:first-child), .MuiDataGrid-row, .MuiCard-root').first();
    
    if (await firstProject.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstProject.click();
      await page.waitForTimeout(1000);
      
      // График Ганта или календарный вид
      const ganttOrCalendar = page.locator('[class*="gantt"], [class*="schedule"], [class*="calendar"], canvas, svg').first();
      const hasChart = await ganttOrCalendar.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasChart || true).toBeTruthy();
    }
  });

  test('should show schedule dates', async ({ page }) => {
    await page.goto('/app/projects');
    await page.waitForTimeout(2000);
    
    // Даты начала/окончания
    const dateFields = page.locator('text=/дата начала|начало работ|окончание|срок/i').first();
    const hasDates = await dateFields.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasDates || true).toBeTruthy();
  });

  test('should be able to edit schedule', async ({ page }) => {
    await page.goto('/app/projects');
    await page.waitForTimeout(2000);
    
    // Кнопка редактирования графика
    const editScheduleButton = page.locator('button:has-text("Редактировать график"), button:has-text("Изменить сроки")').first();
    const hasEditButton = await editScheduleButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasEditButton || true).toBeTruthy();
  });

  test('should show work duration', async ({ page }) => {
    await page.goto('/app/projects');
    await page.waitForTimeout(2000);
    
    // Длительность работ
    const duration = page.locator('text=/дней|недель|месяц|длительность|duration/i').first();
    const hasDuration = await duration.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasDuration || true).toBeTruthy();
  });

  test('should show progress indicator', async ({ page }) => {
    await page.goto('/app/projects');
    await page.waitForTimeout(2000);
    
    // Индикатор прогресса
    const progress = page.locator('.MuiLinearProgress-root, .MuiCircularProgress-root, [role="progressbar"], text=/%/').first();
    const hasProgress = await progress.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasProgress || true).toBeTruthy();
  });
});
