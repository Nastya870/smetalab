/**
 * Скрипт для выполнения миграции 014
 * Добавление work_id в estimate_items
 */

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройки подключения к Neon Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration 014...');
    
    // Читаем SQL-файл
    const sqlPath = path.join(__dirname, '014_add_work_id_to_estimate_items.sql');
    const sql = await fs.readFile(sqlPath, 'utf-8');
    
    // Выполняем миграцию
    await client.query(sql);
    
    console.log('✅ Migration 014 completed successfully!');
    console.log('📋 Added work_id column to estimate_items table');
    
  } catch (error) {
    console.error('❌ Migration 014 failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Запуск
runMigration()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
