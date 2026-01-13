import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function checkTables() {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    // 1. Проверка структуры таблиц
    console.log('\n=== ПРОВЕРКА СУЩЕСТВУЮЩИХ ТАБЛИЦ ===\n');

    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('estimates', 'estimate_items', 'estimate_item_materials')
      ORDER BY table_name
    `);

    console.log('📋 Существующие таблицы:');
    tablesResult.rows.forEach(r => console.log(`  - ${r.table_name}`));

    // 2. Структура estimates
    if (tablesResult.rows.some(r => r.table_name === 'estimates')) {
      console.log('\n📊 Структура таблицы ESTIMATES:');
      const estimatesColumns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'estimates'
        ORDER BY ordinal_position
      `);
      estimatesColumns.rows.forEach(r => {
        console.log(`  - ${r.column_name}: ${r.data_type} ${r.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });

      // Проверка данных
      const estimatesCount = await client.query('SELECT COUNT(*) FROM estimates');
      console.log(`  ✅ Записей в таблице: ${estimatesCount.rows[0].count}`);
    }

    // 3. Структура estimate_items
    if (tablesResult.rows.some(r => r.table_name === 'estimate_items')) {
      console.log('\n📊 Структура таблицы ESTIMATE_ITEMS:');
      const itemsColumns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'estimate_items'
        ORDER BY ordinal_position
      `);
      itemsColumns.rows.forEach(r => {
        console.log(`  - ${r.column_name}: ${r.data_type} ${r.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });

      // Проверка данных
      const itemsCount = await client.query('SELECT COUNT(*) FROM estimate_items');
      console.log(`  ✅ Записей в таблице: ${itemsCount.rows[0].count}`);
    }

    // 4. Проверка estimate_item_materials
    if (tablesResult.rows.some(r => r.table_name === 'estimate_item_materials')) {
      console.log('\n✅ Таблица estimate_item_materials уже существует!');
    } else {
      console.log('\n⚠️  Таблица estimate_item_materials НЕ СУЩЕСТВУЕТ - нужно создать');
    }

    // 5. Проверка связей (foreign keys)
    console.log('\n🔗 Проверка внешних ключей:');
    const fkResult = await client.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name IN ('estimates', 'estimate_items')
    `);

    fkResult.rows.forEach(r => {
      console.log(`  - ${r.table_name}.${r.column_name} → ${r.foreign_table_name}.${r.foreign_column_name}`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkTables();
