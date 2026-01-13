import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function checkLinks() {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT 
        wm.id,
        w.code as work_code,
        w.name as work_name,
        m.name as material_name,
        wm.consumption,
        wm.is_required
      FROM work_materials wm
      JOIN works w ON wm.work_id = w.id
      JOIN materials m ON wm.material_id = m.id
      ORDER BY wm.id
    `);

    console.log('\n=== СВЯЗИ РАБОТА-МАТЕРИАЛ ===\n');
    
    if (result.rows.length === 0) {
      console.log('❌ Связей нет в базе данных!');
      console.log('\n💡 Запустите: node database/migrations/seed-work-materials.js');
    } else {
      result.rows.forEach(r => {
        const required = r.is_required ? 'обязательный' : 'опционально';
        console.log(`${r.work_code} "${r.work_name}"`);
        console.log(`  → "${r.material_name}" (расход: ${r.consumption}, ${required})`);
        console.log('');
      });
      console.log(`✅ Всего связей: ${result.rows.length}`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkLinks();
