import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function listUsers() {
  try {
    console.log('Проверяем зарегистрированных пользователей...\n');
    
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.status,
        u.email_verified,
        u.created_at,
        t.name as company_name,
        r.name as role_name,
        r.key as role_key
      FROM users u
      LEFT JOIN user_tenants ut ON u.id = ut.user_id AND ut.is_default = true
      LEFT JOIN tenants t ON ut.tenant_id = t.id
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN roles r ON ura.role_id = r.id
      ORDER BY u.created_at DESC
    `);
    
    console.log(`Всего пользователей: ${result.rows.length}\n`);
    console.log('═'.repeat(120));
    
    result.rows.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.full_name || 'Без имени'}`);
      console.log('─'.repeat(120));
      console.log(`   Email:             ${user.email}`);
      console.log(`   Телефон:           ${user.phone || 'не указан'}`);
      console.log(`   Компания:          ${user.company_name || 'не назначена'}`);
      console.log(`   Роль:              ${user.role_name || 'не назначена'} ${user.role_key ? `(${user.role_key})` : ''}`);
      console.log(`   Статус:            ${user.status}`);
      console.log(`   Email подтвержден: ${user.email_verified ? '✅ Да' : '❌ Нет'}`);
      console.log(`   Дата регистрации:  ${new Date(user.created_at).toLocaleString('ru-RU')}`);
    });
    
    console.log('\n' + '═'.repeat(120));
    
    // Статистика
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive
      FROM users
    `);
    
    console.log('\n📊 Статистика:');
    console.log(`   Всего пользователей:     ${stats.rows[0].total}`);
    console.log(`   Подтвержденные email:    ${stats.rows[0].verified}`);
    console.log(`   Активные:                ${stats.rows[0].active}`);
    console.log(`   Неактивные:              ${stats.rows[0].inactive}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

listUsers();
