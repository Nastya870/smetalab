/**
 * Скрипт для применения композитных индексов к object_parameters
 * 
 * Usage: node database/migrations/add-object-parameters-indexes.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const { Pool } = pg;

// Загрузить .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addIndexes() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Starting index creation...\n');
    
    // Читаем SQL файл
    const sqlPath = join(__dirname, '009_add_composite_indexes.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // Выполняем SQL
    await client.query(sql);
    
    console.log('✅ Composite indexes created successfully!\n');
    
    // Показать список индексов
    const result = await client.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename IN ('object_parameters', 'object_openings')
      ORDER BY tablename, indexname
    `);
    
    console.log('📋 Current indexes:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addIndexes().catch(console.error);
