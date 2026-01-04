#!/usr/bin/env node

/**
 * Запуск миграции 056_create_mixedbread_index_state.js
 */

import 'dotenv/config';
import db from '../server/config/database.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('═══════════════════════════════════════');
  console.log('🔧 Миграция: mixedbread_index_state');
  console.log('═══════════════════════════════════════\n');
  
  try {
    // Импортируем миграцию (Windows-compatible URL)
    const migrationPath = new URL('../database/migrations/056_create_mixedbread_index_state.js', import.meta.url);
    const migration = await import(migrationPath.href);
    
    // Запускаем up()
    console.log('▶️  Выполнение миграции...\n');
    await migration.up(db);
    
    console.log('\n═══════════════════════════════════════');
    console.log('✅ Миграция успешно применена!');
    console.log('═══════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n═══════════════════════════════════════');
    console.error('❌ Ошибка миграции:');
    console.error(error.message);
    console.error('═══════════════════════════════════════\n');
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

runMigration();
