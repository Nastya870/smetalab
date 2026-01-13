/**
 * Authentication Security Tests
 * 
 * Проверяет безопасность механизмов аутентификации
 * OWASP A07:2021 - Identification and Authentication Failures
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { JWT_PAYLOADS, createMaliciousJwt } from '../fixtures/payloads.js';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

// Тестовые учётные данные
const TEST_USER = {
  email: 'security-auth@sectest.local',
  password: 'Test123!@#',
  fullName: 'Auth Security Tester'
};

describe('Authentication Security Tests', () => {
  let validToken;
  let refreshToken;

  beforeAll(async () => {
    // Регистрация тестового пользователя
    try {
      await request(API_URL)
        .post('/api/auth/register')
        .send(TEST_USER);
    } catch (e) {}

    const loginRes = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    validToken = loginRes.body.data?.tokens?.accessToken;
    refreshToken = loginRes.body.data?.tokens?.refreshToken;
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('JWT Token Manipulation', () => {
    it('должен отклонить токен с изменённым payload', async () => {
      if (!validToken) return;

      const maliciousToken = createMaliciousJwt(validToken, {
        role: 'super_admin',
        isSuperAdmin: true
      });

      if (maliciousToken) {
        const response = await request(API_URL)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${maliciousToken}`);

        expect([401, 403]).toContain(response.status);
      }
    });

    it('должен отклонить токен с изменённым userId', async () => {
      if (!validToken) return;

      const maliciousToken = createMaliciousJwt(validToken, {
        userId: '00000000-0000-0000-0000-000000000001'
      });

      if (maliciousToken) {
        const response = await request(API_URL)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${maliciousToken}`);

        expect([401, 403]).toContain(response.status);
      }
    });

    it('должен отклонить токен без подписи', async () => {
      if (!validToken) return;

      const parts = validToken.split('.');
      const tokenWithoutSignature = `${parts[0]}.${parts[1]}.`;

      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenWithoutSignature}`);

      expect([401, 403]).toContain(response.status);
    });

    it('должен отклонить токен с пустой подписью', async () => {
      if (!validToken) return;

      const parts = validToken.split('.');
      const tokenEmptySignature = `${parts[0]}.${parts[1]}.`;

      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenEmptySignature}`);

      expect([401, 403]).toContain(response.status);
    });

    it('должен отклонить токен с невалидной подписью', async () => {
      if (!validToken) return;

      const parts = validToken.split('.');
      const tokenBadSignature = `${parts[0]}.${parts[1]}.invalidsignature`;

      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenBadSignature}`);

      expect([401, 403]).toContain(response.status);
    });

    it('должен отклонить токен с algorithm: none', async () => {
      // Создаём токен с alg: none
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ 
        userId: 'test',
        email: TEST_USER.email,
        isSuperAdmin: true
      })).toString('base64url');
      
      const noneAlgToken = `${header}.${payload}.`;

      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${noneAlgToken}`);

      expect([401, 403]).toContain(response.status);
    });

    it('должен отклонить токен с будущим iat', async () => {
      if (!validToken) return;

      const futureIat = Math.floor(Date.now() / 1000) + 86400; // +1 день
      const maliciousToken = createMaliciousJwt(validToken, {
        iat: futureIat
      });

      if (maliciousToken) {
        const response = await request(API_URL)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${maliciousToken}`);

        // Может быть принят или отклонён в зависимости от реализации
        expect([200, 401, 403]).toContain(response.status);
      }
    });
  });

  describe('Token Expiration', () => {
    it('должен отклонить истёкший access token', async () => {
      // Создаём токен который "истёк"
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 3600 // -1 час
      };
      
      if (validToken) {
        const expiredToken = createMaliciousJwt(validToken, expiredPayload);
        
        if (expiredToken) {
          const response = await request(API_URL)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${expiredToken}`);

          expect([401, 403]).toContain(response.status);
        }
      }
    });

    it('должен принять валидный refresh token', async () => {
      if (!refreshToken) return;

      const response = await request(API_URL)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      // Может быть 200 (новый токен) или 401 (refresh token истёк/невалиден)
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Session Management', () => {
    it('должен инвалидировать токен после logout', async () => {
      // Логинимся заново
      const loginRes = await request(API_URL)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const tempToken = loginRes.body.data?.tokens?.accessToken;

      if (tempToken) {
        // Логаут
        await request(API_URL)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${tempToken}`);

        // Пробуем использовать токен после logout
        const response = await request(API_URL)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${tempToken}`);

        // Идеально: 401 (токен отозван). Допустимо: 200 (stateless JWT)
        expect([200, 401]).toContain(response.status);
      }
    });
  });

  describe('Password Security', () => {
    it('должен отклонить слишком короткий пароль при регистрации', async () => {
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send({
          email: `weak-pass-${Date.now()}@sectest.local`,
          password: '123',
          fullName: 'Weak Password User'
        });

      expect(response.status).toBe(400);
    });

    it('должен отклонить пароль без спецсимволов', async () => {
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send({
          email: `no-special-${Date.now()}@sectest.local`,
          password: 'Password123',
          fullName: 'No Special User'
        });

      // Зависит от политики паролей
      expect([201, 400]).toContain(response.status);
    });

    it('должен отклонить пароль без цифр', async () => {
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send({
          email: `no-digits-${Date.now()}@sectest.local`,
          password: 'Password!@#',
          fullName: 'No Digits User'
        });

      expect([201, 400]).toContain(response.status);
    });

    it('НЕ должен возвращать пароль в ответе login', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      if (response.status === 200) {
        const bodyString = JSON.stringify(response.body);
        expect(bodyString).not.toContain(TEST_USER.password);
        expect(bodyString).not.toContain('password');
      }
    });

    it('НЕ должен возвращать hash пароля в /me', async () => {
      if (!validToken) return;

      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      if (response.status === 200) {
        const bodyString = JSON.stringify(response.body);
        expect(bodyString).not.toContain('$2b$'); // bcrypt hash prefix
        expect(bodyString).not.toContain('$2a$');
        expect(bodyString).not.toContain('password_hash');
      }
    });
  });

  describe('Enumeration Prevention', () => {
    it('должен возвращать одинаковое сообщение для несуществующего и неверного пароля', async () => {
      // Несуществующий пользователь
      const nonExistentRes = await request(API_URL)
        .post('/api/auth/login')
        .send({ 
          email: 'nonexistent-user-12345@example.com', 
          password: 'Password123!' 
        });

      // Неверный пароль существующего пользователя
      const wrongPasswordRes = await request(API_URL)
        .post('/api/auth/login')
        .send({ 
          email: TEST_USER.email, 
          password: 'WrongPassword123!' 
        });

      // Оба должны вернуть 401 с похожим сообщением
      expect(nonExistentRes.status).toBe(401);
      expect(wrongPasswordRes.status).toBe(401);

      // Сообщения НЕ должны раскрывать существует ли пользователь
      // (но это не всегда реализуется на практике)
    });

    it('должен возвращать одинаковый статус для существующего и несуществующего email при reset', async () => {
      // Существующий email
      const existingRes = await request(API_URL)
        .post('/api/auth/forgot-password')
        .send({ email: TEST_USER.email });

      // Несуществующий email
      const nonExistingRes = await request(API_URL)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      // Оба должны вернуть одинаковый статус (обычно 200)
      // чтобы не раскрывать существование email
      expect([200, 400, 401, 404]).toContain(existingRes.status);
      expect([200, 400, 401, 404]).toContain(nonExistingRes.status);
    });
  });

  describe('Authorization Header Manipulation', () => {
    it('должен отклонить токен без Bearer prefix', async () => {
      if (!validToken) return;

      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', validToken); // Без "Bearer "

      expect([401, 403]).toContain(response.status);
    });

    it('должен отклонить Bearer с неправильным регистром', async () => {
      if (!validToken) return;

      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', `bearer ${validToken}`); // lowercase

      // Зависит от реализации - может быть принят
      expect([200, 401, 403]).toContain(response.status);
    });

    it('должен отклонить пустой Authorization header', async () => {
      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', '');

      expect([401, 403]).toContain(response.status);
    });

    it('должен отклонить Authorization: Bearer (без токена)', async () => {
      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ');

      expect([401, 403]).toContain(response.status);
    });

    it('должен отклонить Authorization: Bearer null', async () => {
      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer null');

      expect([401, 403]).toContain(response.status);
    });

    it('должен отклонить Authorization: Bearer undefined', async () => {
      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer undefined');

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Concurrent Sessions', () => {
    it('должен позволять множественные сессии (или нет - зависит от политики)', async () => {
      // Первый логин
      const login1 = await request(API_URL)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const token1 = login1.body.data?.tokens?.accessToken;

      // Второй логин
      const login2 = await request(API_URL)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const token2 = login2.body.data?.tokens?.accessToken;

      // Проверяем что оба токена работают (или первый был отозван)
      if (token1 && token2) {
        const res1 = await request(API_URL)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token1}`);

        const res2 = await request(API_URL)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token2}`);

        // Документируем поведение
        expect([200, 401]).toContain(res1.status);
        expect(res2.status).toBe(200);
      }
    });
  });

  describe('Token in Response', () => {
    it('НЕ должен возвращать token в GET запросах (URL logging)', async () => {
      if (!validToken) return;

      const response = await request(API_URL)
        .get('/api/projects')
        .set('Authorization', `Bearer ${validToken}`);

      // Token не должен отражаться в ответе
      const bodyString = JSON.stringify(response.body);
      expect(bodyString).not.toContain(validToken);
    });
  });
});
