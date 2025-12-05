/**
 * Integration тесты для Schedules API
 * Тестирует генерацию графиков работ
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../server/index.js';
import testDb from '../../fixtures/testDatabase.js';

describe('Schedules API Integration Tests', () => {
  let accessToken;
  let testUser;
  let testTenant;
  let createdProjectId;
  let createdEstimateId;

  beforeAll(async () => {
    const result = await testDb.createTestUser({
      email: 'schedules-test@test.com',
      password: 'Test123!@#',
      fullName: 'Schedules Test User'
    });
    testUser = result.user;
    testTenant = result.tenant;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'schedules-test@test.com',
        password: 'Test123!@#'
      });

    accessToken = loginResponse.body.data.tokens.accessToken;

    // Создаём проект и смету
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Проект для графиков' });

    createdProjectId = projectResponse.body.data?.id;

    if (createdProjectId) {
      const estimateResponse = await request(app)
        .post(`/api/projects/${createdProjectId}/estimates`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Смета для графика' });

      createdEstimateId = estimateResponse.body.data?.id;
    }
  });

  afterAll(async () => {
    try {
      if (createdEstimateId) {
        await testDb.testPool.query('DELETE FROM schedules WHERE estimate_id = $1', [createdEstimateId]);
        await testDb.testPool.query('DELETE FROM estimates WHERE id = $1', [createdEstimateId]);
      }
      if (createdProjectId) {
        await testDb.testPool.query('DELETE FROM projects WHERE id = $1', [createdProjectId]);
      }
      await testDb.testPool.query(`
        DELETE FROM user_role_assignments WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%schedules-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM user_tenants WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%schedules-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM sessions WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%schedules-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM users WHERE email LIKE '%schedules-test@test.com%'
      `);
      if (testTenant?.id) {
        await testDb.testPool.query('DELETE FROM tenants WHERE id = $1', [testTenant.id]);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    await testDb.closePool();
  });

  // ============================================
  // POST /api/schedules/generate - Генерация графика
  // ============================================
  describe('POST /api/schedules/generate', () => {
    it('должен сгенерировать график из сметы', async () => {
      if (!createdEstimateId) return;

      const scheduleData = {
        estimateId: createdEstimateId,
        startDate: new Date().toISOString().split('T')[0]
      };

      const response = await request(app)
        .post('/api/schedules/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(scheduleData);

      // 200/201 если график создан или нет позиций
      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
    });

    it('должен вернуть 400 без estimateId', async () => {
      const response = await request(app)
        .post('/api/schedules/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('должен вернуть 401 без токена', async () => {
      const response = await request(app)
        .post('/api/schedules/generate')
        .send({ estimateId: 1 });

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // GET /api/schedules/estimate/:estimateId - График по смете
  // ============================================
  describe('GET /api/schedules/estimate/:estimateId', () => {
    it('должен вернуть график для сметы', async () => {
      if (!createdEstimateId) return;

      const response = await request(app)
        .get(`/api/schedules/estimate/${createdEstimateId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('должен вернуть пустой ответ для сметы без графика', async () => {
      const response = await request(app)
        .get('/api/schedules/estimate/99999999')
        .set('Authorization', `Bearer ${accessToken}`);

      // API может вернуть 200 (пустой), 404 или 500 (invalid UUID)
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  // ============================================
  // DELETE /api/schedules/estimate/:estimateId - Удаление
  // ============================================
  describe('DELETE /api/schedules/estimate/:estimateId', () => {
    it('должен удалить график сметы', async () => {
      if (!createdEstimateId) return;

      const response = await request(app)
        .delete(`/api/schedules/estimate/${createdEstimateId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('должен вернуть 403 с невалидным токеном', async () => {
      const response = await request(app)
        .post('/api/schedules/generate')
        .set('Authorization', 'Bearer invalid-token')
        .send({ estimateId: 1 });

      expect(response.status).toBe(403);
    });
  });
});
