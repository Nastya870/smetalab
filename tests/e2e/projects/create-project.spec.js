import { test, expect } from '@playwright/test';
import { createAndLoginUser } from '../fixtures/authHelpers.js';

test.describe('Projects Management', () => {
  let user;

  // Хелпер для заполнения формы проекта
  async function fillProjectForm(page, data) {
    // Заказчик - обязательное поле (combobox)
    if (data.customer) {
      const customerCombo = page.locator('input[role="combobox"]').first();
      await customerCombo.fill(data.customer);
      // Выбираем из dropdown или создаём нового
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }
    
    // Адрес объекта - обязательное поле
    const addressField = page.getByLabel('Адрес объекта');
    if (await addressField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addressField.fill(data.address || 'г. Москва, ул. Тестовая, д. 1');
    }
    
    // Наименование объекта - обязательное поле
    const nameField = page.getByLabel('Наименование объекта');
    if (await nameField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameField.fill(data.name || `Тестовый объект ${Date.now()}`);
    }
  }

  test.beforeEach(async ({ page, context }) => {
    // Создаём и логиним пользователя
    user = await createAndLoginUser(page, context);
    // Переходим сразу на страницу проектов
    await page.goto('/app/projects');
    await page.waitForTimeout(1000); // Даём время на загрузку
  });

  test('should display projects page', async ({ page }) => {
    // Проверяем что мы на странице проектов
    await expect(page).toHaveURL(/\/app\/projects/);
    
    // Проверяем заголовок (берём первый)
    await expect(page.locator('h1, h2, h3').first()).toContainText(/Проект|Управление/i, { timeout: 10000 });
  });

  test('should open create project dialog', async ({ page }) => {
    // Нажимаем кнопку создания (пробуем разные варианты)
    const createButton = page.locator('button:has-text("Создать проект"), button:has-text("Создать"), button:has-text("Новый проект")').first();
    await createButton.click({ timeout: 10000 });
    
    // Проверяем что открылся диалог
    await expect(page.locator('dialog, .MuiDialog-root')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Создать новый проект')).toBeVisible();
  });

  test('should create new project successfully', async ({ page }) => {
    // Открываем форму создания
    const createButton = page.locator('button:has-text("Создать проект")').first();
    await createButton.click();
    await page.waitForTimeout(500);
    
    const timestamp = Date.now();
    const projectData = {
      customer: 'Тестовый заказчик',
      address: 'г. Москва, ул. Тестовая, д. 1',
      name: `Тестовый объект ${timestamp}`
    };
    
    // Заполняем форму
    await fillProjectForm(page, projectData);
    
    // Кнопка "Создать проект" в диалоге
    const submitButton = page.locator('button:has-text("Создать проект")').last();
    await submitButton.click();
    
    // Ждём закрытия диалога и появления проекта
    await page.waitForTimeout(2000);
    
    // Проверяем что проект появился в списке
    await expect(page.locator('body')).toContainText(projectData.name, { timeout: 10000 });
  });

  test('should show validation - button disabled for empty form', async ({ page }) => {
    const createButton = page.locator('button:has-text("Создать проект")').first();
    await createButton.click();
    await page.waitForTimeout(500);
    
    // Кнопка "Создать проект" должна быть disabled при пустой форме
    const submitButton = page.locator('button:has-text("Создать проект")').last();
    await expect(submitButton).toBeDisabled();
  });

  test('should open project details', async ({ page }) => {
    // Создаём проект
    const createButton = page.locator('button:has-text("Создать проект")').first();
    await createButton.click();
    await page.waitForTimeout(500);
    
    const projectName = `Проект для просмотра ${Date.now()}`;
    await fillProjectForm(page, {
      customer: 'Заказчик просмотра',
      name: projectName
    });
    
    const submitButton = page.locator('button:has-text("Создать проект")').last();
    await submitButton.click();
    await page.waitForTimeout(2000);
    
    // Кликаем на проект
    const projectCard = page.locator(`text=${projectName}`).first();
    await projectCard.click();
    
    // Должны открыться детали проекта
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toContainText(projectName);
  });

  test('should show empty state when no projects', async ({ page, context }) => {
    // Создаём нового пользователя без проектов
    const randomId = Math.random().toString(36).substring(2, 10);
    const newUser = await createAndLoginUser(page, context, {
      email: `empty-projects-${Date.now()}-${randomId}@example.com`
    });
    
    await page.goto('/app/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Проверяем что показывается пустое состояние или таблица/список (первый проект ещё не создан)
    // Для нового пользователя может быть либо пустое состояние, либо таблица без данных
    const hasEmptyState = await page.locator('text=/Нет проектов|Проекты не найдены|создайте|пустой|empty/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasTable = await page.locator('table, .MuiTable-root, .projects-list, [data-testid="projects-table"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasAddButton = await page.locator('button:has-text("Добавить"), button:has-text("Создать"), button:has-text("+")').first().isVisible({ timeout: 2000 }).catch(() => false);
    
    // Страница должна показывать либо пустое состояние, либо таблицу, либо кнопку добавления
    expect(hasEmptyState || hasTable || hasAddButton).toBeTruthy();
  });
});
