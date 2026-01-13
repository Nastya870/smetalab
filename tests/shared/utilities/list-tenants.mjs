import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function listTenants() {
  const client = await pool.connect();
  
  try {
    console.log('🏢 Список всех тенантов:\n');
    
    const tenantsResult = await client.query(`
      SELECT 
        t.id,
        t.name,
        t.plan,
        t.status,
        COUNT(DISTINCT ut.user_id) as users_count,
        COUNT(DISTINCT r.id) as roles_count
      FROM tenants t
      LEFT JOIN user_tenants ut ON t.id = ut.tenant_id
      LEFT JOIN roles r ON t.id = r.tenant_id
      GROUP BY t.id, t.name, t.plan, t.status
      ORDER BY t.created_at
    `);
    
    if (tenantsResult.rows.length === 0) {
      console.log('  Нет тенантов');
    } else {
      tenantsResult.rows.forEach(tenant => {
        console.log(`📁 ${tenant.name}`);
        console.log(`   ID: ${tenant.id}`);
        console.log(`   План: ${tenant.plan}`);
        console.log(`   Статус: ${tenant.status}`);
        console.log(`   Пользователей: ${tenant.users_count}`);
        console.log(`   Ролей: ${tenant.roles_count}`);
        console.log();
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

listTenants();
