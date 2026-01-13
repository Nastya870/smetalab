import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function checkProjectsTable() {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Структура таблицы PROJECTS:');
    result.rows.forEach(r => {
      console.log(`  - ${r.column_name}: ${r.data_type} ${r.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await client.end();
  }
}

checkProjectsTable();
