/**
 * Integration тесты для Auth API
 * Тестирует регистрацию, логин, refresh token через реальные HTTP endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../server/index.js';
import testDb from '../../fixtures/testDatabase.js';

// Уникальный домен для Auth тестов чтобы не конфликтовать с другими тестами
const AUTH_TEST_DOMAIN = '@authtest.local';

/**
 * Очищает только пользователей с AUTH_TEST_DOMAIN
 */
async function cleanupAuthTestUsers() {
  try {
    const pattern = `%${AUTH_TEST_DOMAIN}`;
    await testDb.testPool.query(`DELETE FROM user_role_assignments WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`, [pattern]);
    await testDb.testPool.query(`DELETE FROM user_tenants WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`, [pattern]);
    await testDb.testPool.query(`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`, [pattern]);
    await testDb.testPool.query(`DELETE FROM users WHERE email LIKE $1`, [pattern]);
  } catch (error) {
    console.error('Error cleaning up auth test users:', error.message);
  }
}

describe('Auth API Integration Tests', () => {
  // Очищаем только AUTH тестовые данные перед всеми тестами
  beforeAll(async () => {
    await cleanupAuthTestUsers();
  });

  // Очищаем после каждого теста
  beforeEach(async () => {
    await cleanupAuthTestUsers();
  });

  // Закрываем соединения после всех тестов
  afterAll(async () => {
    await cleanupAuthTestUsers();
    await testDb.closePool();
  });

  // ============================================
  // POST /api/auth/register
  // ============================================
  describe('POST /api/auth/register', () => {
    it('должен зарегистрировать нового пользователя с валидными данными', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@authtest.local',
          password: 'Test123!@#',
          fullName: 'New Test User',
          phone: '+7 999 123 4567'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('newuser@authtest.local');
      expect(response.body.data.user.fullName).toBe('New Test User');
    }, 10000); // TODO: stub email provider in tests - Resend API latency 5-7s

    it('должен вернуть 400 для невалидного email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test123!@#',
          fullName: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('должен вернуть 400 для слабого пароля', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@authtest.local',
          password: 'weak',
          fullName: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message.toLowerCase()).toContain('пароль');
    });

    it('должен вернуть 400 для дублирующегося email', async () => {
      // Регистрируем первого пользователя
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@authtest.local',
          password: 'Test123!@#',
          fullName: 'First User'
        });

      // Пытаемся зарегистрировать второго с тем же email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@authtest.local',
          password: 'Test123!@#',
          fullName: 'Second User'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('уже');
    }, 10000); // TODO: stub email provider in tests - Resend API latency 5-7s

    it('должен вернуть 400 если отсутствует обязательное поле', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@authtest.local',
          // password отсутствует
          fullName: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // POST /api/auth/login
  // ============================================
  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      // Создаём тестового пользователя с тенантом перед каждым тестом
      const result = await testDb.createTestUser({
        email: 'login@authtest.local',
        password: 'Test123!@#',
        fullName: 'Login Test User'
      });
      testUser = result.user;
    });

    it('должен вернуть JWT токены для валидных credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@authtest.local',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('login@authtest.local');
      
      // Проверяем формат JWT токена
      expect(response.body.data.tokens.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    });

    it('должен вернуть 401 для неверного пароля', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@authtest.local',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Неверный email или пароль');
    });

    it('должен вернуть 401 для несуществующего пользователя', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@authtest.local',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('должен вернуть 400 для невалидного email формата', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('должен включить permissions и roles в JWT payload', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@authtest.local',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(200);
      
      // Декодируем JWT (без проверки подписи, просто парсим payload)
      const tokenParts = response.body.data.tokens.accessToken.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      
      expect(payload.userId).toBeDefined();
      expect(payload.email).toBe('login@authtest.local');
      expect(payload.permissions).toBeDefined();
      expect(Array.isArray(payload.permissions)).toBe(true);
    });
  });

  // ============================================
  // POST /api/auth/refresh
  // ============================================
  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      // Создаём пользователя с тенантом и логинимся
      await testDb.createTestUser({
        email: 'refresh@authtest.local',
        password: 'Test123!@#'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'refresh@authtest.local',
          password: 'Test123!@#'
        });

      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    it('должен обновить access token по refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    });

    it('должен вернуть 401 для невалидного refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('должен вернуть 400 если refresh token отсутствует', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // POST /api/auth/logout
  // ============================================
  describe('POST /api/auth/logout', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      await testDb.createTestUser({
        email: 'logout@authtest.local',
        password: 'Test123!@#'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logout@authtest.local',
          password: 'Test123!@#'
        });

      accessToken = loginResponse.body.data.tokens.accessToken;
      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    it('должен успешно разлогинить пользователя', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken }); // Отправляем refreshToken в body

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('должен вернуть 401 без токена', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // GET /api/auth/me
  // ============================================
  describe('GET /api/auth/me', () => {
    let accessToken;

    beforeEach(async () => {
      await testDb.createTestUser({
        email: 'me@authtest.local',
        password: 'Test123!@#',
        fullName: 'Me Test User'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'me@authtest.local',
          password: 'Test123!@#'
        });

      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('должен вернуть информацию о текущем пользователе', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('me@authtest.local');
      expect(response.body.data.user.full_name).toBe('Me Test User');
    });

    it('должен вернуть 401 без токена', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('должен вернуть 403 с невалидным токеном', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });
  });
});
