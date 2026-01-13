import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function testQuery() {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    console.log('\n🔍 Тест 1: Прямой запрос без WHERE tenant_id');
    const result1 = await client.query(`
      SELECT 
        wm.*,
        m.name as material_name,
        m.sku as material_sku,
        m.unit as material_unit,
        m.price as material_price
      FROM work_materials wm
      JOIN materials m ON wm.material_id = m.id
      WHERE wm.work_id = 3
      ORDER BY wm.is_required DESC, m.name
    `);
    console.log('Результат:', result1.rows);

    console.log('\n🔍 Тест 2: С фильтром tenant_id IS NULL');
    const result2 = await client.query(`
      SELECT 
        wm.*,
        m.name as material_name
      FROM work_materials wm
      JOIN materials m ON wm.material_id = m.id
      WHERE wm.work_id = 3
        AND (wm.tenant_id IS NULL OR wm.tenant_id = $1)
      ORDER BY wm.is_required DESC
    `, [null]);
    console.log('Результат:', result2.rows);

    console.log('\n🔍 Тест 3: Все связи для work_id IN (3,4,5)');
    const result3 = await client.query(`
      SELECT work_id, material_id, consumption
      FROM work_materials
      WHERE work_id IN (3, 4, 5)
    `);
    console.log('Результат:', result3.rows);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testQuery();
