// Скрипт для проверки категорий в таблице works через Neon API
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function checkWorksCategories() {
  const client = new Client({
    connectionString
  });

  try {
    await client.connect();
    console.log('✅ Подключено к Neon PostgreSQL');

    // Сначала проверим структуру таблицы works
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'works'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Структура таблицы works:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Проверяем данные в таблице works (phase, section, subsection)
    const result = await client.query(`
      SELECT id, code, name, phase, section, subsection, unit, base_price 
      FROM works 
      WHERE is_global = TRUE
      LIMIT 10
    `);

    console.log('\n📊 Первые 10 работ из базы данных:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    result.rows.forEach((work, index) => {
      console.log(`\n${index + 1}. ${work.name}`);
      console.log(`   Код: ${work.code}`);
      console.log(`   Фаза: "${work.phase || '(пусто)'}"`);
      console.log(`   Раздел: "${work.section || '(пусто)'}"`);
      console.log(`   Подраздел: "${work.subsection || '(пусто)'}"`);
      console.log(`   Ед.изм: ${work.unit}`);
      console.log(`   Цена: ${work.base_price}`);
    });

    // Проверяем статистику по разделам
    const stats = await client.query(`
      SELECT 
        section,
        COUNT(*) as count
      FROM works
      WHERE is_global = TRUE
      GROUP BY section
      ORDER BY count DESC
    `);

    console.log('\n\n📈 Статистика по разделам:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    stats.rows.forEach(stat => {
      console.log(`${stat.section || '(пусто)'}: ${stat.count} работ`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await client.end();
    console.log('\n✅ Соединение закрыто');
  }
}

checkWorksCategories();
