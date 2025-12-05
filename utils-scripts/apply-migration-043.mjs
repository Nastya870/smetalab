#!/usr/bin/env node
/**
 * Скрипт для применения миграции 043: создание таблиц шаблонов смет
 * 
 * Применяет миграцию для создания:
 * - estimate_templates (шаблоны смет)
 * - estimate_template_works (работы в шаблонах)
 * - estimate_template_materials (материалы в шаблонах)
 * 
 * Запуск: node apply-migration-043.mjs
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройки подключения к базе данных
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function applyMigration() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Подключение к базе данных...');
    await client.connect();
    console.log('✅ Подключение установлено');

    // Читаем файл миграции
    const migrationPath = path.join(__dirname, '../database/migrations/043_create_estimate_templates.sql');
    console.log(`📖 Чтение файла миграции: ${migrationPath}`);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Применение миграции 043...');
    await client.query(migrationSQL);
    console.log('✅ Миграция 043 успешно применена!');

    // Проверяем созданные таблицы
    console.log('\n🔍 Проверка созданных таблиц...');
    
    const checkTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('estimate_templates', 'estimate_template_works', 'estimate_template_materials')
      ORDER BY table_name;
    `;
    
    const result = await client.query(checkTablesQuery);
    
    if (result.rows.length === 3) {
      console.log('✅ Все таблицы успешно созданы:');
      result.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('⚠️  Найдено таблиц:', result.rows.length, 'из 3 ожидаемых');
    }

    // Проверяем индексы
    console.log('\n🔍 Проверка индексов...');
    const checkIndexesQuery = `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('estimate_templates', 'estimate_template_works', 'estimate_template_materials')
      ORDER BY indexname;
    `;
    
    const indexResult = await client.query(checkIndexesQuery);
    console.log(`✅ Создано индексов: ${indexResult.rows.length}`);
    indexResult.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });

  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error.message);
    console.error('Детали:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Соединение с базой данных закрыто');
  }
}

// Запуск миграции
applyMigration();
