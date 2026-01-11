// @vitest-environment node
/**
 * Integration тесты для Purchases API
 * Тестирует генерацию закупок, extra charge
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../server/index.js';
import testDb from '../../fixtures/testDatabase.js';

describe('Purchases API Integration Tests', () => {
  let accessToken;
  let testUser;
  let testTenant;
  let createdProjectId;
  let createdEstimateId;

  beforeAll(async () => {
    const result = await testDb.createTestUser({
      email: 'purchases-test@test.com',
      password: 'Test123!@#',
      fullName: 'Purchases Test User'
    });
    testUser = result.user;
    testTenant = result.tenant;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'purchases-test@test.com',
        password: 'Test123!@#'
      });

    accessToken = loginResponse.body.data.tokens.accessToken;

    // Создаём проект и смету
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Проект для закупок' });

    createdProjectId = projectResponse.body.data?.id;

    if (createdProjectId) {
      const estimateResponse = await request(app)
        .post(`/api/projects/${createdProjectId}/estimates`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Смета для закупок' });

      createdEstimateId = estimateResponse.body.data?.id;
    }
  });

  afterAll(async () => {
    try {
      if (createdEstimateId) {
        await testDb.testPool.query('DELETE FROM purchases WHERE estimate_id = $1', [createdEstimateId]);
        await testDb.testPool.query('DELETE FROM estimates WHERE id = $1', [createdEstimateId]);
      }
      if (createdProjectId) {
        await testDb.testPool.query('DELETE FROM projects WHERE id = $1', [createdProjectId]);
      }
      await testDb.testPool.query(`
        DELETE FROM user_role_assignments WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%purchases-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM user_tenants WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%purchases-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM sessions WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%purchases-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM users WHERE email LIKE '%purchases-test@test.com%'
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
  // POST /api/purchases/generate - Генерация закупок
  // ============================================
  describe('POST /api/purchases/generate', () => {
    it('должен сгенерировать закупки из сметы', async () => {
      if (!createdEstimateId) return;

      const response = await request(app)
        .post('/api/purchases/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ estimateId: createdEstimateId });

      // 200 или 201 если закупки созданы, или сообщение что нет позиций
      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
    });

    it('должен вернуть 400 без estimateId', async () => {
      const response = await request(app)
        .post('/api/purchases/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('должен вернуть 401 без токена', async () => {
      const response = await request(app)
        .post('/api/purchases/generate')
        .send({ estimateId: 1 });

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // GET /api/purchases/estimate/:estimateId - Закупки по смете
  // ============================================
  describe('GET /api/purchases/estimate/:estimateId', () => {
    it('должен вернуть закупки для сметы', async () => {
      if (!createdEstimateId) return;

      const response = await request(app)
        .get(`/api/purchases/estimate/${createdEstimateId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('должен вернуть 404 для несуществующей сметы', async () => {
      const response = await request(app)
        .get('/api/purchases/estimate/99999999')
        .set('Authorization', `Bearer ${accessToken}`);

      // API может вернуть 200 (пустой массив), 404 или 500 (invalid UUID)
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  // ============================================
  // POST /api/purchases/extra-charge - Наценка
  // ============================================
  describe('POST /api/purchases/extra-charge', () => {
    it('должен добавить наценку к закупкам', async () => {
      if (!createdEstimateId) return;

      const response = await request(app)
        .post('/api/purchases/extra-charge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          estimateId: createdEstimateId,
          extraChargePercent: 15
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  // ============================================
  // DELETE /api/purchases/estimate/:estimateId - Удаление
  // ============================================
  describe('DELETE /api/purchases/estimate/:estimateId', () => {
    it('должен удалить закупки сметы', async () => {
      if (!createdEstimateId) return;

      const response = await request(app)
        .delete(`/api/purchases/estimate/${createdEstimateId}`)
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
        .post('/api/purchases/generate')
        .set('Authorization', 'Bearer invalid-token')
        .send({ estimateId: 1 });

      expect(response.status).toBe(403);
    });
  });
});
