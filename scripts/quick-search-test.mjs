#!/usr/bin/env node
/**
 * Быстрый тест производительности поиска материалов
 * Проверяет разные варианты запросов и измеряет время
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function quickTest() {
  console.log('\n⚡ БЫСТРЫЙ ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ ПОИСКА\n');
  console.log('='.repeat(60));
  
  const testQuery = 'штукатурка';
  
  try {
    // Вариант 1: LIKE %query%
    console.log('\n1️⃣ Тест LIKE %query%...');
    let start = Date.now();
    let result = await pool.query(`
      SELECT COUNT(*) FROM materials 
      WHERE LOWER(name) LIKE '%' || LOWER($1) || '%';
    `, [testQuery]);
    let duration = Date.now() - start;
    console.log(`   Результатов: ${result.rows[0].count}, Время: ${duration}ms`);
    
    // Вариант 2: similarity > 0.15
    console.log('\n2️⃣ Тест similarity > 0.15...');
    start = Date.now();
    result = await pool.query(`
      SELECT COUNT(*) FROM materials 
      WHERE similarity(LOWER(name), LOWER($1)) > 0.15;
    `, [testQuery]);
    duration = Date.now() - start;
    console.log(`   Результатов: ${result.rows[0].count}, Время: ${duration}ms`);
    
    // Вариант 3: LIKE query% (префикс)
    console.log('\n3️⃣ Тест LIKE query% (префикс)...');
    start = Date.now();
    result = await pool.query(`
      SELECT COUNT(*) FROM materials 
      WHERE LOWER(name) LIKE LOWER($1) || '%';
    `, [testQuery]);
    duration = Date.now() - start;
    console.log(`   Результатов: ${result.rows[0].count}, Время: ${duration}ms`);
    
    // Вариант 4: Комбинированный (текущий)
    console.log('\n4️⃣ Тест комбинированный (similarity OR LIKE)...');
    start = Date.now();
    result = await pool.query(`
      SELECT COUNT(*) FROM materials 
      WHERE (
        similarity(LOWER(name), $1) > 0.15 OR
        similarity(LOWER(sku), $1) > 0.15 OR
        LOWER(name) LIKE $2 OR
        LOWER(sku) LIKE $2
      );
    `, [testQuery.toLowerCase(), `${testQuery.toLowerCase()}%`]);
    duration = Date.now() - start;
    console.log(`   Результатов: ${result.rows[0].count}, Время: ${duration}ms`);
    
    // Вариант 5: Только LIKE префикс (самый быстрый?)
    console.log('\n5️⃣ Тест ТОЛЬКО LIKE префикс...');
    start = Date.now();
    result = await pool.query(`
      SELECT COUNT(*) FROM materials 
      WHERE LOWER(name) LIKE $1 OR LOWER(sku) LIKE $1;
    `, [`${testQuery.toLowerCase()}%`]);
    duration = Date.now() - start;
    console.log(`   Результатов: ${result.rows[0].count}, Время: ${duration}ms`);
    
    // EXPLAIN ANALYZE для варианта 4
    console.log('\n📊 EXPLAIN ANALYZE для комбинированного запроса:\n');
    const explainResult = await pool.query(`
      EXPLAIN (ANALYZE, BUFFERS) 
      SELECT * FROM materials 
      WHERE (
        similarity(LOWER(name), $1) > 0.15 OR
        similarity(LOWER(sku), $1) > 0.15 OR
        LOWER(name) LIKE $2 OR
        LOWER(sku) LIKE $2
      )
      LIMIT 10;
    `, [testQuery.toLowerCase(), `${testQuery.toLowerCase()}%`]);
    
    explainResult.rows.forEach(row => {
      console.log(`   ${row['QUERY PLAN']}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ТЕСТ ЗАВЕРШЁН\n');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
  } finally {
    await pool.end();
  }
}

quickTest();
