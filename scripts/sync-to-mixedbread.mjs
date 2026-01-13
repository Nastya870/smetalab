/**
 * Скрипт для синхронизации данных в Mixedbread Store
 * 
 * Использование: node scripts/sync-to-mixedbread.mjs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env из корня проекта
dotenv.config({ path: join(__dirname, '..', '.env') });

import { exportAllForTenant } from '../server/services/mixedbreadExportService.js';
import { syncDocumentsToStore } from '../server/services/mixedbreadStoreService.js';

const STORE_ID = '10de9689-746d-4a0a-abe6-b2be41052f78';
const TENANT_ID = '4eded664-27ac-4d7f-a9d8-f8340751ceab'; // Ваш tenant ID
const BATCH_SIZE = 50; // Уменьшено для стабильности

console.log('🚀 [Mixedbread Sync] Запуск синхронизации...');
console.log(`📦 Store ID: ${STORE_ID}`);
console.log(`🏢 Tenant ID: ${TENANT_ID}`);
console.log(`📊 Batch Size: ${BATCH_SIZE}`);
console.log('');

try {
  // 1. Экспортируем все документы из БД
  console.log('📤 Шаг 1: Экспорт данных из PostgreSQL...');
  const { materials, works, total } = await exportAllForTenant(TENANT_ID, 500);
  const allDocuments = [...materials, ...works];
  
  console.log(`✅ Экспортировано: ${total} документов`);
  console.log(`   - Материалы: ${materials.length}`);
  console.log(`   - Работы: ${works.length}`);
  console.log('');
  
  // 2. Синхронизируем с Mixedbread
  console.log('🔄 Шаг 2: Отправка в Mixedbread Store...');
  const result = await syncDocumentsToStore(STORE_ID, allDocuments, BATCH_SIZE);
  
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('📊 РЕЗУЛЬТАТ СИНХРОНИЗАЦИИ:');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Успешно: ${result.success ? 'ДА' : 'НЕТ'}`);
  console.log(`📦 Всего документов: ${result.total}`);
  console.log(`✅ Загружено: ${result.uploaded}`);
  console.log(`❌ Ошибок: ${result.failed}`);
  
  if (result.errors && result.errors.length > 0) {
    console.log('');
    console.log('❌ Детали ошибок:');
    result.errors.forEach(err => {
      console.log(`   Батч ${err.batch}: ${err.error}`);
    });
  }
  
  console.log('═══════════════════════════════════════');
  
  if (result.success) {
    console.log('');
    console.log('🎉 Синхронизация завершена успешно!');
    process.exit(0);
  } else {
    console.log('');
    console.log('⚠️ Синхронизация завершена с ошибками');
    process.exit(1);
  }
  
} catch (error) {
  console.error('');
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:');
  console.error(error.message);
  console.error('');
  console.error('Stack trace:');
  console.error(error.stack);
  process.exit(1);
}
