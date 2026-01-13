import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Подключение к базе данных успешно');

    // Читаем SQL-файл
    const sql = fs.readFileSync('database/migrations/013_create_estimate_item_materials.sql', 'utf8');

    console.log('\n🚀 Выполняю миграцию 013...\n');

    // Выполняем миграцию
    await client.query(sql);

    console.log('✅ Миграция 013 успешно выполнена!');
    console.log('   Таблица estimate_item_materials создана');

    // Проверка
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'estimate_item_materials'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Структура таблицы estimate_item_materials:');
    result.rows.forEach(r => {
      console.log(`  - ${r.column_name}: ${r.data_type}`);
    });

  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
