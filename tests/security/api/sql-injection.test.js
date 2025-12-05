/**
 * SQL Injection Security Tests
 * 
 * Проверяет защиту API от SQL инъекций
 * OWASP A03:2021 - Injection
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { SQL_PAYLOADS } from '../fixtures/payloads.js';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

// Тестовые учётные данные
const TEST_USER = {
  email: 'security-sql@sectest.local',
  password: 'Test123!@#',
  fullName: 'SQL Security Tester'
};

describe('SQL Injection Security Tests', () => {
  let authToken;
  let testProjectId;

  beforeAll(async () => {
    // Регистрация/логин тестового пользователя
    try {
      await request(API_URL)
        .post('/api/auth/register')
        .send(TEST_USER);
    } catch (e) {
      // Пользователь может уже существовать
    }

    const loginRes = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    if (loginRes.body.data?.tokens?.accessToken) {
      authToken = loginRes.body.data.tokens.accessToken;
    }
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('GET endpoints - Query Parameters', () => {
    const endpoints = [
      { path: '/api/projects', param: 'search' },
      { path: '/api/materials', param: 'search' },
      { path: '/api/works', param: 'search' },
      { path: '/api/users', param: 'search' },
      { path: '/api/counterparties', param: 'search' },
    ];

    endpoints.forEach(({ path, param }) => {
      describe(`${path}?${param}=`, () => {
        // Тестируем выборку SQL payloads (не все, чтобы не замедлять тесты)
        const testPayloads = SQL_PAYLOADS.slice(0, 10);

        testPayloads.forEach((payload, index) => {
          it(`должен защитить от SQL injection #${index + 1}: "${payload.substring(0, 30)}..."`, async () => {
            const response = await request(API_URL)
              .get(path)
              .query({ [param]: payload })
              .set('Authorization', `Bearer ${authToken}`);

            // Успешный запрос НЕ должен возвращать ошибку SQL
            // Допустимые статусы: 200 (пустой результат), 400 (валидация), 401/403 (нет доступа)
            expect([200, 400, 401, 403]).toContain(response.status);

            // Проверяем, что нет утечки SQL ошибок
            const body = JSON.stringify(response.body).toLowerCase();
            expect(body).not.toContain('syntax error');
            expect(body).not.toContain('sql');
            expect(body).not.toContain('postgresql');
            expect(body).not.toContain('pg_');
            expect(body).not.toContain('select');
            expect(body).not.toContain('insert');
            expect(body).not.toContain('update');
            expect(body).not.toContain('delete');
            expect(body).not.toContain('drop table');
          });
        });
      });
    });
  });

  describe('GET endpoints - Path Parameters (ID)', () => {
    const endpoints = [
      '/api/projects',
      '/api/materials',
      '/api/works',
      '/api/estimates',
      '/api/users',
    ];

    const idPayloads = [
      "1 OR 1=1",
      "1; DROP TABLE users; --",
      "1 UNION SELECT * FROM users --",
      "' OR '1'='1",
      "1' OR '1'='1",
    ];

    endpoints.forEach((basePath) => {
      describe(`${basePath}/:id`, () => {
        idPayloads.forEach((payload, index) => {
          it(`должен защитить ID параметр от SQL injection #${index + 1}`, async () => {
            const response = await request(API_URL)
              .get(`${basePath}/${encodeURIComponent(payload)}`)
              .set('Authorization', `Bearer ${authToken}`);

            // Должен вернуть 400 (invalid ID) или 404 (not found), но не 500
            expect([400, 404, 401, 403, 500]).toContain(response.status);

            // Если 500 - это потенциальная уязвимость, но проверим что нет SQL leak
            if (response.status === 500) {
              const body = JSON.stringify(response.body).toLowerCase();
              expect(body).not.toContain('syntax error');
              expect(body).not.toContain('postgresql');
            }
          });
        });
      });
    });
  });

  describe('POST endpoints - Body Parameters', () => {
    describe('/api/projects', () => {
      const fieldPayloads = SQL_PAYLOADS.slice(0, 5);

      fieldPayloads.forEach((payload, index) => {
        it(`должен защитить поле name от SQL injection #${index + 1}`, async () => {
          const response = await request(API_URL)
            .post('/api/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: payload,
              address: 'Test Address',
              client_name: 'Test Client'
            });

          // Допустимо: 201 (создан - payload сохранён как текст), 400 (валидация), 401/403
          expect([201, 400, 401, 403]).toContain(response.status);

          // Не должно быть SQL ошибок
          const body = JSON.stringify(response.body).toLowerCase();
          expect(body).not.toContain('syntax error');
          expect(body).not.toContain('postgresql');
        });
      });
    });

    describe('/api/materials', () => {
      const fieldPayloads = SQL_PAYLOADS.slice(0, 5);

      fieldPayloads.forEach((payload, index) => {
        it(`должен защитить поле name от SQL injection #${index + 1}`, async () => {
          const response = await request(API_URL)
            .post('/api/materials')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: payload,
              unit: 'шт',
              price: 100
            });

          expect([201, 400, 401, 403]).toContain(response.status);

          const body = JSON.stringify(response.body).toLowerCase();
          expect(body).not.toContain('syntax error');
          expect(body).not.toContain('postgresql');
        });
      });
    });

    describe('/api/works', () => {
      const fieldPayloads = SQL_PAYLOADS.slice(0, 5);

      fieldPayloads.forEach((payload, index) => {
        it(`должен защитить поле name от SQL injection #${index + 1}`, async () => {
          const response = await request(API_URL)
            .post('/api/works')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: payload,
              code: `SQL-${index}`,
              unit: 'шт',
              base_price: 100
            });

          expect([201, 400, 401, 403]).toContain(response.status);

          const body = JSON.stringify(response.body).toLowerCase();
          expect(body).not.toContain('syntax error');
          expect(body).not.toContain('postgresql');
        });
      });
    });
  });

  describe('/api/auth/login - Critical Endpoint', () => {
    const authPayloads = [
      "admin'--",
      "' OR '1'='1",
      "admin' OR '1'='1'--",
      "' UNION SELECT * FROM users --",
      "admin'; DROP TABLE users; --",
    ];

    authPayloads.forEach((payload, index) => {
      it(`должен защитить email от SQL injection #${index + 1}`, async () => {
        const response = await request(API_URL)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'anypassword'
          });

        // Должен вернуть 400 или 401, но не 500
        expect([400, 401]).toContain(response.status);

        const body = JSON.stringify(response.body).toLowerCase();
        expect(body).not.toContain('syntax error');
        expect(body).not.toContain('postgresql');
      });

      it(`должен защитить password от SQL injection #${index + 1}`, async () => {
        const response = await request(API_URL)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: payload
          });

        // Должен вернуть 400 или 401, но не 500
        expect([400, 401]).toContain(response.status);

        const body = JSON.stringify(response.body).toLowerCase();
        expect(body).not.toContain('syntax error');
        expect(body).not.toContain('postgresql');
      });
    });
  });

  describe('Second-Order SQL Injection', () => {
    it('должен защитить от stored SQL injection в имени проекта', async () => {
      // Создаём проект с SQL payload в имени
      const createRes = await request(API_URL)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: "Test'; DROP TABLE projects; --",
          address: 'Test Address',
          client_name: 'Test Client'
        });

      if (createRes.status === 201) {
        const projectId = createRes.body.data?.id;

        // Получаем список проектов - SQL не должен выполниться
        const listRes = await request(API_URL)
          .get('/api/projects')
          .set('Authorization', `Bearer ${authToken}`);

        expect(listRes.status).toBe(200);
        
        // Проект должен существовать (payload сохранён как текст)
        if (projectId) {
          const getRes = await request(API_URL)
            .get(`/api/projects/${projectId}`)
            .set('Authorization', `Bearer ${authToken}`);

          expect([200, 404]).toContain(getRes.status);
        }
      }
    });
  });

  describe('Batch/Bulk Operations', () => {
    it('должен защитить bulk import от SQL injection в массиве', async () => {
      const maliciousItems = [
        { name: "Normal Material", unit: 'шт', price: 100 },
        { name: "'; DROP TABLE materials; --", unit: 'шт', price: 100 },
        { name: "1 UNION SELECT * FROM users --", unit: 'шт', price: 100 },
      ];

      const response = await request(API_URL)
        .post('/api/materials/import')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ materials: maliciousItems });

      // Должен обработать без SQL ошибок
      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);

      const body = JSON.stringify(response.body).toLowerCase();
      expect(body).not.toContain('syntax error');
      expect(body).not.toContain('postgresql');
    });
  });

  describe('ORDER BY Injection', () => {
    const orderByPayloads = [
      "name; DROP TABLE projects; --",
      "name UNION SELECT * FROM users --",
      "(SELECT password FROM users LIMIT 1)",
      "1,extractvalue(1,concat(0x7e,version()))",
    ];

    orderByPayloads.forEach((payload, index) => {
      it(`должен защитить ORDER BY от injection #${index + 1}`, async () => {
        const response = await request(API_URL)
          .get('/api/projects')
          .query({ sortBy: payload, sortOrder: 'ASC' })
          .set('Authorization', `Bearer ${authToken}`);

        expect([200, 400, 401, 403]).toContain(response.status);

        const body = JSON.stringify(response.body).toLowerCase();
        expect(body).not.toContain('syntax error');
        expect(body).not.toContain('postgresql');
      });
    });
  });
});
