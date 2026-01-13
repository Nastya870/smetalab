/**
 * Применение миграции 055: Исправление numeric overflow в materials
 * БЕЗОПАСНАЯ ОПЕРАЦИЯ: Только увеличение precision, данные не изменяются
 */

import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Подключение к БД...');
    
    // Проверяем текущую precision
    const currentPrecision = await client.query(`
      SELECT 
        column_name,
        data_type,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'materials' AND column_name = 'price'
    `);
    
    console.log('📊 Текущая структура price:', currentPrecision.rows[0]);
    
    if (currentPrecision.rows[0]?.numeric_precision === 12) {
      console.log('✅ Migration 055 уже применена (precision = 12)');
      return;
    }
    
    // Читаем миграцию
    const migrationPath = join(__dirname, '..', 'database', 'migrations', '055_fix_materials_numeric_precision.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Применение migration 055...');
    
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Migration 055 применена успешно!');
    
    // Проверяем новую precision
    const newPrecision = await client.query(`
      SELECT 
        column_name,
        data_type,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'materials' AND column_name = 'price'
    `);
    
    console.log('📊 Новая структура price:', newPrecision.rows[0]);
    
    // Проверяем, что данные не потеряны
    const dataCheck = await client.query(`
      SELECT 
        COUNT(*) as total_count,
        COUNT(price) as price_count,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM materials
    `);
    
    console.log('📈 Проверка данных:', dataCheck.rows[0]);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration().catch(console.error);
