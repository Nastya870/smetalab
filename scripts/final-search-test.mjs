#!/usr/bin/env node
/**
 * Финальный тест оптимизированного поиска
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function finalTest() {
  console.log('\n🎯 ФИНАЛЬНЫЙ ТЕСТ ОПТИМИЗИРОВАННОГО ПОИСКА\n');
  console.log('='.repeat(60));
  
  const testQuery = 'штукатурка';
  
  try {
    // Оптимизированный вариант
    console.log('\n✅ Тест ОПТИМИЗИРОВАННОГО запроса (LIKE префикс + подстрока)...\n');
    const start = Date.now();
    
    const result = await pool.query(`
      SELECT 
        id, sku, name, supplier,
        CASE 
          WHEN LOWER(sku) = $1 THEN 1
          WHEN LOWER(name) = $1 THEN 2
          WHEN LOWER(sku) LIKE $2 THEN 3
          WHEN LOWER(name) LIKE $2 THEN 4
          ELSE 5
        END as relevance_score
      FROM materials 
      WHERE (
        LOWER(name) LIKE $2 OR
        LOWER(sku) LIKE $2 OR
        LOWER(name) LIKE $3 OR
        LOWER(sku) LIKE $3
      )
      ORDER BY relevance_score, name
      LIMIT 20;
    `, [testQuery.toLowerCase(), `${testQuery.toLowerCase()}%`, `%${testQuery.toLowerCase()}%`]);
    
    const duration = Date.now() - start;
    
    console.log(`   📊 Результаты:`);
    console.log(`   • Найдено: ${result.rows.length}`);
    console.log(`   • ⏱️ Время: ${duration}ms`);
    console.log(`   • ${duration < 200 ? '✅ ОТЛИЧНО' : duration < 500 ? '✅ ХОРОШО' : '❌ МЕДЛЕННО'}`);
    
    if (result.rows.length > 0) {
      console.log(`\n   🔝 Топ результаты:`);
      result.rows.slice(0, 10).forEach((row, i) => {
        console.log(`   ${i + 1}. [${row.sku}] ${row.name} (релевантность: ${row.relevance_score})`);
      });
    }
    
    // EXPLAIN ANALYZE
    console.log('\n📊 EXPLAIN ANALYZE:\n');
    const explainResult = await pool.query(`
      EXPLAIN (ANALYZE, BUFFERS) 
      SELECT * FROM materials 
      WHERE (
        LOWER(name) LIKE $1 OR
        LOWER(sku) LIKE $1 OR
        LOWER(name) LIKE $2 OR
        LOWER(sku) LIKE $2
      )
      LIMIT 20;
    `, [`${testQuery.toLowerCase()}%`, `%${testQuery.toLowerCase()}%`]);
    
    explainResult.rows.forEach(row => {
      console.log(`   ${row['QUERY PLAN']}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ТЕСТ ЗАВЕРШЁН\n');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

finalTest();
