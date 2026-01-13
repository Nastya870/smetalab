import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function checkData() {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    // Get works
    const worksResult = await client.query('SELECT id, code, name, category FROM works ORDER BY id LIMIT 10');
    console.log('\n=== РАБОТЫ ===');
    worksResult.rows.forEach(w => {
      console.log(`ID: ${w.id}, Код: ${w.code}, Название: ${w.name}, Категория: ${w.category}`);
    });

    // Get materials
    const materialsResult = await client.query('SELECT * FROM materials ORDER BY id LIMIT 3');
    console.log('\n=== МАТЕРИАЛЫ ===');
    materialsResult.rows.forEach(m => {
      console.log(`ID: ${m.id}, Название: ${m.name}`);
      console.log(`  Поля:`, Object.keys(m).join(', '));
    });

    // Get tenant_id from first work
    const tenantResult = await client.query('SELECT tenant_id FROM works LIMIT 1');
    if (tenantResult.rows.length > 0) {
      console.log('\n=== TENANT ID ===');
      console.log(tenantResult.rows[0].tenant_id);
    }

  } catch (error) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkData();
