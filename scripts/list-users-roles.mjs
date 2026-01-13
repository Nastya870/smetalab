/**
 * Скрипт для просмотра всех пользователей и их ролей
 * Использование: node scripts/list-users-roles.mjs
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

async function listUsersRoles() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const result = await client.query(`
      SELECT 
        u.id,
        u.email,
        u.full_name,
        u.status,
        u.email_verified,
        t.name as tenant_name,
        r.key as role_key,
        r.name as role_name,
        u.created_at
      FROM users u
      LEFT JOIN user_tenants ut ON u.id = ut.user_id AND ut.is_default = true
      LEFT JOIN tenants t ON ut.tenant_id = t.id
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id AND ut.tenant_id = ura.tenant_id
      LEFT JOIN roles r ON ura.role_id = r.id
      ORDER BY u.created_at DESC
    `);

    console.log(`📊 Total users: ${result.rows.length}\n`);
    console.log('═'.repeat(120));

    result.rows.forEach((user, index) => {
      const verified = user.email_verified ? '✅' : '❌';
      const status = user.status === 'active' ? '🟢' : '🔴';
      const roleIcon = user.role_key === 'super_admin' ? '👑' : 
                       user.role_key === 'admin' ? '🔐' : 
                       user.role_key === 'manager' ? '📊' : '👤';
      
      console.log(`${index + 1}. ${status} ${user.full_name || 'No name'}`);
      console.log(`   📧 Email: ${user.email} ${verified}`);
      console.log(`   🏢 Tenant: ${user.tenant_name || 'No tenant'}`);
      console.log(`   ${roleIcon} Role: ${user.role_name || 'No role'} (${user.role_key || 'none'})`);
      console.log(`   📅 Created: ${new Date(user.created_at).toLocaleDateString('ru-RU')}`);
      console.log('─'.repeat(120));
    });

    // Статистика по ролям
    const rolesResult = await client.query(`
      SELECT 
        r.key,
        r.name,
        COUNT(DISTINCT ura.user_id) as user_count
      FROM roles r
      LEFT JOIN user_role_assignments ura ON r.id = ura.role_id
      GROUP BY r.id, r.key, r.name
      ORDER BY user_count DESC
    `);

    console.log('\n📊 Role Statistics:');
    console.log('═'.repeat(60));
    rolesResult.rows.forEach(role => {
      const icon = role.key === 'super_admin' ? '👑' : 
                   role.key === 'admin' ? '🔐' : 
                   role.key === 'manager' ? '📊' : '👤';
      console.log(`${icon} ${role.name}: ${role.user_count} users`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

listUsersRoles();
