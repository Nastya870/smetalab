#!/usr/bin/env node
/**
 * Скрипт миграции данных из Neon в Render PostgreSQL
 * 
 * Использование:
 * 1. Установите переменные окружения:
 *    - SOURCE_DATABASE_URL (Neon)
 *    - TARGET_DATABASE_URL (Render)
 * 
 * 2. Запустите: node scripts/migrate-to-render.mjs
 */

import pkg from 'pg';
const { Pool } = pkg;
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// Цвета для консоли
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

async function migrateToRender() {
  console.log('\n' + '='.repeat(60));
  console.log('  🚀 МИГРАЦИЯ БАЗЫ ДАННЫХ: Neon → Render');
  console.log('='.repeat(60) + '\n');

  const SOURCE_URL = process.env.DATABASE_URL; // Neon (текущая)
  const TARGET_URL = process.env.RENDER_DATABASE_URL; // Render (новая)

  if (!SOURCE_URL) {
    log.error('DATABASE_URL (Neon) не установлен в .env');
    process.exit(1);
  }

  if (!TARGET_URL) {
    log.warn('RENDER_DATABASE_URL не установлен.');
    console.log('\n📋 Инструкция:');
    console.log('1. Создайте PostgreSQL на Render Dashboard');
    console.log('2. Скопируйте External Database URL');
    console.log('3. Добавьте в .env: RENDER_DATABASE_URL=postgresql://...');
    console.log('4. Запустите скрипт снова\n');
    process.exit(1);
  }

  const backupFile = path.join(__dirname, '..', `backup_${Date.now()}.sql`);

  try {
    // Шаг 1: Экспорт из Neon
    log.step(1, 'Экспорт данных из Neon...');
    
    // Извлекаем параметры из URL
    const sourceUrl = new URL(SOURCE_URL);
    const sourceHost = sourceUrl.hostname;
    const sourcePort = sourceUrl.port || 5432;
    const sourceDb = sourceUrl.pathname.slice(1).split('?')[0];
    const sourceUser = sourceUrl.username;
    const sourcePass = sourceUrl.password;

    // pg_dump с паролем через PGPASSWORD
    const dumpCmd = `PGPASSWORD="${sourcePass}" pg_dump -h ${sourceHost} -p ${sourcePort} -U ${sourceUser} -d ${sourceDb} --no-owner --no-acl -F p > "${backupFile}"`;
    
    log.info(`Хост: ${sourceHost}`);
    log.info(`База: ${sourceDb}`);
    
    try {
      // На Windows используем другой подход
      if (process.platform === 'win32') {
        // Создаём временный .pgpass файл или используем переменную окружения
        process.env.PGPASSWORD = sourcePass;
        execSync(`pg_dump -h ${sourceHost} -p ${sourcePort} -U ${sourceUser} -d ${sourceDb} --no-owner --no-acl -F p -f "${backupFile}"`, {
          stdio: 'inherit',
          env: { ...process.env, PGPASSWORD: sourcePass }
        });
      } else {
        execSync(dumpCmd, { stdio: 'inherit', shell: '/bin/bash' });
      }
      
      const stats = fs.statSync(backupFile);
      log.success(`Бэкап создан: ${backupFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (err) {
      log.error('pg_dump не найден или ошибка экспорта');
      log.info('Установите PostgreSQL клиент или используйте альтернативный метод');
      
      // Альтернатива: экспорт через Node.js
      log.step('1b', 'Попытка экспорта через Node.js...');
      await exportViaPg(SOURCE_URL, backupFile);
    }

    // Шаг 2: Импорт в Render
    log.step(2, 'Импорт данных в Render PostgreSQL...');
    
    const targetUrl = new URL(TARGET_URL);
    const targetHost = targetUrl.hostname;
    const targetPort = targetUrl.port || 5432;
    const targetDb = targetUrl.pathname.slice(1).split('?')[0];
    const targetUser = targetUrl.username;
    const targetPass = targetUrl.password;

    log.info(`Целевой хост: ${targetHost}`);
    log.info(`Целевая база: ${targetDb}`);

    try {
      if (process.platform === 'win32') {
        process.env.PGPASSWORD = targetPass;
        execSync(`psql -h ${targetHost} -p ${targetPort} -U ${targetUser} -d ${targetDb} -f "${backupFile}"`, {
          stdio: 'inherit',
          env: { ...process.env, PGPASSWORD: targetPass }
        });
      } else {
        const restoreCmd = `PGPASSWORD="${targetPass}" psql -h ${targetHost} -p ${targetPort} -U ${targetUser} -d ${targetDb} < "${backupFile}"`;
        execSync(restoreCmd, { stdio: 'inherit', shell: '/bin/bash' });
      }
      
      log.success('Данные успешно импортированы!');
    } catch (err) {
      log.error('Ошибка импорта: ' + err.message);
      log.info('Попробуйте импортировать вручную через psql или pgAdmin');
    }

    // Шаг 3: Проверка
    log.step(3, 'Проверка данных в Render...');
    
    const targetPool = new Pool({
      connectionString: TARGET_URL,
      ssl: { rejectUnauthorized: false }
    });

    const tables = await targetPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    log.success(`Найдено таблиц: ${tables.rows.length}`);
    tables.rows.forEach(t => console.log(`   - ${t.table_name}`));

    // Проверяем количество записей в ключевых таблицах
    const counts = await targetPool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM works) as works,
        (SELECT COUNT(*) FROM materials) as materials,
        (SELECT COUNT(*) FROM estimates) as estimates
    `);
    
    console.log('\n📊 Количество записей:');
    console.log(`   Users: ${counts.rows[0].users}`);
    console.log(`   Works: ${counts.rows[0].works}`);
    console.log(`   Materials: ${counts.rows[0].materials}`);
    console.log(`   Estimates: ${counts.rows[0].estimates}`);

    await targetPool.end();

    // Шаг 4: Обновление .env
    log.step(4, 'Обновление конфигурации...');
    
    console.log('\n📝 Добавьте в .env для использования Render:');
    console.log(`DATABASE_URL=${TARGET_URL}`);
    console.log('\nИли переименуйте:');
    console.log('DATABASE_URL_NEON=... (старая)');
    console.log('DATABASE_URL=... (Render - новая)');

    // Удаляем временный файл бэкапа
    // fs.unlinkSync(backupFile);
    log.info(`Бэкап сохранён: ${backupFile}`);

    console.log('\n' + '='.repeat(60));
    log.success('МИГРАЦИЯ ЗАВЕРШЕНА!');
    console.log('='.repeat(60) + '\n');

    console.log('Следующие шаги:');
    console.log('1. Обновите DATABASE_URL в .env на Render URL');
    console.log('2. Задеплойте приложение на Render');
    console.log('3. Проверьте работу приложения');
    console.log('4. После успешной проверки можете удалить Neon БД\n');

  } catch (error) {
    log.error('Ошибка миграции: ' + error.message);
    console.error(error);
    process.exit(1);
  }
}

// Альтернативный экспорт через pg (если pg_dump недоступен)
async function exportViaPg(sourceUrl, outputFile) {
  const pool = new Pool({
    connectionString: sourceUrl,
    ssl: { rejectUnauthorized: false }
  });

  // Получаем список таблиц
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  let sql = '-- SmetaLab Database Export\n';
  sql += `-- Date: ${new Date().toISOString()}\n\n`;

  for (const { table_name } of tables.rows) {
    log.info(`Экспорт таблицы: ${table_name}`);
    
    // Получаем данные
    const data = await pool.query(`SELECT * FROM "${table_name}"`);
    
    if (data.rows.length > 0) {
      const columns = Object.keys(data.rows[0]);
      
      for (const row of data.rows) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'number') return val;
          if (typeof val === 'boolean') return val;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        
        sql += `INSERT INTO "${table_name}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
      }
      sql += '\n';
    }
  }

  fs.writeFileSync(outputFile, sql);
  await pool.end();
  
  log.success('Экспорт через Node.js завершён');
}

migrateToRender().catch(console.error);
