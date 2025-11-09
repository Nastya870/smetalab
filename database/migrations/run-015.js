// =====================================================
// Script: Run migration 015 - Create schedules table
// =====================================================

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Запуск миграции 015_create_schedules_table.sql...');
    
    // Читаем SQL файл
    const migrationPath = path.join(__dirname, '015_create_schedules_table.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📄 Выполнение SQL...');
    await client.query(sql);
    
    console.log('✅ Миграция 015 успешно применена!');
    console.log('📊 Таблица schedules создана с RLS политиками и индексами');
    
    // Проверяем созданную таблицу
    const result = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'schedules' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Структура таблицы schedules:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
