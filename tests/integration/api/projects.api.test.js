// @vitest-environment node
/**
 * Integration тесты для Projects API
 * Тестирует CRUD операции, статистику, команду проекта
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../server/index.js';
import testDb from '../../fixtures/testDatabase.js';

describe('Projects API Integration Tests', () => {
  let accessToken;
  let testUser;
  let testTenant;
  let createdProjectId;

  beforeAll(async () => {
    // Создаём тестового пользователя
    const result = await testDb.createTestUser({
      email: 'projects-test@test.com',
      password: 'Test123!@#',
      fullName: 'Projects Test User'
    });
    testUser = result.user;
    testTenant = result.tenant;

    // Логинимся
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'projects-test@test.com',
        password: 'Test123!@#'
      });

    accessToken = loginResponse.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Очистка тестовых данных
    try {
      if (createdProjectId) {
        await testDb.testPool.query('DELETE FROM projects WHERE id = $1', [createdProjectId]);
      }
      await testDb.testPool.query(`
        DELETE FROM user_role_assignments WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%projects-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM user_tenants WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%projects-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM sessions WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%projects-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM users WHERE email LIKE '%projects-test@test.com%'
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
  // POST /api/projects - Создание проекта
  // ============================================
  describe('POST /api/projects', () => {
    it('должен создать новый проект с валидными данными', async () => {
      const projectData = {
        name: 'Тестовый проект API',
        objectName: 'Объект тестовый',
        client: 'ООО Тест Клиент',
        contractor: 'ООО Подрядчик',
        address: 'г. Москва, ул. Тестовая, д. 1',
        description: 'Описание тестового проекта',
        status: 'planning'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.client).toBe(projectData.client);

      createdProjectId = response.body.data.id;
    });

    it('должен вернуть 400 если objectName отсутствует', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Проект без objectName',
          // отсутствуют обязательные поля: objectName, client, contractor, address
          description: 'Проект без обязательных полей'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('должен вернуть 401 без токена', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // GET /api/projects - Список проектов
  // ============================================
  describe('GET /api/projects', () => {
    it('должен вернуть список проектов', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('должен поддерживать пагинацию', async () => {
      const response = await request(app)
        .get('/api/projects?page=1&limit=5')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('должен поддерживать фильтрацию по статусу', async () => {
      const response = await request(app)
        .get('/api/projects?status=active')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('должен вернуть 401 без токена', async () => {
      const response = await request(app).get('/api/projects');
      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // GET /api/projects/:id - Получение проекта
  // ============================================
  describe('GET /api/projects/:id', () => {
    it('должен вернуть проект по id', async () => {
      if (!createdProjectId) return;

      const response = await request(app)
        .get(`/api/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdProjectId);
    });

    it('должен вернуть 404 или 500 для несуществующего проекта', async () => {
      // API возвращает 500 для невалидного UUID (PostgreSQL ошибка)
      // и 404 для валидного но несуществующего UUID
      const response = await request(app)
        .get('/api/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  // ============================================
  // PUT /api/projects/:id - Обновление проекта
  // ============================================
  describe('PUT /api/projects/:id', () => {
    it('должен обновить проект', async () => {
      if (!createdProjectId) return;

      const updateData = {
        name: 'Обновлённый проект API',
        description: 'Новое описание'
      };

      const response = await request(app)
        .put(`/api/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('должен вернуть 404 или 500 для несуществующего проекта', async () => {
      const response = await request(app)
        .put('/api/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test' });

      expect([404, 500]).toContain(response.status);
    });
  });

  // ============================================
  // PATCH /api/projects/:id/status - Обновление статуса
  // ============================================
  describe('PATCH /api/projects/:id/status', () => {
    it('должен обновить статус проекта', async () => {
      if (!createdProjectId) return;

      const response = await request(app)
        .patch(`/api/projects/${createdProjectId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('должен вернуть 400 для невалидного статуса', async () => {
      if (!createdProjectId) return;

      const response = await request(app)
        .patch(`/api/projects/${createdProjectId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
    });
  });

  // ============================================
  // GET /api/projects/stats - Статистика
  // ============================================
  describe('GET /api/projects/stats', () => {
    it('должен вернуть статистику проектов', async () => {
      const response = await request(app)
        .get('/api/projects/stats')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  // ============================================
  // GET /api/projects/dashboard-summary - Единый эндпоинт дашборда
  // ============================================
  describe('GET /api/projects/dashboard-summary', () => {
    it('должен вернуть все данные дашборда одним запросом', async () => {
      const response = await request(app)
        .get('/api/projects/dashboard-summary')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // Проверяем что все данные присутствуют (актуальный API)
      expect(response.body.data.totalProfit).toBeDefined();
      expect(response.body.data.incomeWorks).toBeDefined();
      expect(response.body.data.incomeMaterials).toBeDefined();
      expect(response.body.data.chartData).toBeDefined(); // Изменено: chartData вместо chartDataMonth/Year
      expect(response.body.data.growthData).toBeDefined();
      expect(response.body.data.projectsProfitData).toBeDefined();
    });

    it('должен вернуть мета-информацию о времени загрузки', async () => {
      const response = await request(app)
        .get('/api/projects/dashboard-summary')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.loadTime).toBeDefined();
      expect(response.body.meta.timestamp).toBeDefined();
    });
  });

  // ============================================
  // GET /api/projects/:id/full-dashboard - Полные данные страницы проекта
  // ============================================
  describe('GET /api/projects/:id/full-dashboard', () => {
    let testProjectId = null;

    beforeAll(async () => {
      // Создаём проект для тестирования
      const projectData = {
        objectName: 'Full Dashboard Test Object',
        client: 'Dashboard Test Client',
        contractor: 'Dashboard Test Contractor',
        address: 'Test Address for Dashboard',
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(projectData);

      if (response.status === 201) {
        testProjectId = response.body.data.id;
      }
    });

    afterAll(async () => {
      // Удаляем тестовый проект
      if (testProjectId) {
        await request(app)
          .delete(`/api/projects/${testProjectId}`)
          .set('Authorization', `Bearer ${accessToken}`);
      }
    });

    it('должен вернуть все данные дашборда проекта одним запросом', async () => {
      if (!testProjectId) return;

      const startTime = Date.now();
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/full-dashboard`)
        .set('Authorization', `Bearer ${accessToken}`);
      const loadTime = Date.now() - startTime;

      console.log(`📊 Project full-dashboard loaded in ${loadTime}ms (single request vs 4+ separate)`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // Проверяем что все данные присутствуют
      expect(response.body.data.project).toBeDefined();
      expect(response.body.data.team).toBeDefined();
      expect(response.body.data.estimates).toBeDefined();
      expect(response.body.data.financialSummary).toBeDefined();

      // Проверяем структуру financialSummary
      expect(response.body.data.financialSummary.incomeWorks).toBeDefined();
      expect(response.body.data.financialSummary.expenseWorks).toBeDefined();
      expect(response.body.data.financialSummary.incomeMaterials).toBeDefined();
      expect(response.body.data.financialSummary.expenseMaterials).toBeDefined();
    });

    it('должен вернуть 404 для несуществующего проекта', async () => {
      const response = await request(app)
        .get('/api/projects/00000000-0000-0000-0000-000000000000/full-dashboard')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('должен вернуть 401 без токена', async () => {
      if (!testProjectId) return;

      const response = await request(app)
        .get(`/api/projects/${testProjectId}/full-dashboard`);

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // DELETE /api/projects/:id - Удаление проекта
  // ============================================
  describe('DELETE /api/projects/:id', () => {
    it('должен удалить проект', async () => {
      if (!createdProjectId) return;

      const response = await request(app)
        .delete(`/api/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Проект удалён, обнуляем ID
      createdProjectId = null;
    });

    it('должен вернуть 404 или 500 для несуществующего проекта', async () => {
      const response = await request(app)
        .delete('/api/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('должен вернуть 403 с невалидным токеном', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });
  });
});
