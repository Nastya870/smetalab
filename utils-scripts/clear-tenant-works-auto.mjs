import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env из директории vite
dotenv.config({ path: join(__dirname, '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Email администратора
const ADMIN_EMAIL = 'kiy026@yandex.ru';

async function clearTenantWorks() {
  try {
    console.log('🗑️  Очистка тенантного справочника работ\n');
    
    // Получаем данные администратора
    const userResult = await pool.query(`
      SELECT u.id as user_id, ut.tenant_id
      FROM users u
      JOIN user_tenants ut ON u.id = ut.user_id
      WHERE u.email = $1 AND ut.is_default = TRUE
    `, [ADMIN_EMAIL]);
    
    if (userResult.rows.length === 0) {
      throw new Error(`Пользователь с email ${ADMIN_EMAIL} не найден или у него нет дефолтного тенанта`);
    }
    
    const { user_id: USER_ID, tenant_id: TENANT_ID } = userResult.rows[0];
    
    console.log('👤 Администратор:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   User ID: ${USER_ID}`);
    console.log(`   Tenant ID: ${TENANT_ID}\n`);
    
    // Проверяем количество работ перед удалением
    const countBefore = await pool.query(`
      SELECT COUNT(*) as count
      FROM works
      WHERE is_global = FALSE AND tenant_id = $1
    `, [TENANT_ID]);
    
    const worksBefore = parseInt(countBefore.rows[0].count);
    
    console.log(`📊 Текущее состояние:`);
    console.log(`   Тенантных работ: ${worksBefore}\n`);
    
    if (worksBefore === 0) {
      console.log('✅ Тенантный справочник уже пуст!');
      await pool.end();
      return;
    }
    
    // Показываем примеры работ, которые будут удалены
    const examples = await pool.query(`
      SELECT code, name, phase, section
      FROM works
      WHERE is_global = FALSE AND tenant_id = $1
      ORDER BY code
      LIMIT 5
    `, [TENANT_ID]);
    
    console.log('📋 Примеры работ, которые будут удалены:');
    examples.rows.forEach((work, i) => {
      console.log(`   ${i+1}. ${work.code} - ${work.name}`);
    });
    console.log('');
    
    console.log('🗑️  Удаляем тенантные работы...\n');
    
    // Удаляем все тенантные работы
    const deleteResult = await pool.query(`
      DELETE FROM works
      WHERE is_global = FALSE AND tenant_id = $1
      RETURNING id
    `, [TENANT_ID]);
    
    const deletedCount = deleteResult.rowCount;
    
    console.log('✅ Удаление завершено!\n');
    
    // Проверяем результат
    const countAfter = await pool.query(`
      SELECT COUNT(*) as count
      FROM works
      WHERE is_global = FALSE AND tenant_id = $1
    `, [TENANT_ID]);
    
    const worksAfter = parseInt(countAfter.rows[0].count);
    
    console.log('═'.repeat(60));
    console.log('📊 ИТОГИ:');
    console.log('═'.repeat(60));
    console.log(`Было тенантных работ:       ${worksBefore}`);
    console.log(`Удалено:                    ${deletedCount}`);
    console.log(`Осталось тенантных работ:   ${worksAfter}`);
    console.log('═'.repeat(60));
    
    // Проверяем глобальные работы (они должны остаться нетронутыми)
    const globalCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM works
      WHERE is_global = TRUE
    `);
    
    console.log(`\n✅ Глобальные работы не тронуты: ${globalCount.rows[0].count} работ\n`);
    
    await pool.end();
    console.log('✅ Операция успешно завершена!');
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

clearTenantWorks();
