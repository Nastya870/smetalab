/**
 * Запуск миграции 041_enable_pg_trgm на Render PostgreSQL
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

// Render PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://smetalab_user:KJPh8y7plWvVIK2xiTeu9ROpUEk0QFSh@dpg-d51t19f6s9ss73eui8k0-a.frankfurt-postgres.render.com/smetalab_yay5',
  ssl: { rejectUnauthorized: false }
});

console.log('🚀 Миграция: Enable pg_trgm extension\n');
console.log('='.repeat(70));

try {
  // Проверка подключения
  console.log('\n📡 Подключение к БД...');
  await pool.query('SELECT NOW()');
  console.log('✅ Подключено успешно\n');
  
  // Проверка наличия extension
  console.log('🔍 Проверка pg_trgm extension...');
  const { rows } = await pool.query(`
    SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
  `);
  
  if (rows.length > 0) {
    console.log('✅ pg_trgm уже установлен\n');
  } else {
    console.log('⚠️  pg_trgm не установлен, создаём...\n');
  }
  
  // Enable pg_trgm
  console.log('📊 Включение pg_trgm extension...');
  await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
  console.log('✅ pg_trgm включен\n');
  
  // Create indexes
  console.log('📊 Создание GIN индексов для materials...');
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_materials_name_gin 
    ON materials USING gin (name gin_trgm_ops);
  `);
  console.log('  ✅ idx_materials_name_gin');
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_materials_category_gin 
    ON materials USING gin (category gin_trgm_ops);
  `);
  console.log('  ✅ idx_materials_category_gin\n');
  
  console.log('📊 Создание GIN индексов для works...');
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_works_name_gin 
    ON works USING gin (name gin_trgm_ops);
  `);
  console.log('  ✅ idx_works_name_gin');
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_works_category_gin 
    ON works USING gin (category gin_trgm_ops);
  `);
  console.log('  ✅ idx_works_category_gin\n');
  
  console.log('='.repeat(70));
  console.log('\n🎉 Миграция завершена успешно!');
  console.log('\n💡 Hybrid search готов к работе.');
  
} catch (error) {
  console.error('\n❌ Ошибка миграции:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  await pool.end();
}
