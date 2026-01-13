/**
 * Скрипт для назначения роли super_admin пользователю
 * Использование: node scripts/set-super-admin.mjs kiy026@yandex.ru
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env из корня проекта
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Client } = pg;

async function setSuperAdmin(email) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Находим пользователя
    const userResult = await client.query(
      'SELECT id, email, full_name FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ User ${email} not found`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`👤 Found user: ${user.full_name} (${user.email})`);

    // 2. Находим роль super_admin
    const roleResult = await client.query(
      "SELECT id, key, name FROM roles WHERE key = 'super_admin'"
    );

    if (roleResult.rows.length === 0) {
      console.error('❌ Role super_admin not found in database');
      process.exit(1);
    }

    const superAdminRole = roleResult.rows[0];
    console.log(`🔐 Found role: ${superAdminRole.name} (${superAdminRole.key})`);

    // 3. Находим tenant пользователя
    const tenantResult = await client.query(
      'SELECT tenant_id FROM user_tenants WHERE user_id = $1 AND is_default = true LIMIT 1',
      [user.id]
    );

    if (tenantResult.rows.length === 0) {
      console.error('❌ User has no default tenant');
      process.exit(1);
    }

    const tenantId = tenantResult.rows[0].tenant_id;
    console.log(`🏢 Found tenant: ${tenantId}`);

    // 4. Проверяем текущие роли
    const currentRolesResult = await client.query(
      `SELECT r.key, r.name 
       FROM user_role_assignments ura 
       JOIN roles r ON ura.role_id = r.id 
       WHERE ura.user_id = $1 AND ura.tenant_id = $2`,
      [user.id, tenantId]
    );

    console.log('\n📋 Current roles:', currentRolesResult.rows.map(r => r.name).join(', ') || 'none');

    // 5. Удаляем все старые роли для этого tenant
    await client.query(
      'DELETE FROM user_role_assignments WHERE user_id = $1 AND tenant_id = $2',
      [user.id, tenantId]
    );
    console.log('🗑️  Removed old roles');

    // 6. Назначаем роль super_admin
    await client.query(
      `INSERT INTO user_role_assignments (tenant_id, user_id, role_id)
       VALUES ($1, $2, $3)`,
      [tenantId, user.id, superAdminRole.id]
    );

    console.log('\n✅ SUCCESS! User is now super_admin');
    console.log(`\n👤 User: ${user.email}`);
    console.log(`🔐 Role: ${superAdminRole.name}`);
    console.log(`\n⚠️  User needs to logout and login again for changes to take effect`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Получаем email из аргументов
const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: node scripts/set-super-admin.mjs <email>');
  console.error('Example: node scripts/set-super-admin.mjs kiy026@yandex.ru');
  process.exit(1);
}

setSuperAdmin(email);
