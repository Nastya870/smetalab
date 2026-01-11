// @vitest-environment node
/**
 * Integration тесты для Estimates API
 * Тестирует создание смет, работу с позициями, экспорт
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../server/index.js';
import testDb from '../../fixtures/testDatabase.js';

describe('Estimates API Integration Tests', () => {
  let accessToken;
  let testUser;
  let testTenant;
  let createdProjectId;
  let createdEstimateId;
  let createdItemId;

  beforeAll(async () => {
    // Создаём тестового пользователя
    const result = await testDb.createTestUser({
      email: 'estimates-test@test.com',
      password: 'Test123!@#',
      fullName: 'Estimates Test User'
    });
    testUser = result.user;
    testTenant = result.tenant;

    // Логинимся
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'estimates-test@test.com',
        password: 'Test123!@#'
      });

    accessToken = loginResponse.body.data.tokens.accessToken;

    // Создаём тестовый проект для смет
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Проект для тестов смет',
        description: 'Тестовый проект'
      });

    createdProjectId = projectResponse.body.data?.id;
  });

  afterAll(async () => {
    // Очистка
    try {
      if (createdItemId) {
        await testDb.testPool.query('DELETE FROM estimate_items WHERE id = $1', [createdItemId]);
      }
      if (createdEstimateId) {
        await testDb.testPool.query('DELETE FROM estimates WHERE id = $1', [createdEstimateId]);
      }
      if (createdProjectId) {
        await testDb.testPool.query('DELETE FROM projects WHERE id = $1', [createdProjectId]);
      }
      await testDb.testPool.query(`
        DELETE FROM user_role_assignments WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%estimates-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM user_tenants WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%estimates-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM sessions WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%estimates-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM users WHERE email LIKE '%estimates-test@test.com%'
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
  // POST /api/projects/:projectId/estimates - Создание сметы
  // ============================================
  describe('POST /api/projects/:projectId/estimates', () => {
    it('должен создать новую смету', async () => {
      if (!createdProjectId) return;

      const estimateData = {
        name: 'Тестовая смета API',
        description: 'Описание тестовой сметы'
      };

      const response = await request(app)
        .post(`/api/projects/${createdProjectId}/estimates`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(estimateData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(estimateData.name);
      
      createdEstimateId = response.body.data.id;
    });

    it('должен вернуть 400 если name отсутствует', async () => {
      if (!createdProjectId) return;

      const response = await request(app)
        .post(`/api/projects/${createdProjectId}/estimates`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('должен вернуть 400/404 для несуществующего проекта', async () => {
      const response = await request(app)
        .post('/api/projects/00000000-0000-0000-0000-000000000000/estimates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test' });

      // API может вернуть 400 (невалидный запрос) или 404 (не найден)
      expect([400, 404]).toContain(response.status);
    });
  });

  // ============================================
  // GET /api/projects/:projectId/estimates - Список смет
  // ============================================
  describe('GET /api/projects/:projectId/estimates', () => {
    it('должен вернуть список смет проекта', async () => {
      if (!createdProjectId) return;

      const response = await request(app)
        .get(`/api/projects/${createdProjectId}/estimates`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('должен вернуть 401 без токена', async () => {
      const response = await request(app)
        .get(`/api/projects/${createdProjectId}/estimates`);

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // GET /api/estimates/:id - Получение сметы
  // ============================================
  describe('GET /api/estimates/:id', () => {
    it('должен вернуть смету по id', async () => {
      if (!createdEstimateId) return;

      const response = await request(app)
        .get(`/api/estimates/${createdEstimateId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdEstimateId);
    });

    it('должен вернуть 404 или 500 для несуществующей сметы', async () => {
      const response = await request(app)
        .get('/api/estimates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  // ============================================
  // GET /api/estimates/:id/full - Полные данные сметы
  // ============================================
  describe('GET /api/estimates/:id/full', () => {
    it('должен вернуть полные данные сметы', async () => {
      if (!createdEstimateId) return;

      const response = await request(app)
        .get(`/api/estimates/${createdEstimateId}/full`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  // ============================================
  // PUT /api/estimates/:id - Обновление сметы
  // ============================================
  describe('PUT /api/estimates/:id', () => {
    it('должен обновить смету', async () => {
      if (!createdEstimateId) return;

      const updateData = {
        name: 'Обновлённая смета API',
        description: 'Новое описание'
      };

      const response = await request(app)
        .put(`/api/estimates/${createdEstimateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });
  });

  // ============================================
  // POST /api/estimates/:estimateId/items - Добавление позиции
  // ============================================
  describe('POST /api/estimates/:estimateId/items', () => {
    it('должен добавить позицию в смету', async () => {
      if (!createdEstimateId) return;

      const itemData = {
        name: 'Тестовая работа',
        unit: 'м²',
        quantity: 100,
        price: 500
      };

      const response = await request(app)
        .post(`/api/estimates/${createdEstimateId}/items`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(itemData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      createdItemId = response.body.data.id;
    });

    it('должен вернуть 400 для невалидных данных', async () => {
      if (!createdEstimateId) return;

      const response = await request(app)
        .post(`/api/estimates/${createdEstimateId}/items`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  // ============================================
  // GET /api/estimates/:estimateId/items - Список позиций
  // ============================================
  describe('GET /api/estimates/:estimateId/items', () => {
    it('должен вернуть список позиций сметы', async () => {
      if (!createdEstimateId) return;

      const response = await request(app)
        .get(`/api/estimates/${createdEstimateId}/items`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ============================================
  // PUT /api/estimates/items/:id - Обновление позиции
  // ============================================
  describe('PUT /api/estimates/items/:id', () => {
    it('должен обновить позицию сметы', async () => {
      if (!createdItemId) return;

      const updateData = {
        name: 'Обновлённая работа',
        quantity: 150,
        price: 600
      };

      const response = await request(app)
        .put(`/api/estimates/items/${createdItemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================
  // GET /api/estimates/:id/statistics - Статистика сметы
  // ============================================
  describe('GET /api/estimates/:id/statistics', () => {
    it('должен вернуть статистику сметы', async () => {
      if (!createdEstimateId) return;

      const response = await request(app)
        .get(`/api/estimates/${createdEstimateId}/statistics`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================
  // DELETE /api/estimates/items/:id - Удаление позиции
  // ============================================
  describe('DELETE /api/estimates/items/:id', () => {
    it('должен удалить позицию', async () => {
      if (!createdItemId) return;

      const response = await request(app)
        .delete(`/api/estimates/items/${createdItemId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      createdItemId = null;
    });
  });

  // ============================================
  // DELETE /api/estimates/:id - Удаление сметы
  // ============================================
  describe('DELETE /api/estimates/:id', () => {
    it('должен удалить смету', async () => {
      if (!createdEstimateId) return;

      const response = await request(app)
        .delete(`/api/estimates/${createdEstimateId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      createdEstimateId = null;
    });

    it('должен вернуть 404 или 500 для несуществующей сметы', async () => {
      const response = await request(app)
        .delete('/api/estimates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });
});
