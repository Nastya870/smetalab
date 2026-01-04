#!/usr/bin/env node

import 'dotenv/config';
import db from '../server/config/database.js';

async function runMigration() {
  console.log('═══════════════════════════════════════');
  console.log('🔧 Миграция: alter db_id to TEXT');
  console.log('═══════════════════════════════════════\n');
  try {
    const migrationPath = new URL('../database/migrations/057_alter_mixedbread_index_state_dbid_text.js', import.meta.url);
    const migration = await import(migrationPath.href);
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
