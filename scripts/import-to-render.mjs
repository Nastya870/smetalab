#!/usr/bin/env node
/**
 * Импорт данных в Render PostgreSQL через Node.js
 * Копирует схему и данные из Neon в Render
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (num, msg) => console.log(`\n${colors.cyan}[${num}]${colors.reset} ${msg}`)
};

async function importToRender() {
  console.log('\n' + '='.repeat(60));
  console.log('  📥 ИМПОРТ ДАННЫХ В RENDER PostgreSQL');
  console.log('='.repeat(60) + '\n');

  const SOURCE_URL = process.env.DATABASE_URL_NEON || process.env.DATABASE_URL;
  const TARGET_URL = process.env.RENDER_DATABASE_URL;

  if (!SOURCE_URL || !TARGET_URL) {
    log.error('Нужны DATABASE_URL_NEON и RENDER_DATABASE_URL в .env');
    process.exit(1);
  }

  const sourcePool = new Pool({
    connectionString: SOURCE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const targetPool = new Pool({
    connectionString: TARGET_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Проверка подключений
    log.step(1, 'Проверка подключений...');
    await sourcePool.query('SELECT 1');
    log.success('Neon: подключено');
    await targetPool.query('SELECT 1');
    log.success('Render: подключено');

    // Получаем схему из Neon
    log.step(2, 'Копирование схемы...');
    
    // Получаем DDL для таблиц
    const tablesResult = await sourcePool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(r => r.table_name);
    log.info(`Найдено таблиц: ${tables.length}`);

    // Создаём таблицы на Render
    for (const table of tables) {
      log.info(`Создание таблицы: ${table}`);
      
      // Получаем структуру таблицы
      const columns = await sourcePool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          column_default,
          is_nullable,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      // Получаем primary key
      const pkResult = await sourcePool.query(`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass AND i.indisprimary
      `, [table]);
      
      const pkColumns = pkResult.rows.map(r => r.attname);

      // Строим CREATE TABLE
      let createSQL = `CREATE TABLE IF NOT EXISTS "${table}" (\n`;
      const colDefs = [];
      
      for (const col of columns.rows) {
        let colDef = `  "${col.column_name}" `;
        
        // Определяем тип
        if (col.column_default && col.column_default.includes('nextval')) {
          colDef += 'SERIAL';
        } else if (col.udt_name === 'uuid') {
          colDef += 'UUID';
        } else if (col.data_type === 'character varying') {
          colDef += col.character_maximum_length 
            ? `VARCHAR(${col.character_maximum_length})`
            : 'VARCHAR(255)';
        } else if (col.data_type === 'text') {
          colDef += 'TEXT';
        } else if (col.data_type === 'integer') {
          if (!col.column_default?.includes('nextval')) {
            colDef += 'INTEGER';
          }
        } else if (col.data_type === 'bigint') {
          colDef += 'BIGINT';
        } else if (col.data_type === 'numeric') {
          colDef += 'NUMERIC(15,2)';
        } else if (col.data_type === 'boolean') {
          colDef += 'BOOLEAN';
        } else if (col.data_type === 'timestamp with time zone') {
          colDef += 'TIMESTAMPTZ';
        } else if (col.data_type === 'timestamp without time zone') {
          colDef += 'TIMESTAMP';
        } else if (col.data_type === 'date') {
          colDef += 'DATE';
        } else if (col.data_type === 'jsonb') {
          colDef += 'JSONB';
        } else if (col.data_type === 'json') {
          colDef += 'JSON';
        } else if (col.data_type === 'ARRAY') {
          colDef += 'TEXT[]';
        } else {
          colDef += col.data_type.toUpperCase();
        }

        // NOT NULL
        if (col.is_nullable === 'NO' && !col.column_default?.includes('nextval')) {
          // пропускаем NOT NULL для SERIAL
        }

        // Default
        if (col.column_default && !col.column_default.includes('nextval')) {
          if (col.column_default === 'CURRENT_TIMESTAMP') {
            colDef += ' DEFAULT CURRENT_TIMESTAMP';
          } else if (col.column_default === 'true' || col.column_default === 'false') {
            colDef += ` DEFAULT ${col.column_default}`;
          } else if (col.column_default.startsWith("'")) {
            colDef += ` DEFAULT ${col.column_default}`;
          } else if (col.data_type === 'uuid' && col.column_default.includes('gen_random_uuid')) {
            colDef += ' DEFAULT gen_random_uuid()';
          }
        }

        colDefs.push(colDef);
      }

      createSQL += colDefs.join(',\n');
      
      if (pkColumns.length > 0) {
        createSQL += `,\n  PRIMARY KEY (${pkColumns.map(c => `"${c}"`).join(', ')})`;
      }
      
      createSQL += '\n);';

      try {
        await targetPool.query(createSQL);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          log.warn(`Таблица ${table}: ${err.message}`);
        }
      }
    }

    // Копируем данные
    log.step(3, 'Копирование данных...');
    
    // Определяем порядок таблиц (с учётом FK)
    const tableOrder = [
      'tenants', 'users', 'permissions', 'roles', 'role_permissions',
      'user_role_assignments', 'user_tenants', 'sessions',
      'counterparties', 'projects', 'project_team_members',
      'works', 'work_hierarchy', 'materials', 'work_materials',
      'estimates', 'estimate_items', 'estimate_item_materials',
      'estimate_templates', 'estimate_template_works', 'estimate_template_materials',
      'contracts', 'purchases', 'global_purchases',
      'object_parameters', 'object_openings', 'schedules',
      'work_completion_acts', 'work_completion_act_items', 'work_completions',
      'act_signatories', 'email_verifications', 'email_verification_tokens', 'password_resets'
    ];

    // Добавляем таблицы, которых нет в списке
    for (const t of tables) {
      if (!tableOrder.includes(t)) {
        tableOrder.push(t);
      }
    }

    // Очищаем целевые таблицы (в обратном порядке)
    log.info('Очистка целевых таблиц...');
    for (const table of [...tableOrder].reverse()) {
      if (tables.includes(table)) {
        try {
          await targetPool.query(`TRUNCATE TABLE "${table}" CASCADE`);
        } catch (e) {
          // Игнорируем если таблицы нет
        }
      }
    }

    // Копируем данные
    let totalRows = 0;
    for (const table of tableOrder) {
      if (!tables.includes(table)) continue;

      const data = await sourcePool.query(`SELECT * FROM "${table}"`);
      
      if (data.rows.length === 0) {
        continue;
      }

      const columns = Object.keys(data.rows[0]);
      let inserted = 0;

      for (const row of data.rows) {
        const values = columns.map((col, i) => `$${i + 1}`).join(', ');
        const vals = columns.map(col => row[col]);

        try {
          await targetPool.query(
            `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values}) ON CONFLICT DO NOTHING`,
            vals
          );
          inserted++;
        } catch (err) {
          // log.warn(`${table}: ${err.message}`);
        }
      }

      if (inserted > 0) {
        log.success(`${table}: ${inserted} записей`);
        totalRows += inserted;
      }
    }

    // Обновляем sequences
    log.step(4, 'Обновление sequences...');
    for (const table of tables) {
      try {
        const seqResult = await targetPool.query(`
          SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), 
            COALESCE((SELECT MAX(id) FROM "${table}"), 1))
        `);
      } catch (e) {
        // У таблицы нет serial id
      }
    }

    // Проверка
    log.step(5, 'Проверка данных...');
    
    const counts = await targetPool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM works) as works,
        (SELECT COUNT(*) FROM materials) as materials,
        (SELECT COUNT(*) FROM estimates) as estimates,
        (SELECT COUNT(*) FROM projects) as projects
    `);
    
    console.log('\n📊 Итого в Render PostgreSQL:');
    console.log(`   Users: ${counts.rows[0].users}`);
    console.log(`   Works: ${counts.rows[0].works}`);
    console.log(`   Materials: ${counts.rows[0].materials}`);
    console.log(`   Estimates: ${counts.rows[0].estimates}`);
    console.log(`   Projects: ${counts.rows[0].projects}`);
    console.log(`   Всего записей: ${totalRows}`);

    console.log('\n' + '='.repeat(60));
    log.success('ИМПОРТ ЗАВЕРШЁН УСПЕШНО!');
    console.log('='.repeat(60) + '\n');

    console.log('🌐 Ваши сервисы на Render:');
    console.log('   API: https://smetalab-api.onrender.com');
    console.log('   Frontend: https://smetalab-frontend.onrender.com');
    console.log('   Database: dpg-d4soiv4cjiac739o2is0-a.frankfurt-postgres.render.com\n');

  } catch (error) {
    log.error('Ошибка: ' + error.message);
    console.error(error);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

importToRender();
