import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkMigrationSetup() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('=== ПРОВЕРКА ДЛЯ РЕФАКТОРИНГА ===\n');

    // 1. Таблица учёта миграций
    const tables = await client.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND (tablename LIKE '%migration%' OR tablename LIKE '%schema%' OR tablename = '_prisma_migrations')
  `);
    console.log('Таблица учёта миграций:', tables.rows.length > 0 ? tables.rows.map(r => r.tablename).join(', ') : '❌ НЕТ');

    // 2. FK на suppliers
    const fk = await client.query(`
    SELECT conrelid::regclass as table_from, conname
    FROM pg_constraint
    WHERE contype='f' AND confrelid='public.suppliers'::regclass
  `);
    console.log('FK на suppliers:', fk.rows.length > 0 ? JSON.stringify(fk.rows) : '✅ НЕТ (можно удалять)');

    // 3. Views с suppliers
    const views = await client.query(`
    SELECT schemaname, viewname
    FROM pg_views
    WHERE definition ilike '%suppliers%'
  `);
    console.log('Views с suppliers:', views.rows.length > 0 ? JSON.stringify(views.rows) : '✅ НЕТ');

    // 4. Функции с suppliers
    try {
        const funcs = await client.query(`
      SELECT p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
      AND pg_get_functiondef(p.oid) ilike '%suppliers%'
    `);
        console.log('Функции с suppliers:', funcs.rows.length > 0 ? funcs.rows.map(r => r.proname).join(', ') : '✅ НЕТ');
    } catch (e) {
        console.log('Функции с suppliers: не удалось проверить');
    }

    // 5. Индекс на expires_at в sessions
    const sessionIdx = await client.query(`
    SELECT indexname FROM pg_indexes 
    WHERE tablename = 'sessions' AND indexdef ILIKE '%expires_at%'
  `);
    console.log('Индекс sessions.expires_at:', sessionIdx.rows.length > 0 ? '✅ ' + sessionIdx.rows[0].indexname : '❌ НЕТ (нужен для очистки!)');

    // 6. Индекс на expires_at в email_verification_tokens  
    const emailIdx = await client.query(`
    SELECT indexname FROM pg_indexes 
    WHERE tablename = 'email_verification_tokens' AND indexdef ILIKE '%expires_at%'
  `);
    console.log('Индекс email_tokens.expires_at:', emailIdx.rows.length > 0 ? '✅ ' + emailIdx.rows[0].indexname : '⚠️ НЕТ (небольшая таблица, ок)');

    console.log('\n=== РЕКОМЕНДАЦИИ ===');

    if (tables.rows.length === 0) {
        console.log('• У вас нет таблицы учёта миграций — миграции идемпотентные (IF NOT EXISTS)');
        console.log('• Для baseline: просто добавьте флаг/env переменную "SKIP_BASELINE=1" для существующих БД');
    }

    if (sessionIdx.rows.length === 0) {
        console.log('• НУЖЕН индекс: CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);');
    }

    await client.end();
    console.log('\n✅ Проверка завершена');
}

checkMigrationSetup().catch(console.error);
