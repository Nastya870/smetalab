/**
 * Test Database Helper
 * 
 * Предоставляет утилиты для работы с тестовыми данными:
 * - Создание тестовых пользователей
 * - Создание тестовых тенантов
 * - Назначение ролей
 * - Безопасная очистка (удаляет только @test.com данные)
 */

import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { createDefaultRolesForTenant } from '../../server/utils/createDefaultRoles.js';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || '';
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

// Создаём пул подключений для тестов
const testPool = new Pool({
  connectionString,
  ssl: isLocalhost ? false : {
    rejectUnauthorized: false
  }
});

/**
 * Очищает тестовые данные
 * ВАЖНО: Удаляет только пользователей с email @test.com И связанные с ними tenants
 */
export async function cleanupTestData() {
  try {
    // Получаем список tenant_id которые принадлежат ТОЛЬКО @test.com пользователям
    const tenantsToDelete = await testPool.query(`
      SELECT DISTINCT ut.tenant_id 
      FROM user_tenants ut
      WHERE ut.user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com%')
      AND NOT EXISTS (
        SELECT 1 FROM user_tenants ut2 
        WHERE ut2.tenant_id = ut.tenant_id 
        AND ut2.user_id NOT IN (SELECT id FROM users WHERE email LIKE '%@test.com%')
      )
    `);

    const tenantIds = tenantsToDelete.rows.map(row => row.tenant_id);

    // Удаляем пользователей с @test.com
    await testPool.query(`
      DELETE FROM user_role_assignments
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com%')
    `);

    await testPool.query(`
      DELETE FROM user_tenants
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com%')
    `);

    await testPool.query(`
      DELETE FROM sessions
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com%')
    `);

    await testPool.query(`
      DELETE FROM users
      WHERE email LIKE '%@test.com%'
    `);

    // Удаляем ТОЛЬКО tenants которые принадлежали исключительно @test.com пользователям
    if (tenantIds.length > 0) {
      await testPool.query(`
        DELETE FROM tenants
        WHERE id = ANY($1)
      `, [tenantIds]);
    }

    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    throw error;
  }
}

/**
 * Создаёт тестового пользователя
 * @param {Object} options.withTenant - создать tenant и связать (по умолчанию true)
 */
export async function createTestUser(userData = {}, options = {}) {
  const defaultData = {
    email: userData.email || 'test@test.com',
    password: userData.password || 'Test123!@#',
    fullName: userData.fullName || 'Test User',
    phone: userData.phone || null
  };

  const withTenant = options.withTenant !== false; // По умолчанию true

  // Хешируем пароль как в production
  const passHash = await bcrypt.hash(defaultData.password, 10);

  // Используем single connection для всей операции
  const client = await testPool.connect();

  try {
    await client.query('BEGIN');

    // Создаём пользователя
    const result = await client.query(
      `INSERT INTO users (email, pass_hash, full_name, phone, status, email_verified, avatar_url)
       VALUES ($1, $2, $3, $4, 'active', true, '/favicon.png')
       RETURNING id, email, full_name, phone, status, email_verified, avatar_url`,
      [defaultData.email, passHash, defaultData.fullName, defaultData.phone]
    );

    const user = result.rows[0];

    let tenant = null;

    // Если нужен tenant, создаём и связываем
    if (withTenant) {
      // Создаём tenant с уникальным именем (добавляем email для уникальности)
      const uniqueName = `Test Company ${defaultData.email.replace('@', '-').replace('.', '-')}-${Date.now()}`;
      const tenantResult = await client.query(
        `INSERT INTO tenants (name, inn, legal_address, status)
         VALUES ($1, '1234567890', 'Test Address', 'active')
         RETURNING id, name, inn, legal_address, status`,
        [uniqueName]
      );

      tenant = tenantResult.rows[0];

      // Создаём базовые роли для тенанта (admin, manager, estimator, worker)
      await createDefaultRolesForTenant(client, tenant.id);

      // Связываем пользователя с тенантом
      await client.query(
        `INSERT INTO user_tenants (tenant_id, user_id, is_default)
         VALUES ($1, $2, true)
         ON CONFLICT DO NOTHING`,
        [tenant.id, user.id]
      );

      // Назначаем роль admin пользователю (по умолчанию)
      const roleKey = options.roleKey || 'admin';
      const roleResult = await client.query(
        `SELECT id FROM roles WHERE key = $1 AND tenant_id = $2 LIMIT 1`,
        [roleKey, tenant.id]
      );

      if (roleResult.rows.length > 0) {
        await client.query(
          `INSERT INTO user_role_assignments (user_id, role_id, tenant_id)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [user.id, roleResult.rows[0].id, tenant.id]
        );
      }
    }

    await client.query('COMMIT');

    return { user, tenant };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Создаёт тестовый тенант
 */
export async function createTestTenant(tenantData = {}) {
  const defaultData = {
    name: tenantData.name || 'Test Company',
    inn: tenantData.inn || '1234567890',
    legalAddress: tenantData.legalAddress || 'Test Address'
  };

  const result = await testPool.query(
    `INSERT INTO tenants (name, inn, legal_address, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING id, name, inn, legal_address, status`,
    [defaultData.name, defaultData.inn, defaultData.legalAddress]
  );

  return result.rows[0];
}

/**
 * Назначает роль пользователю
 */
export async function assignRoleToUser(userId, roleKey, tenantId = null) {
  // Получаем ID роли
  const roleResult = await testPool.query(
    `SELECT id FROM roles
     WHERE key = $1 AND (tenant_id = $2 OR ($2 IS NULL AND tenant_id IS NULL))
     LIMIT 1`,
    [roleKey, tenantId]
  );

  if (roleResult.rows.length === 0) {
    throw new Error(`Role ${roleKey} not found`);
  }

  const roleId = roleResult.rows[0].id;

  // Назначаем роль
  await testPool.query(
    `INSERT INTO user_role_assignments (user_id, role_id, tenant_id)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [userId, roleId, tenantId]
  );

  // Если есть tenant_id, добавляем в user_tenants
  if (tenantId) {
    await testPool.query(
      `INSERT INTO user_tenants (user_id, tenant_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, tenantId]
    );
  }
}

/**
 * Получает разрешения роли
 */
export async function getRolePermissions(roleKey) {
  const result = await testPool.query(
    `SELECT permissions FROM roles WHERE key = $1`,
    [roleKey]
  );

  return result.rows[0]?.permissions || [];
}

/**
 * Проверяет существование пользователя
 */
export async function userExists(email) {
  const result = await testPool.query(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  );

  return result.rows.length > 0;
}

/**
 * Получает пользователя по email
 */
export async function getUserByEmail(email) {
  const result = await testPool.query(
    `SELECT id, email, full_name, phone, status, email_verified, avatar_url
     FROM users WHERE email = $1`,
    [email]
  );

  return result.rows[0];
}

/**
 * Закрывает пул подключений
 */
export async function closePool() {
  await testPool.end();
}

export default {
  testPool,
  cleanupTestData,
  createTestUser,
  createTestTenant,
  assignRoleToUser,
  getRolePermissions,
  userExists,
  getUserByEmail,
  closePool
};
