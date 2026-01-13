import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env если есть
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL не установлен!');
    process.exit(1);
}

/**
 * Полный анализ схемы базы данных
 */
async function analyzeDatabaseSchema() {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

    const client = new Client({
        connectionString,
        ssl: isLocalhost ? false : { rejectUnauthorized: false }
    });

    try {
        console.log('\n🔌 Подключение к базе данных...');
        await client.connect();
        console.log('✅ Подключено!\n');

        const report = {
            generatedAt: new Date().toISOString(),
            database: {},
            tables: [],
            functions: [],
            indexes: [],
            foreignKeys: [],
            rlsPolicies: [],
            unusedMigrations: [],
            summary: {}
        };

        // 1. Общая информация о БД
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║          АНАЛИЗ СХЕМЫ БАЗЫ ДАННЫХ                         ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const dbInfo = await client.query(`
      SELECT current_database() as db_name,
             pg_size_pretty(pg_database_size(current_database())) as db_size,
             version() as pg_version
    `);
        report.database = dbInfo.rows[0];
        console.log(`📊 База данных: ${report.database.db_name}`);
        console.log(`📦 Размер: ${report.database.db_size}`);
        console.log(`🐘 PostgreSQL: ${report.database.pg_version.split(',')[0]}\n`);

        // 2. Получаем все таблицы с количеством записей и размером
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📋 ТАБЛИЦЫ');
        console.log('═══════════════════════════════════════════════════════════\n');

        const tablesQuery = await client.query(`
      SELECT 
        t.tablename,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename)::regclass)) as size,
        COALESCE(s.n_live_tup, 0) as row_count,
        obj_description((quote_ident(t.tablename))::regclass, 'pg_class') as description
      FROM pg_tables t
      LEFT JOIN pg_stat_user_tables s ON t.tablename = s.relname
      WHERE t.schemaname = 'public'
      ORDER BY pg_total_relation_size(quote_ident(t.tablename)::regclass) DESC
    `);

        console.log('┌─────────────────────────────────────┬──────────┬───────────┐');
        console.log('│ Таблица                             │ Размер   │ Записей   │');
        console.log('├─────────────────────────────────────┼──────────┼───────────┤');

        for (const table of tablesQuery.rows) {
            const name = table.tablename.padEnd(35);
            const size = table.size.padEnd(8);
            const rows = String(table.row_count).padStart(9);
            console.log(`│ ${name} │ ${size} │ ${rows} │`);

            // Получаем колонки для каждой таблицы
            const columnsQuery = await client.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table.tablename]);

            report.tables.push({
                name: table.tablename,
                size: table.size,
                rowCount: parseInt(table.row_count),
                columns: columnsQuery.rows
            });
        }
        console.log('└─────────────────────────────────────┴──────────┴───────────┘');
        console.log(`\n📊 Всего таблиц: ${tablesQuery.rows.length}\n`);

        // 3. Индексы
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔍 ИНДЕКСЫ');
        console.log('═══════════════════════════════════════════════════════════\n');

        const indexesQuery = await client.query(`
      SELECT
        t.relname as table_name,
        i.relname as index_name,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary,
        pg_size_pretty(pg_relation_size(i.oid)) as size,
        pg_get_indexdef(i.oid) as definition
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.relname, i.relname
    `);

        let currentTable = '';
        for (const idx of indexesQuery.rows) {
            if (idx.table_name !== currentTable) {
                currentTable = idx.table_name;
                console.log(`\n📁 ${currentTable}:`);
            }
            const type = idx.is_primary ? '🔑 PK' : (idx.is_unique ? '🔒 UQ' : '📇 IX');
            console.log(`   ${type} ${idx.index_name} (${idx.size})`);
            report.indexes.push(idx);
        }
        console.log(`\n📊 Всего индексов: ${indexesQuery.rows.length}\n`);

        // 4. Foreign Keys
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔗 ВНЕШНИЕ КЛЮЧИ (Foreign Keys)');
        console.log('═══════════════════════════════════════════════════════════\n');

        const fkQuery = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `);

        for (const fk of fkQuery.rows) {
            console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
            console.log(`      ON DELETE: ${fk.delete_rule}, ON UPDATE: ${fk.update_rule}`);
            report.foreignKeys.push(fk);
        }
        console.log(`\n📊 Всего FK: ${fkQuery.rows.length}\n`);

        // 5. Функции
        console.log('═══════════════════════════════════════════════════════════');
        console.log('⚙️ ФУНКЦИИ');
        console.log('═══════════════════════════════════════════════════════════\n');

        const functionsQuery = await client.query(`
      SELECT 
        p.proname as name,
        pg_get_function_result(p.oid) as return_type,
        pg_get_function_arguments(p.oid) as arguments,
        CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY p.proname
    `);

        for (const fn of functionsQuery.rows) {
            console.log(`   ⚙️ ${fn.name}(${fn.arguments}) → ${fn.return_type}`);
            console.log(`      ${fn.security}`);
            report.functions.push(fn);
        }
        console.log(`\n📊 Всего функций: ${functionsQuery.rows.length}\n`);

        // 6. RLS Политики
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔐 RLS ПОЛИТИКИ');
        console.log('═══════════════════════════════════════════════════════════\n');

        const rlsQuery = await client.query(`
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);

        currentTable = '';
        for (const policy of rlsQuery.rows) {
            if (policy.tablename !== currentTable) {
                currentTable = policy.tablename;
                console.log(`\n📁 ${currentTable}:`);
            }
            console.log(`   🔒 ${policy.policyname} (${policy.cmd})`);
            report.rlsPolicies.push(policy);
        }
        console.log(`\n📊 Всего RLS политик: ${rlsQuery.rows.length}\n`);

        // 7. Сравнение с миграциями
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📂 АНАЛИЗ МИГРАЦИЙ');
        console.log('═══════════════════════════════════════════════════════════\n');

        const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        const tableNames = new Set(report.tables.map(t => t.name));

        console.log('📋 Анализ миграций по типам:\n');

        const migrationAnalysis = migrationFiles.map(file => {
            const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8').toLowerCase();

            // Определяем тип миграции
            let type = 'other';
            if (content.includes('create table')) type = 'create_table';
            else if (content.includes('alter table')) type = 'alter';
            else if (content.includes('create index') || content.includes('create unique index')) type = 'index';
            else if (content.includes('create function') || content.includes('create or replace function')) type = 'function';
            else if (content.includes('create policy')) type = 'rls';
            else if (content.includes('drop ')) type = 'drop';

            // Пытаемся найти связанные таблицы
            const tableMatches = content.match(/(?:create table|alter table|on|from|into)\s+(?:if\s+(?:not\s+)?exists\s+)?(\w+)/gi) || [];
            const relatedTables = [...new Set(tableMatches.map(m => {
                const parts = m.split(/\s+/);
                return parts[parts.length - 1];
            }).filter(t => tableNames.has(t)))];

            return {
                file,
                type,
                relatedTables,
                exists: relatedTables.length > 0 || type === 'function' || type === 'rls'
            };
        });

        // Группируем по типу
        const byType = {};
        for (const m of migrationAnalysis) {
            if (!byType[m.type]) byType[m.type] = [];
            byType[m.type].push(m);
        }

        const typeLabels = {
            create_table: '📦 Создание таблиц',
            alter: '✏️ Изменение таблиц',
            index: '🔍 Индексы',
            function: '⚙️ Функции',
            rls: '🔐 RLS политики',
            drop: '🗑️ Удаление',
            other: '❓ Прочее'
        };

        for (const [type, migrations] of Object.entries(byType)) {
            console.log(`${typeLabels[type] || type} (${migrations.length}):`);
            for (const m of migrations) {
                const tables = m.relatedTables.length ? ` → [${m.relatedTables.join(', ')}]` : '';
                console.log(`   • ${m.file}${tables}`);
            }
            console.log('');
        }

        // 8. Итоговая сводка
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 ИТОГОВАЯ СВОДКА');
        console.log('═══════════════════════════════════════════════════════════\n');

        report.summary = {
            totalTables: report.tables.length,
            totalRows: report.tables.reduce((sum, t) => sum + t.rowCount, 0),
            totalIndexes: report.indexes.length,
            totalForeignKeys: report.foreignKeys.length,
            totalFunctions: report.functions.length,
            totalRlsPolicies: report.rlsPolicies.length,
            migrationFiles: migrationFiles.length
        };

        console.log(`   📋 Таблиц: ${report.summary.totalTables}`);
        console.log(`   📝 Всего записей: ${report.summary.totalRows}`);
        console.log(`   🔍 Индексов: ${report.summary.totalIndexes}`);
        console.log(`   🔗 Foreign Keys: ${report.summary.totalForeignKeys}`);
        console.log(`   ⚙️ Функций: ${report.summary.totalFunctions}`);
        console.log(`   🔐 RLS политик: ${report.summary.totalRlsPolicies}`);
        console.log(`   📂 Файлов миграций: ${report.summary.migrationFiles}`);

        // 9. Детальный вывод таблиц с колонками
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('📋 ДЕТАЛЬНАЯ СТРУКТУРА ТАБЛИЦ');
        console.log('═══════════════════════════════════════════════════════════\n');

        for (const table of report.tables) {
            console.log(`\n┌─ ${table.name} (${table.rowCount} записей, ${table.size})`);
            console.log('├──────────────────────────────────────────────────────────');
            for (const col of table.columns) {
                const nullable = col.is_nullable === 'YES' ? '○' : '●';
                const type = col.character_maximum_length
                    ? `${col.data_type}(${col.character_maximum_length})`
                    : col.data_type;
                const def = col.column_default ? ` = ${col.column_default.substring(0, 30)}...` : '';
                console.log(`│ ${nullable} ${col.column_name.padEnd(25)} ${type}${def}`);
            }
            console.log('└──────────────────────────────────────────────────────────');
        }

        // 10. Сохраняем отчёт в JSON
        const reportPath = path.join(__dirname, '..', 'database', 'SCHEMA_ANALYSIS.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n✅ Полный отчёт сохранён: ${reportPath}\n`);

        return report;

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 Соединение закрыто\n');
    }
}

// Запуск
analyzeDatabaseSchema().catch(err => {
    console.error(err);
    process.exit(1);
});
