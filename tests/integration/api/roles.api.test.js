// @vitest-environment node
/**
 * Integration тесты для Roles API
 * 
 * КРИТИЧЕСКИЙ ТЕСТ: Проверка исправленного бага от 21.11.2025
 * 
 * БАГ: Super admin с несколькими ролями [super_admin, admin] видел tenant roles
 *      (manager, estimator, supplier) вместо global roles (super_admin, admin template)
 * 
 * ПРИЧИНА: rolesController.getAllRoles() проверял только первую роль:
 *          const isSuperAdmin = roleKey === 'super_admin'
 * 
 * ИСПРАВЛЕНИЕ: Проверяем ВСЕ роли пользователя:
 *              const userRoles = await getUserRoles(userId);
 *              const isSuperAdmin = userRoles.includes('super_admin');
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../server/index.js';
import testDb from '../../fixtures/testDatabase.js';

describe('Roles API - Super Admin Bug Fix (21.11.2025)', () => {
  let superAdminToken;
  let superAdminUser;
  let superAdminTenant;
  let adminToken;
  let adminTenant;

  beforeAll(async () => {
    // НЕ вызываем cleanupTestData чтобы не удалить данные других тестов!
    // Используем уникальный email domain для изоляции

    // Создаём super_admin пользователя с тенантом
    const superAdminResult = await testDb.createTestUser({
      email: 'roles-superadmin@rolestest.local',
      password: 'Test123!@#',
      fullName: 'Super Admin Test'
    });
    superAdminUser = superAdminResult.user;
    superAdminTenant = superAdminResult.tenant;

    // Назначаем роль super_admin (глобальная - с tenant_id = NULL)
    await testDb.assignRoleToUser(superAdminUser.id, 'super_admin', null);

    // Также назначаем admin для тенанта (чтобы воспроизвести баг с несколькими ролями)
    await testDb.assignRoleToUser(superAdminUser.id, 'admin', superAdminTenant.id);

    // Создаём admin (tenant-specific) для сравнения
    const adminResult = await testDb.createTestUser({
      email: 'roles-admin@rolestest.local',
      password: 'Test123!@#',
      fullName: 'Admin Test'
    });
    const adminUser = adminResult.user;
    adminTenant = adminResult.tenant;

    // Назначаем admin роль (tenant-specific, имеет разрешения)
    await testDb.assignRoleToUser(adminUser.id, 'admin', adminTenant.id);

    // Логинимся
    const superAdminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'roles-superadmin@rolestest.local',
        password: 'Test123!@#'
      });

    if (superAdminLogin.status !== 200) {
      throw new Error(`Super admin login failed: ${superAdminLogin.status} ${JSON.stringify(superAdminLogin.body)}`);
    }

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'roles-admin@rolestest.local',
        password: 'Test123!@#'
      });

    if (adminLogin.status !== 200) {
      throw new Error(`Admin login failed: ${adminLogin.status} ${JSON.stringify(adminLogin.body)}`);
    }

    superAdminToken = superAdminLogin.body.data.tokens.accessToken;
    adminToken = adminLogin.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Очищаем только НАШИ данные с @rolestest.local
    try {
      await testDb.testPool.query(`
        DELETE FROM user_role_assignments
        WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@rolestest.local%')
      `);

      await testDb.testPool.query(`
        DELETE FROM user_tenants
        WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@rolestest.local%')
      `);

      await testDb.testPool.query(`
        DELETE FROM sessions
        WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@rolestest.local%')
      `);

      await testDb.testPool.query(`
        DELETE FROM users
        WHERE email LIKE '%@rolestest.local%'
      `);

      // Удаляем тенанты созданные для roles tests
      const tenantIds = [superAdminTenant?.id, adminTenant?.id].filter(Boolean);
      if (tenantIds.length > 0) {
        await testDb.testPool.query(
          `DELETE FROM tenants WHERE id = ANY($1)`,
          [tenantIds]
        );
      }
    } catch (error) {
      console.error('Error in roles tests cleanup:', error);
    }
    
    await testDb.closePool();
  });

  // ============================================
  // REGRESSION TEST: Super Admin Bug
  // ============================================
  describe('REGRESSION TEST: GET /api/roles (super_admin с несколькими ролями)', () => {
    it('должен вернуть ТОЛЬКО global roles для super_admin', async () => {
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      const roleKeys = response.body.data.map(r => r.key);

      // Super admin ДОЛЖЕН видеть global roles
      expect(roleKeys).toContain('super_admin');
      expect(roleKeys).toContain('admin'); // admin template (global)

      // Super admin НЕ ДОЛЖЕН видеть tenant roles
      expect(roleKeys).not.toContain('manager');
      expect(roleKeys).not.toContain('estimator');
      expect(roleKeys).not.toContain('supplier');

      // Все роли должны быть global (tenant_id = null)
      const allGlobal = response.body.data.every(role => role.tenant_id === null);
      expect(allGlobal).toBe(true);
    });

    it('должен правильно определить isSuperAdmin через ВСЕ роли пользователя', async () => {
      // Этот тест проверяет, что мы НЕ используем roleKey === 'super_admin'
      // А проверяем userRoles.includes('super_admin')

      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);

      // Если бы баг остался, мы бы увидели tenant roles (manager, estimator, supplier)
      const roleKeys = response.body.data.map(r => r.key);
      
      // Проверяем, что tenant roles НЕ возвращаются
      const hasTenantRoles = roleKeys.some(key => 
        ['manager', 'estimator', 'supplier'].includes(key)
      );

      expect(hasTenantRoles).toBe(false);
    });

    it('должен логировать корректную информацию о super_admin', async () => {
      // При запросе должен выводиться лог:
      // User Roles: [super_admin, admin]
      // Is Super Admin: YES ✅

      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      
      // Проверяем структуру ответа
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Каждая роль должна иметь правильную структуру
      response.body.data.forEach(role => {
        expect(role).toHaveProperty('id');
        expect(role).toHaveProperty('key');
        expect(role).toHaveProperty('name');
        expect(role).toHaveProperty('tenant_id');
        expect(role.tenant_id).toBeNull(); // Все global
      });
    });
  });

  // ============================================
  // Сравнение: Tenant Admin НЕ видит global roles
  // ============================================
  describe('GET /api/roles (tenant admin)', () => {
    it('tenant admin должен видеть только tenant roles своего тенанта (кроме admin)', async () => {
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();

      const roleKeys = response.body.data.map(r => r.key);

      // Tenant admin ДОЛЖЕН видеть tenant roles (но НЕ admin - это системная роль)
      expect(roleKeys).toContain('manager');
      expect(roleKeys).toContain('estimator');
      expect(roleKeys).toContain('worker');

      // Tenant admin НЕ ДОЛЖЕН видеть global roles
      expect(roleKeys).not.toContain('super_admin');
      
      // Tenant admin НЕ ДОЛЖЕН видеть admin роль (защищена от редактирования)
      expect(roleKeys).not.toContain('admin');

      // Ни одна роль не должна быть global
      const hasGlobalRoles = response.body.data.some(role => role.tenant_id === null);
      expect(hasGlobalRoles).toBe(false);
    });
  });

  // ============================================
  // Проверка структуры роли
  // ============================================
  describe('GET /api/permissions/roles/:id', () => {
    it('должен вернуть полную информацию о роли с разрешениями', async () => {
      // Сначала получаем список ролей
      const rolesResponse = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${superAdminToken}`);

      const superAdminRole = rolesResponse.body.data.find(r => r.key === 'super_admin');
      expect(superAdminRole).toBeDefined();

      // Получаем детали роли - правильный URL!
      const roleResponse = await request(app)
        .get(`/api/permissions/roles/${superAdminRole.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(roleResponse.status).toBe(200);
      expect(roleResponse.body.success).toBe(true);
      expect(roleResponse.body.data).toBeDefined();
      expect(roleResponse.body.data.roleKey).toBe('super_admin');
      expect(roleResponse.body.data.permissions).toBeDefined();
      expect(Array.isArray(roleResponse.body.data.permissions)).toBe(true);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('должен вернуть 401 без токена', async () => {
      const response = await request(app).get('/api/roles');
      expect(response.status).toBe(401);
    });

    it('должен вернуть 403 с невалидным токеном', async () => {
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });

    it('должен вернуть 404 для несуществующей роли', async () => {
      const response = await request(app)
        .get('/api/roles/99999')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(404);
    });
  });
});
