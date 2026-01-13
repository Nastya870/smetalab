import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function compareSchemaObjects() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('=== СРАВНЕНИЕ ОБЪЕКТОВ СХЕМЫ ===\n');
    console.log('Это текущее состояние ПРОДА.\n');

    // 1. Таблицы
    const tables = await client.query(`
    SELECT COUNT(*) as cnt FROM pg_tables WHERE schemaname = 'public'
  `);
    console.log(`📋 Таблиц: ${tables.rows[0].cnt}`);

    // 2. Индексы
    const indexes = await client.query(`
    SELECT COUNT(*) as cnt FROM pg_indexes WHERE schemaname = 'public'
  `);
    console.log(`🔍 Индексов: ${indexes.rows[0].cnt}`);

    // 3. RLS политики
    const policies = await client.query(`
    SELECT COUNT(*) as cnt FROM pg_policies WHERE schemaname = 'public'
  `);
    console.log(`🔐 RLS политик: ${policies.rows[0].cnt}`);

    // 4. Функции
    const functions = await client.query(`
    SELECT COUNT(*) as cnt 
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  `);
    console.log(`⚙️ Функций: ${functions.rows[0].cnt}`);

    // 5. Constraints
    const constraints = await client.query(`
    SELECT COUNT(*) as cnt 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public'
  `);
    console.log(`🔗 Constraints: ${constraints.rows[0].cnt}`);

    // 6. Проверка suppliers
    const suppliers = await client.query(`
    SELECT to_regclass('public.suppliers') IS NULL as dropped
  `);
    console.log(`\n🗑️ suppliers удалена: ${suppliers.rows[0].dropped ? '✅ ДА' : '❌ НЕТ'}`);

    // 7. schema_version
    const sv = await client.query('SELECT * FROM schema_version ORDER BY id');
    console.log('\n📊 schema_version:');
    sv.rows.forEach(r => console.log(`   ${r.id}: ${r.description}`));

    await client.end();
    console.log('\n✅ Проверка завершена');
}

compareSchemaObjects().catch(console.error);
