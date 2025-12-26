#!/usr/bin/env node
/**
 * Применение миграции 052 - оптимизация поиска материалов
 * Создает pg_trgm расширение и GIN индексы
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function applyMigration() {
  console.log('\n🚀 ПРИМЕНЕНИЕ МИГРАЦИИ 052 - ОПТИМИЗАЦИЯ ПОИСКА\n');
  console.log('=' .repeat(60));
  
  try {
    // Читаем файл миграции
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '052_optimize_materials_search.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Файл миграции загружен:', migrationPath);
    console.log('📏 Размер SQL:', migrationSQL.length, 'байт\n');
    
    // Применяем миграцию
    console.log('⏳ Выполнение миграции...\n');
    const result = await pool.query(migrationSQL);
    
    console.log('\n✅ МИГРАЦИЯ УСПЕШНО ПРИМЕНЕНА!\n');
    
    // Проверяем результат
    console.log('🔍 Проверка созданных объектов...\n');
    
    // 1. Проверка расширения
    const extCheck = await pool.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'pg_trgm';
    `);
    
    if (extCheck.rows.length > 0) {
      console.log(`✅ pg_trgm версия ${extCheck.rows[0].extversion}`);
    } else {
      console.log('❌ pg_trgm не найдено!');
    }
    
    // 2. Проверка индексов
    const indexCheck = await pool.query(`
      SELECT 
        indexname,
        pg_size_pretty(pg_total_relation_size(indexname::regclass)) as size
      FROM pg_indexes
      WHERE tablename = 'materials'
        AND indexname LIKE '%trgm%'
      ORDER BY indexname;
    `);
    
    if (indexCheck.rows.length > 0) {
      console.log('\n✅ Созданные индексы:');
      indexCheck.rows.forEach(row => {
        console.log(`   • ${row.indexname}: ${row.size}`);
      });
    } else {
      console.log('\n❌ Индексы не созданы!');
    }
    
    // 3. Тестовый поиск
    console.log('\n🧪 Тестовый поиск...');
    const testStart = Date.now();
    const testResult = await pool.query(`
      SELECT COUNT(*) 
      FROM materials 
      WHERE LOWER(name) % 'цемент';
    `);
    const testDuration = Date.now() - testStart;
    
    console.log(`   Найдено материалов: ${testResult.rows[0].count}`);
    console.log(`   ⏱️ Время: ${testDuration}ms`);
    
    if (testDuration < 100) {
      console.log(`   ✅ Производительность отличная! (<100ms)`);
    } else if (testDuration < 500) {
      console.log(`   ✅ Производительность хорошая (<500ms)`);
    } else {
      console.log(`   ⚠️ Производительность ниже ожидаемой (>500ms)`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ВСЕ ГОТОВО! Поиск материалов оптимизирован.\n');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ПРИ ПРИМЕНЕНИИ МИГРАЦИИ:\n');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
