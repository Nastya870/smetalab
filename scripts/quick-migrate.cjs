const { Pool } = require('pg');

const SOURCE_URL = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const TARGET_URL = 'postgresql://smetalab_user:UZV4Nl6X5knU15Z9Ce8Lmx2cWZZSq27J@dpg-d4soiv4cjiac739o2is0-a.frankfurt-postgres.render.com:5432/smetalab';

const source = new Pool({ connectionString: SOURCE_URL, ssl: { rejectUnauthorized: false } });
const target = new Pool({ connectionString: TARGET_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  console.log('🚀 Начинаю миграцию Neon → Render...\n');

  // 1. Получаем структуру таблиц из Neon
  const { rows: tables } = await source.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  console.log(`📋 Найдено таблиц: ${tables.length}`);
  console.log(tables.map(t => t.table_name).join(', '));
  
  // 2. Получаем полный DDL
  console.log('\n📦 Экспортирую структуру...');
  
  const { rows: columns } = await source.query(`
    SELECT 
      c.table_name,
      c.column_name,
      c.data_type,
      c.character_maximum_length,
      c.column_default,
      c.is_nullable,
      c.udt_name
    FROM information_schema.columns c
    JOIN information_schema.tables t ON c.table_name = t.table_name
    WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_name, c.ordinal_position
  `);

  // 3. Получаем constraints
  const { rows: constraints } = await source.query(`
    SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
  `);

  // 4. Создаём таблицы в Render
  console.log('\n🔨 Создаю таблицы в Render...');
  
  // Группируем колонки по таблицам
  const tableColumns = {};
  columns.forEach(col => {
    if (!tableColumns[col.table_name]) tableColumns[col.table_name] = [];
    tableColumns[col.table_name].push(col);
  });

  // Группируем constraints
  const tablePKs = {};
  constraints.forEach(c => {
    if (c.constraint_type === 'PRIMARY KEY') {
      tablePKs[c.table_name] = c.column_name;
    }
  });

  // Порядок создания (учитываем FK)
  const createOrder = [
    'tenants', 'users', 'roles', 'permissions', 'role_permissions', 'user_roles',
    'user_tenants', 'counterparties', 'objects', 'estimates', 'works', 'materials',
    'estimate_works', 'estimate_materials', 'work_materials', 'purchases',
    'purchase_items', 'suppliers', 'templates', 'template_works', 'template_materials'
  ];
  
  // Добавляем остальные таблицы
  const allTables = tables.map(t => t.table_name);
  const orderedTables = [...createOrder.filter(t => allTables.includes(t))];
  allTables.forEach(t => { if (!orderedTables.includes(t)) orderedTables.push(t); });

  for (const tableName of orderedTables) {
    const cols = tableColumns[tableName];
    if (!cols) continue;

    const colDefs = cols.map(col => {
      let type = col.udt_name;
      if (type === 'varchar' && col.character_maximum_length) {
        type = `varchar(${col.character_maximum_length})`;
      } else if (type === 'int4') type = 'integer';
      else if (type === 'int8') type = 'bigint';
      else if (type === 'float8') type = 'double precision';
      else if (type === 'bool') type = 'boolean';
      else if (type === 'timestamptz') type = 'timestamp with time zone';
      
      let def = `"${col.column_name}" ${type}`;
      if (col.column_default) def += ` DEFAULT ${col.column_default}`;
      if (col.is_nullable === 'NO') def += ' NOT NULL';
      return def;
    });

    const pk = tablePKs[tableName];
    if (pk) colDefs.push(`PRIMARY KEY ("${pk}")`);

    const createSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${colDefs.join(',\n  ')}\n)`;
    
    try {
      await target.query(createSQL);
      console.log(`  ✓ ${tableName}`);
    } catch (err) {
      console.log(`  ✗ ${tableName}: ${err.message}`);
    }
  }

  // 5. Копируем данные
  console.log('\n📊 Копирую данные...');
  
  for (const tableName of orderedTables) {
    try {
      const { rows, rowCount } = await source.query(`SELECT * FROM "${tableName}"`);
      
      if (rowCount === 0) {
        console.log(`  - ${tableName}: пусто`);
        continue;
      }

      // Очищаем таблицу
      await target.query(`TRUNCATE "${tableName}" CASCADE`);
      
      // Вставляем данные пачками
      const cols = Object.keys(rows[0]);
      const batchSize = 100;
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const values = batch.map((row, idx) => {
          const vals = cols.map((col, colIdx) => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'boolean') return val ? 'true' : 'false';
            if (typeof val === 'number') return val;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return `'${String(val).replace(/'/g, "''")}'`;
          });
          return `(${vals.join(', ')})`;
        });
        
        const insertSQL = `INSERT INTO "${tableName}" ("${cols.join('", "')}") VALUES ${values.join(', ')} ON CONFLICT DO NOTHING`;
        await target.query(insertSQL);
      }
      
      console.log(`  ✓ ${tableName}: ${rowCount} записей`);
    } catch (err) {
      console.log(`  ✗ ${tableName}: ${err.message.slice(0, 50)}`);
    }
  }

  // 6. Сбрасываем sequences
  console.log('\n🔄 Обновляю sequences...');
  
  for (const tableName of orderedTables) {
    try {
      await target.query(`
        SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), 
          COALESCE((SELECT MAX(id) FROM "${tableName}"), 1))
      `);
    } catch (e) { /* ignore */ }
  }

  console.log('\n✅ Миграция завершена!');
  
  // Проверка
  const { rows: check } = await target.query(`
    SELECT 
      (SELECT COUNT(*) FROM users) as users,
      (SELECT COUNT(*) FROM works) as works,
      (SELECT COUNT(*) FROM materials) as materials,
      (SELECT COUNT(*) FROM estimates) as estimates
  `);
  console.log('\n📈 Проверка данных в Render:');
  console.log(`   Users: ${check[0].users}, Works: ${check[0].works}, Materials: ${check[0].materials}, Estimates: ${check[0].estimates}`);

  await source.end();
  await target.end();
}

migrate().catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
