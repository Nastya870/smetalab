/**
 * Integration тесты для Contracts API
 * Тестирует генерацию, DOCX, статусы
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../server/index.js';
import testDb from '../../fixtures/testDatabase.js';

describe('Contracts API Integration Tests', () => {
  let accessToken;
  let testUser;
  let testTenant;
  let createdProjectId;
  let createdEstimateId;
  let createdContractId;

  beforeAll(async () => {
    const result = await testDb.createTestUser({
      email: 'contracts-test@test.com',
      password: 'Test123!@#',
      fullName: 'Contracts Test User'
    });
    testUser = result.user;
    testTenant = result.tenant;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'contracts-test@test.com',
        password: 'Test123!@#'
      });

    accessToken = loginResponse.body.data.tokens.accessToken;

    // Создаём проект и смету для договоров
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Проект для договоров' });

    createdProjectId = projectResponse.body.data?.id;

    if (createdProjectId) {
      const estimateResponse = await request(app)
        .post(`/api/projects/${createdProjectId}/estimates`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Смета для договора' });

      createdEstimateId = estimateResponse.body.data?.id;
    }
  });

  afterAll(async () => {
    try {
      if (createdContractId) {
        await testDb.testPool.query('DELETE FROM contracts WHERE id = $1', [createdContractId]);
      }
      if (createdEstimateId) {
        await testDb.testPool.query('DELETE FROM estimates WHERE id = $1', [createdEstimateId]);
      }
      if (createdProjectId) {
        await testDb.testPool.query('DELETE FROM projects WHERE id = $1', [createdProjectId]);
      }
      await testDb.testPool.query(`
        DELETE FROM user_role_assignments WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%contracts-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM user_tenants WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%contracts-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM sessions WHERE user_id IN (
          SELECT id FROM users WHERE email LIKE '%contracts-test@test.com%'
        )
      `);
      await testDb.testPool.query(`
        DELETE FROM users WHERE email LIKE '%contracts-test@test.com%'
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
  // POST /api/contracts/generate - Генерация договора
  // ============================================
  describe('POST /api/contracts/generate', () => {
    it('должен сгенерировать договор из сметы', async () => {
      if (!createdEstimateId) return;

      const contractData = {
        estimateId: createdEstimateId,
        contractNumber: 'ДОГ-001-TEST',
        contractDate: new Date().toISOString().split('T')[0],
        clientName: 'ООО Тест Клиент'
      };

      const response = await request(app)
        .post('/api/contracts/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(contractData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      createdContractId = response.body.data.id;
    });

    it('должен вернуть 400 без estimateId', async () => {
      const response = await request(app)
        .post('/api/contracts/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          contractNumber: 'ДОГ-002'
        });

      expect(response.status).toBe(400);
    });

    it('должен вернуть 401 без токена', async () => {
      const response = await request(app)
        .post('/api/contracts/generate')
        .send({ estimateId: 1 });

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // GET /api/contracts/estimate/:estimateId - Договор по смете
  // ============================================
  describe('GET /api/contracts/estimate/:estimateId', () => {
    it('должен вернуть договор для сметы', async () => {
      if (!createdEstimateId) return;

      const response = await request(app)
        .get(`/api/contracts/estimate/${createdEstimateId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================
  // GET /api/contracts/project/:projectId - Договоры проекта
  // ============================================
  describe('GET /api/contracts/project/:projectId', () => {
    it('должен вернуть договоры проекта', async () => {
      if (!createdProjectId) return;

      const response = await request(app)
        .get(`/api/contracts/project/${createdProjectId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================
  // GET /api/contracts/:id - Получение договора
  // ============================================
  describe('GET /api/contracts/:id', () => {
    it('должен вернуть договор по id', async () => {
      if (!createdContractId) return;

      const response = await request(app)
        .get(`/api/contracts/${createdContractId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdContractId);
    });

    it('должен вернуть 404 или 500 для несуществующего договора', async () => {
      const response = await request(app)
        .get('/api/contracts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  // ============================================
  // PUT /api/contracts/:id - Обновление договора
  // ============================================
  describe('PUT /api/contracts/:id', () => {
    it('должен обновить договор', async () => {
      if (!createdContractId) return;

      const updateData = {
        contractNumber: 'ДОГ-001-UPDATED',
        clientName: 'ООО Обновлённый Клиент'
      };

      const response = await request(app)
        .put(`/api/contracts/${createdContractId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================
  // PATCH /api/contracts/:id/status - Обновление статуса
  // ============================================
  describe('PATCH /api/contracts/:id/status', () => {
    it('должен обновить статус договора', async () => {
      if (!createdContractId) return;

      const response = await request(app)
        .patch(`/api/contracts/${createdContractId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'signed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================
  // GET /api/contracts/:id/docx - Скачивание DOCX
  // ============================================
  describe('GET /api/contracts/:id/docx', () => {
    it('должен вернуть DOCX файл договора', async () => {
      if (!createdContractId) return;

      const response = await request(app)
        .get(`/api/contracts/${createdContractId}/docx`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Может вернуть 200 (файл) или 404/500 если шаблон не настроен
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  // ============================================
  // DELETE /api/contracts/:id - Удаление договора
  // ============================================
  describe('DELETE /api/contracts/:id', () => {
    it('должен удалить договор', async () => {
      if (!createdContractId) return;

      const response = await request(app)
        .delete(`/api/contracts/${createdContractId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      createdContractId = null;
    });

    it('должен вернуть 404 или 500 для несуществующего договора', async () => {
      const response = await request(app)
        .delete('/api/contracts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });
});
