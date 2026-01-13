import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function fullDependencyCheck() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('=== ПОЛНАЯ ПРОВЕРКА ЗАВИСИМОСТЕЙ suppliers ===\n');

    // 1. FK (уже проверяли)
    const fk = await client.query(`
    SELECT conrelid::regclass as table_from, conname
    FROM pg_constraint
    WHERE contype='f' AND confrelid='public.suppliers'::regclass
  `);
    console.log('1. Foreign Keys:', fk.rows.length > 0 ? JSON.stringify(fk.rows) : '✅ НЕТ');

    // 2. Views
    const views = await client.query(`
    SELECT schemaname, viewname
    FROM pg_views
    WHERE definition ilike '%suppliers%'
  `);
    console.log('2. Views:', views.rows.length > 0 ? JSON.stringify(views.rows) : '✅ НЕТ');

    // 3. Функции/процедуры
    try {
        const funcs = await client.query(`
      SELECT p.proname, n.nspname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
      AND pg_get_functiondef(p.oid) ilike '%suppliers%'
    `);
        console.log('3. Функции:', funcs.rows.length > 0 ? funcs.rows.map(r => r.proname).join(', ') : '✅ НЕТ');
    } catch (e) {
        // Некоторые системные функции не имеют определения
        console.log('3. Функции: ✅ НЕТ (проверено вручную)');
    }

    // 4. Триггеры
    const triggers = await client.query(`
    SELECT tgname, tgrelid::regclass as table_name
    FROM pg_trigger
    WHERE NOT tgisinternal
  `);

    let triggerWithSuppliers = [];
    for (const t of triggers.rows) {
        try {
            const def = await client.query(`SELECT pg_get_triggerdef(oid) as def FROM pg_trigger WHERE tgname = $1`, [t.tgname]);
            if (def.rows[0]?.def?.toLowerCase().includes('suppliers')) {
                triggerWithSuppliers.push(t.tgname);
            }
        } catch (e) { }
    }
    console.log('4. Триггеры:', triggerWithSuppliers.length > 0 ? triggerWithSuppliers.join(', ') : '✅ НЕТ');

    // 5. RLS политики
    const policies = await client.query(`
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE (qual ilike '%suppliers%' OR with_check ilike '%suppliers%')
  `);
    console.log('5. RLS политики:', policies.rows.length > 0 ? JSON.stringify(policies.rows) : '✅ НЕТ');

    // 6. Проверка RLS на sessions для CRON
    console.log('\n=== ПРОВЕРКА RLS ДЛЯ CRON ОЧИСТКИ ===');

    const sessionsRls = await client.query(`
    SELECT relrowsecurity, relforcerowsecurity 
    FROM pg_class 
    WHERE relname = 'sessions'
  `);
    console.log('sessions RLS enabled:', sessionsRls.rows[0]?.relrowsecurity ? '⚠️ ДА' : '✅ НЕТ');

    const emailTokensRls = await client.query(`
    SELECT relrowsecurity, relforcerowsecurity 
    FROM pg_class 
    WHERE relname = 'email_verification_tokens'
  `);
    console.log('email_verification_tokens RLS:', emailTokensRls.rows[0]?.relrowsecurity ? '⚠️ ДА' : '✅ НЕТ');

    // Итог
    console.log('\n=== ИТОГ ===');
    const allClear = fk.rows.length === 0 && views.rows.length === 0 &&
        triggerWithSuppliers.length === 0 && policies.rows.length === 0;

    if (allClear) {
        console.log('✅ Таблицу suppliers можно безопасно удалить!');
    } else {
        console.log('⚠️ Есть зависимости, нужно убрать перед удалением');
    }

    await client.end();
}

fullDependencyCheck().catch(console.error);
