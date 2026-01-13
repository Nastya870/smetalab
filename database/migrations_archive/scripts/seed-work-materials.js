import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function createWorkMaterialLinks() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('🚀 Creating work-material links...\n');

    // Get tenant_id (use first non-null or create test data without tenant for now)
    const tenantResult = await client.query('SELECT id FROM tenants LIMIT 1');
    const tenantId = tenantResult.rows[0]?.id || null;

    if (!tenantId) {
      console.log('⚠️  No tenant found, using NULL for tenant_id (will need to fix later)');
    }

    // Отключаем RLS для вставки тестовых данных
    await client.query('ALTER TABLE work_materials DISABLE ROW LEVEL SECURITY');

    // Связь 1: Устройство бетонной подготовки (work_id=3) -> Бетон М300 (material_id=2)
    await client.query(`
      INSERT INTO work_materials (work_id, material_id, consumption, is_required, notes, tenant_id)
      VALUES (3, 2, 1.05, true, 'С учетом потерь', $1)
      ON CONFLICT (work_id, material_id, tenant_id) DO NOTHING
    `, [tenantId]);
    console.log('✅ Связь 1: Бетонная подготовка → Бетон М300 (расход 1.05)');

    // Связь 2: Устройство монолитных фундаментов (work_id=4) -> Бетон М300 (material_id=2)
    await client.query(`
      INSERT INTO work_materials (work_id, material_id, consumption, is_required, notes, tenant_id)
      VALUES (4, 2, 1.02, true, 'Бетон для фундамента', $1)
      ON CONFLICT (work_id, material_id, tenant_id) DO NOTHING
    `, [tenantId]);
    console.log('✅ Связь 2: Монолитные фундаменты → Бетон М300 (расход 1.02)');

    // Связь 3: Кладка стен из кирпича (work_id=5) -> Кирпич керамический (material_id=3)
    await client.query(`
      INSERT INTO work_materials (work_id, material_id, consumption, is_required, notes, tenant_id)
      VALUES (5, 3, 400, true, '400 шт кирпича на 1 м³ кладки', $1)
      ON CONFLICT (work_id, material_id, tenant_id) DO NOTHING
    `, [tenantId]);
    console.log('✅ Связь 3: Кладка стен → Кирпич керамический (расход 400)');

    // Связь 4: Кладка стен из кирпича (work_id=5) -> Блок газобетонный (material_id=4) - альтернатива
    await client.query(`
      INSERT INTO work_materials (work_id, material_id, consumption, is_required, notes, tenant_id)
      VALUES (5, 4, 28, false, 'Альтернатива кирпичу: 28 блоков на 1 м³', $1)
      ON CONFLICT (work_id, material_id, tenant_id) DO NOTHING
    `, [tenantId]);
    console.log('✅ Связь 4: Кладка стен → Блок газобетонный (расход 28, опционально)');

    // Включаем RLS обратно
    await client.query('ALTER TABLE work_materials ENABLE ROW LEVEL SECURITY');

    // Проверяем созданные связи
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

    console.log('\n📊 Созданные связи:');
    result.rows.forEach(row => {
      const required = row.is_required ? '(обязательный)' : '(опциональный)';
      console.log(`${row.work_code} "${row.work_name}" → "${row.material_name}" - расход: ${row.consumption} ${required}`);
    });

    console.log(`\n✅ Всего создано связей: ${result.rows.length}`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createWorkMaterialLinks();
