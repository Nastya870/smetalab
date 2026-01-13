/**
 * Script: Apply Migration 053 - Add Weight to Estimate Materials
 * Применяет миграцию добавления полей веса в estimate_item_materials
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Подключение к базе данных...');
    
    // Читаем файл миграции
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '053_add_weight_to_estimate_materials.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Применяем миграцию 053: Добавление полей веса...\n');
    
    // Выполняем миграцию
    await client.query(migrationSQL);
    
    console.log('✅ Миграция 053 успешно применена!\n');
    
    // Проверяем результат
    console.log('🔍 Проверка структуры таблицы estimate_item_materials:');
    const { rows } = await client.query(`
      SELECT column_name, data_type, column_default, is_generated
      FROM information_schema.columns
      WHERE table_name = 'estimate_item_materials'
        AND column_name IN ('weight', 'total_weight')
      ORDER BY ordinal_position;
    `);
    
    console.table(rows);
    
    // Проверяем триггер
    console.log('\n🔍 Проверка триггера copy_material_weight:');
    const { rows: triggers } = await client.query(`
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers
      WHERE trigger_name = 'trigger_copy_material_weight';
    `);
    
    console.table(triggers);
    
    // Проверяем представление
    console.log('\n🔍 Проверка представления v_estimate_materials_with_weight:');
    const { rows: views } = await client.query(`
      SELECT table_name, view_definition
      FROM information_schema.views
      WHERE table_name = 'v_estimate_materials_with_weight';
    `);
    
    if (views.length > 0) {
      console.log('✅ Представление создано');
    }
    
    // Тестовый запрос
    console.log('\n🔍 Пример данных с весом (первые 5 материалов):');
    const { rows: sampleData } = await client.query(`
      SELECT 
        material_name,
        quantity,
        unit,
        weight,
        total_weight,
        total_price
      FROM v_estimate_materials_with_weight
      WHERE weight > 0
      LIMIT 5;
    `);
    
    if (sampleData.length > 0) {
      console.table(sampleData);
    } else {
      console.log('Нет материалов с весом в сметах');
    }
    
    // Статистика по весу
    console.log('\n📊 Статистика по весу материалов:');
    const { rows: stats } = await client.query(`
      SELECT 
        COUNT(*) as total_materials,
        COUNT(CASE WHEN weight > 0 THEN 1 END) as materials_with_weight,
        ROUND(SUM(total_weight)::numeric, 2) as total_weight_kg
      FROM estimate_item_materials;
    `);
    
    console.table(stats);
    
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
