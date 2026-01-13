import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function verifyMigrations() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('=== ПРОВЕРКА МИГРАЦИЙ ===\n');

    // 1. schema_version
    const sv = await client.query('SELECT * FROM schema_version ORDER BY id');
    console.log('📋 schema_version:');
    sv.rows.forEach(r => console.log('  ', r.id, '-', r.description));

    // 2. suppliers удалена?
    const suppliers = await client.query(`
    SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'suppliers') as exists
  `);
    console.log('\n❌ suppliers существует:', suppliers.rows[0].exists ? 'ДА (ошибка!)' : '✅ НЕТ (удалена)');

    // 3. Сессии
    const sessions = await client.query('SELECT COUNT(*) as cnt FROM sessions');
    console.log('📊 Сессий осталось:', sessions.rows[0].cnt);

    // 4. Количество таблиц
    const tables = await client.query(`
    SELECT COUNT(*) as cnt FROM pg_tables WHERE schemaname = 'public'
  `);
    console.log('📊 Таблиц всего:', tables.rows[0].cnt);

    await client.end();
    console.log('\n✅ Проверка завершена');
}

verifyMigrations().catch(console.error);
