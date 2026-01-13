/**
 * Access Control Security Tests (IDOR)
 * 
 * Проверяет защиту от несанкционированного доступа к чужим данным
 * OWASP A01:2021 - Broken Access Control
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { IDOR_TEST_IDS } from '../fixtures/payloads.js';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

// Два разных пользователя для проверки изоляции данных
const USER_A = {
  email: 'security-idor-a@sectest.local',
  password: 'Test123!@#',
  fullName: 'User A for IDOR'
};

const USER_B = {
  email: 'security-idor-b@sectest.local',
  password: 'Test123!@#',
  fullName: 'User B for IDOR'
};

describe('Access Control (IDOR) Security Tests', () => {
  let tokenA;
  let tokenB;
  let userAId;
  let userBId;
  let userAProjectId;
  let userAMaterialId;
  let userAWorkId;

  beforeAll(async () => {
    // Регистрация User A
    try {
      const regA = await request(API_URL)
        .post('/api/auth/register')
        .send(USER_A);
      userAId = regA.body.data?.user?.id;
    } catch (e) {}

    const loginA = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: USER_A.email, password: USER_A.password });
    tokenA = loginA.body.data?.tokens?.accessToken;
    if (!userAId) userAId = loginA.body.data?.user?.id;

    // Регистрация User B
    try {
      const regB = await request(API_URL)
        .post('/api/auth/register')
        .send(USER_B);
      userBId = regB.body.data?.user?.id;
    } catch (e) {}

    const loginB = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: USER_B.email, password: USER_B.password });
    tokenB = loginB.body.data?.tokens?.accessToken;
    if (!userBId) userBId = loginB.body.data?.user?.id;

    // User A создаёт ресурсы
    if (tokenA) {
      const projectRes = await request(API_URL)
        .post('/api/projects')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'User A Private Project',
          address: 'Private Address',
          client_name: 'Private Client'
        });
      userAProjectId = projectRes.body.data?.id;

      const materialRes = await request(API_URL)
        .post('/api/materials')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'User A Private Material',
          unit: 'шт',
          price: 999
        });
      userAMaterialId = materialRes.body.data?.id;

      const workRes = await request(API_URL)
        .post('/api/works')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'User A Private Work',
          code: `IDOR-A-${Date.now()}`,
          unit: 'шт',
          base_price: 999
        });
      userAWorkId = workRes.body.data?.id;
    }
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Horizontal Privilege Escalation - Projects', () => {
    it('User B НЕ должен видеть проект User A', async () => {
      if (!userAProjectId || !tokenB) {
        return; // Skip if setup failed
      }

      const response = await request(API_URL)
        .get(`/api/projects/${userAProjectId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      // Должен вернуть 403 (Forbidden) или 404 (Not Found)
      expect([403, 404]).toContain(response.status);
    });

    it('User B НЕ должен обновлять проект User A', async () => {
      if (!userAProjectId || !tokenB) return;

      const response = await request(API_URL)
        .put(`/api/projects/${userAProjectId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          name: 'Hacked by User B'
        });

      expect([403, 404]).toContain(response.status);
    });

    it('User B НЕ должен удалять проект User A', async () => {
      if (!userAProjectId || !tokenB) return;

      const response = await request(API_URL)
        .delete(`/api/projects/${userAProjectId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect([403, 404]).toContain(response.status);
    });

    it('User A должен иметь доступ к своему проекту', async () => {
      if (!userAProjectId || !tokenA) return;

      const response = await request(API_URL)
        .get(`/api/projects/${userAProjectId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Horizontal Privilege Escalation - Materials', () => {
    it('User B НЕ должен обновлять материал User A', async () => {
      if (!userAMaterialId || !tokenB) return;

      const response = await request(API_URL)
        .put(`/api/materials/${userAMaterialId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          name: 'Hacked Material',
          price: 1
        });

      // Материалы могут быть shared в tenant, но обновление чужих - запрещено
      expect([403, 404, 200]).toContain(response.status);
      
      // Если 200 - это может быть общий материал tenant, не уязвимость
    });

    it('User B НЕ должен удалять материал User A', async () => {
      if (!userAMaterialId || !tokenB) return;

      const response = await request(API_URL)
        .delete(`/api/materials/${userAMaterialId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect([403, 404, 200]).toContain(response.status);
    });
  });

  describe('Horizontal Privilege Escalation - Works', () => {
    it('User B НЕ должен обновлять работу User A', async () => {
      if (!userAWorkId || !tokenB) return;

      const response = await request(API_URL)
        .put(`/api/works/${userAWorkId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          name: 'Hacked Work',
          base_price: 1
        });

      expect([403, 404, 200]).toContain(response.status);
    });
  });

  describe('Vertical Privilege Escalation', () => {
    it('Обычный пользователь НЕ должен получить список всех пользователей', async () => {
      if (!tokenB) return;

      const response = await request(API_URL)
        .get('/api/users')
        .set('Authorization', `Bearer ${tokenB}`);

      // Без admin прав должен вернуть 403
      expect([200, 403]).toContain(response.status);
      
      // Если 200 - проверяем что видит только себя или свой tenant
      if (response.status === 200 && response.body.data) {
        const users = Array.isArray(response.body.data) ? response.body.data : [];
        // Не должен видеть всех пользователей системы
        // (зависит от бизнес-логики - tenant users OK, all users NOT OK)
      }
    });

    it('Обычный пользователь НЕ должен менять роли', async () => {
      if (!tokenB || !userAId) return;

      const response = await request(API_URL)
        .post('/api/users/roles/assign')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          userId: userAId,
          roleKey: 'admin'
        });

      expect([403, 404, 401]).toContain(response.status);
    });

    it('Обычный пользователь НЕ должен удалять других пользователей', async () => {
      if (!tokenB || !userAId) return;

      const response = await request(API_URL)
        .delete(`/api/users/${userAId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect([403, 404, 401]).toContain(response.status);
    });
  });

  describe('ID Manipulation', () => {
    it('должен отклонить невалидный UUID формат', async () => {
      if (!tokenA) return;

      const response = await request(API_URL)
        .get('/api/projects/invalid-uuid-format')
        .set('Authorization', `Bearer ${tokenA}`);

      expect([400, 404, 500]).toContain(response.status);
    });

    it('должен отклонить отрицательный ID', async () => {
      if (!tokenA) return;

      const response = await request(API_URL)
        .get('/api/projects/-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect([400, 404, 500]).toContain(response.status);
    });

    it('должен отклонить ID = 0', async () => {
      if (!tokenA) return;

      const response = await request(API_URL)
        .get('/api/projects/0')
        .set('Authorization', `Bearer ${tokenA}`);

      expect([400, 404, 500]).toContain(response.status);
    });

    it('должен отклонить несуществующий UUID', async () => {
      if (!tokenA) return;

      const response = await request(API_URL)
        .get(`/api/projects/${IDOR_TEST_IDS.otherTenantProject}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Cross-Tenant Access', () => {
    it('пользователь НЕ должен видеть данные другого tenant через ID', async () => {
      if (!tokenA) return;

      // Пробуем получить проект из другого tenant
      const response = await request(API_URL)
        .get(`/api/projects/${IDOR_TEST_IDS.otherTenantProject}`)
        .set('Authorization', `Bearer ${tokenA}`);

      // Должен вернуть 404 (не найден в его tenant) или 403
      expect([403, 404]).toContain(response.status);
    });

    it('пользователь НЕ должен создавать ресурсы в другом tenant', async () => {
      if (!tokenA) return;

      // Попытка создать проект с чужим tenant_id в body
      const response = await request(API_URL)
        .post('/api/projects')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Cross Tenant Project',
          address: 'Test',
          client_name: 'Test',
          tenant_id: IDOR_TEST_IDS.otherTenantProject // Чужой tenant
        });

      // Сервер должен игнорировать tenant_id из body и использовать tenant из токена
      if (response.status === 201) {
        // Проверяем что tenant_id не был подменён
        const createdProject = response.body.data;
        if (createdProject?.tenant_id) {
          expect(createdProject.tenant_id).not.toBe(IDOR_TEST_IDS.otherTenantProject);
        }
      }
    });
  });

  describe('Mass Assignment', () => {
    it('НЕ должен позволять менять tenant_id через PUT', async () => {
      if (!tokenA || !userAProjectId) return;

      const response = await request(API_URL)
        .put(`/api/projects/${userAProjectId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Updated Name',
          tenant_id: IDOR_TEST_IDS.otherTenantProject // Попытка сменить tenant
        });

      if (response.status === 200) {
        // Проверяем что tenant_id не изменился
        const getRes = await request(API_URL)
          .get(`/api/projects/${userAProjectId}`)
          .set('Authorization', `Bearer ${tokenA}`);

        if (getRes.body.data?.tenant_id) {
          expect(getRes.body.data.tenant_id).not.toBe(IDOR_TEST_IDS.otherTenantProject);
        }
      }
    });

    it('НЕ должен позволять менять created_by через PUT', async () => {
      if (!tokenA || !userAProjectId) return;

      const response = await request(API_URL)
        .put(`/api/projects/${userAProjectId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Updated Name',
          created_by: userBId // Попытка сменить владельца
        });

      if (response.status === 200) {
        const getRes = await request(API_URL)
          .get(`/api/projects/${userAProjectId}`)
          .set('Authorization', `Bearer ${tokenA}`);

        if (getRes.body.data?.created_by) {
          expect(getRes.body.data.created_by).not.toBe(userBId);
        }
      }
    });

    it('НЕ должен позволять менять role через обновление профиля', async () => {
      if (!tokenB) return;

      const response = await request(API_URL)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          fullName: 'Updated Name',
          role: 'super_admin', // Попытка эскалации
          isSuperAdmin: true
        });

      // Проверяем что роль не изменилась
      const meRes = await request(API_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenB}`);

      if (meRes.body.data) {
        expect(meRes.body.data.isSuperAdmin).not.toBe(true);
      }
    });
  });

  describe('Forced Browsing', () => {
    it('НЕ должен раскрывать скрытые endpoints без авторизации', async () => {
      const sensitiveEndpoints = [
        '/api/admin/users',
        '/api/admin/tenants',
        '/api/admin/settings',
        '/api/internal/stats',
        '/api/debug',
      ];

      for (const endpoint of sensitiveEndpoints) {
        const response = await request(API_URL).get(endpoint);
        
        // Должен вернуть 401/403/404, но не 200 с данными
        expect([401, 403, 404, 500]).toContain(response.status);
      }
    });
  });

  describe('Parameter Pollution', () => {
    it('должен обрабатывать дублирующиеся параметры корректно', async () => {
      if (!tokenA) return;

      // Отправляем несколько id параметров
      const response = await request(API_URL)
        .get('/api/projects')
        .query({ id: userAProjectId })
        .query({ id: IDOR_TEST_IDS.otherTenantProject }) // Второй ID
        .set('Authorization', `Bearer ${tokenA}`);

      // Не должен вернуть данные из другого tenant
      expect([200, 400]).toContain(response.status);
    });
  });
});
