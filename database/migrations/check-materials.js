import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function checkMaterials() {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    // Структура materials
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'materials'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Структура таблицы MATERIALS:');
    columns.rows.forEach(r => {
      console.log(`  - ${r.column_name}: ${r.data_type} ${r.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    // Проверка первичного ключа
    const pk = await client.query(`
      SELECT column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'materials' AND constraint_name LIKE '%pkey%'
    `);

    console.log('\n🔑 Первичный ключ:');
    pk.rows.forEach(r => console.log(`  - ${r.column_name}`));

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await client.end();
  }
}

checkMaterials();
