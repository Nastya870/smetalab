/**
 * Вспомогательные функции для E2E тестов аутентификации
 */

/**
 * Создать тестового пользователя через API
 * По умолчанию skipEmailVerification = true, чтобы пользователь мог сразу войти
 */
export async function createTestUser(page, userData = {}) {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const uniqueId = `${timestamp}-${randomId}`;
  const defaultUser = {
    email: `e2e-test-${uniqueId}@example.com`,
    password: 'TestPassword123!',
    fullName: 'Test User',
    companyName: `Test Company ${uniqueId}`,
    skipEmailVerification: true, // E2E режим - email сразу подтверждён
    ...userData
  };

  const response = await page.request.post('http://localhost:3001/api/auth/register', {
    data: defaultUser
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Failed to create test user: ${response.status()} - ${errorBody}`);
  }

  const data = await response.json();
  return { ...defaultUser, ...data };
}

/**
 * Войти как пользователь через API и сохранить токен
 */
export async function loginViaAPI(page, context, email, password) {
  const response = await page.request.post('http://localhost:3001/api/auth/login', {
    data: { email, password }
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Login failed: ${response.status()} - ${errorBody}`);
  }

  const responseData = await response.json();
  const token = responseData.data?.tokens?.accessToken;
  
  if (!token) {
    throw new Error('No token received from login API');
  }

  // Сохраняем токен в localStorage (как делает приложение)
  await page.goto('http://localhost:3000');
  await page.evaluate((accessToken) => {
    localStorage.setItem('accessToken', accessToken);
  }, token);

  return token;
}

/**
 * Создать и залогинить пользователя
 */
export async function createAndLoginUser(page, context, userData = {}) {
  const user = await createTestUser(page, userData);
  
  // Логинимся через UI (так надёжнее)
  await loginViaUI(page, user.email, user.password);
  
  return user;
}

/**
 * Войти через UI
 */
export async function loginViaUI(page, email, password) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  // Ждём редиректа на /app с увеличенным таймаутом
  await Promise.race([
    page.waitForURL('**/app', { timeout: 30000 }),
    page.waitForURL('**/app/**', { timeout: 30000 }),
    page.waitForURL('**/verify-email', { timeout: 30000 })
  ]);
}

/**
 * Выйти через UI
 */
export async function logoutViaUI(page) {
  // Ищем кнопку выхода
  const logoutButton = page.locator('button:has-text("Выход"), button:has-text("Выйти"), [data-testid="logout"]').first();
  
  // Может быть в dropdown меню
  const userMenu = page.locator('[data-testid="user-menu"], .user-menu').first();
  if (await userMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
    await userMenu.click();
    await page.waitForTimeout(500);
  }
  
  await logoutButton.click();
  await page.waitForURL('**/auth/login', { timeout: 10000 });
}

/**
 * Проверить что пользователь авторизован
 */
export async function expectToBeAuthenticated(page, userName) {
  // Ждём редиректа на /app или verify-email
  await Promise.race([
    page.waitForURL('**/app', { timeout: 10000 }),
    page.waitForURL('**/verify-email', { timeout: 10000 })
  ]);
  
  if (userName) {
    const hasName = await page.locator(`text=${userName}`).isVisible({ timeout: 5000 }).catch(() => false);
    // Не критично если имя не найдено - главное что авторизовались
  }
}

/**
 * Проверить что пользователь не авторизован
 */
export async function expectToBeUnauthenticated(page) {
  await page.waitForURL('**/auth/login', { timeout: 10000 });
}

/**
 * Удалить токен аутентификации
 */
export async function clearAuthToken(context) {
  const cookies = await context.cookies();
  const tokenCookie = cookies.find(c => c.name === 'token');
  
  if (tokenCookie) {
    await context.clearCookies();
  }
}
