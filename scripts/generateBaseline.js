/**
 * Генерация baseline схемы из существующей БД
 * Аналог pg_dump --schema-only, но через Node.js
 */
import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateBaseline() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('🔌 Подключено к БД\n');

    let schema = `-- =====================================
-- BASELINE SCHEMA - SmetaLab
-- Сгенерировано: ${new Date().toISOString()}
-- 
-- Этот файл содержит полную схему БД
-- Использовать ТОЛЬКО для новых деплоев!
-- =====================================

`;

    // 1. Расширения
    console.log('📦 Получаем расширения...');
    const extensions = await client.query(`
    SELECT extname FROM pg_extension 
    WHERE extname NOT IN ('plpgsql')
  `);

    if (extensions.rows.length > 0) {
        schema += `-- =====================================\n-- РАСШИРЕНИЯ\n-- =====================================\n\n`;
        for (const ext of extensions.rows) {
            schema += `CREATE EXTENSION IF NOT EXISTS "${ext.extname}";\n`;
        }
        schema += '\n';
    }

    // 2. Типы (ENUM и др.)
    console.log('📦 Получаем типы...');
    const types = await client.query(`
    SELECT t.typname, 
           string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as labels
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY t.typname
  `);

    if (types.rows.length > 0) {
        schema += `-- =====================================\n-- ТИПЫ (ENUM)\n-- =====================================\n\n`;
        for (const t of types.rows) {
            schema += `CREATE TYPE ${t.typname} AS ENUM (${t.labels.split(', ').map(l => `'${l}'`).join(', ')});\n`;
        }
        schema += '\n';
    }

    // 3. Таблицы
    console.log('📦 Получаем таблицы...');
    const tables = await client.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `);

    schema += `-- =====================================\n-- ТАБЛИЦЫ\n-- =====================================\n\n`;

    for (const table of tables.rows) {
        const tableName = table.tablename;

        // Получаем колонки
        const columns = await client.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

        schema += `-- ${tableName}\n`;
        schema += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;

        const colDefs = columns.rows.map(col => {
            let type = col.data_type;
            if (col.data_type === 'character varying') {
                type = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR(255)';
            } else if (col.data_type === 'USER-DEFINED') {
                type = col.udt_name;
            } else if (col.data_type === 'ARRAY') {
                type = col.udt_name;
            }

            let def = `  ${col.column_name} ${type}`;
            if (col.is_nullable === 'NO') def += ' NOT NULL';
            if (col.column_default) {
                // Упрощаем default
                let defaultVal = col.column_default;
                if (defaultVal.includes('::')) {
                    defaultVal = defaultVal.split('::')[0];
                }
                def += ` DEFAULT ${defaultVal}`;
            }
            return def;
        });

        schema += colDefs.join(',\n');
        schema += '\n);\n\n';
    }

    // 4. Primary Keys и Unique Constraints
    console.log('📦 Получаем constraints...');
    const constraints = await client.query(`
    SELECT 
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
    ORDER BY tc.table_name
  `);

    schema += `-- =====================================\n-- PRIMARY KEYS & UNIQUE CONSTRAINTS\n-- =====================================\n\n`;

    for (const c of constraints.rows) {
        const type = c.constraint_type === 'PRIMARY KEY' ? 'PRIMARY KEY' : 'UNIQUE';
        schema += `ALTER TABLE ${c.table_name} ADD CONSTRAINT ${c.constraint_name} ${type} (${c.columns});\n`;
    }
    schema += '\n';

    // 5. Foreign Keys
    console.log('📦 Получаем foreign keys...');
    const fks = await client.query(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  `);

    if (fks.rows.length > 0) {
        schema += `-- =====================================\n-- FOREIGN KEYS\n-- =====================================\n\n`;
        for (const fk of fks.rows) {
            let sql = `ALTER TABLE ${fk.table_name} ADD CONSTRAINT ${fk.constraint_name} `;
            sql += `FOREIGN KEY (${fk.column_name}) REFERENCES ${fk.foreign_table_name}(${fk.foreign_column_name})`;
            if (fk.delete_rule !== 'NO ACTION') sql += ` ON DELETE ${fk.delete_rule}`;
            if (fk.update_rule !== 'NO ACTION') sql += ` ON UPDATE ${fk.update_rule}`;
            schema += sql + ';\n';
        }
        schema += '\n';
    }

    // 6. Индексы (не PK/UNIQUE)
    console.log('📦 Получаем индексы...');
    const indexes = await client.query(`
    SELECT indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'public'
      AND indexname NOT IN (
        SELECT constraint_name FROM information_schema.table_constraints 
        WHERE constraint_type IN ('PRIMARY KEY', 'UNIQUE')
      )
    ORDER BY tablename, indexname
  `);

    if (indexes.rows.length > 0) {
        schema += `-- =====================================\n-- ИНДЕКСЫ\n-- =====================================\n\n`;
        for (const idx of indexes.rows) {
            schema += idx.indexdef.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS') + ';\n';
        }
        schema += '\n';
    }

    // 7. Функции (только обычные, не aggregate)
    console.log('📦 Получаем функции...');
    const functions = await client.query(`
    SELECT pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
    ORDER BY p.proname
  `);

    if (functions.rows.length > 0) {
        schema += `-- =====================================\n-- ФУНКЦИИ\n-- =====================================\n\n`;
        for (const fn of functions.rows) {
            schema += fn.def.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION') + ';\n\n';
        }
    }

    // 8. RLS
    console.log('📦 Получаем RLS политики...');

    // Включение RLS на таблицах
    const rlsTables = await client.query(`
    SELECT relname FROM pg_class 
    WHERE relrowsecurity = true 
    AND relnamespace = 'public'::regnamespace
  `);

    if (rlsTables.rows.length > 0) {
        schema += `-- =====================================\n-- ROW LEVEL SECURITY\n-- =====================================\n\n`;
        for (const t of rlsTables.rows) {
            schema += `ALTER TABLE ${t.relname} ENABLE ROW LEVEL SECURITY;\n`;
        }
        schema += '\n';
    }

    // Политики
    const policies = await client.query(`
    SELECT 
      schemaname, tablename, policyname, 
      permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `);

    for (const p of policies.rows) {
        let sql = `CREATE POLICY ${p.policyname} ON ${p.tablename}`;
        sql += ` AS ${p.permissive}`;
        sql += ` FOR ${p.cmd}`;
        sql += ` TO ${p.roles.replace('{', '').replace('}', '')}`;
        if (p.qual) sql += ` USING (${p.qual})`;
        if (p.with_check) sql += ` WITH CHECK (${p.with_check})`;
        schema += sql + ';\n';
    }

    await client.end();

    // Сохраняем
    const outputDir = path.join(__dirname, '..', 'database', 'baseline');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, '001_complete_schema.sql');
    fs.writeFileSync(outputPath, schema);

    console.log(`\n✅ Baseline сохранён: ${outputPath}`);
    console.log(`📊 Размер: ${(schema.length / 1024).toFixed(1)} KB`);
}

generateBaseline().catch(err => {
    console.error('❌ Ошибка:', err);
    process.exit(1);
});
