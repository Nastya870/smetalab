/**
 * Глобальная настройка для интеграционных тестов
 * Применяет миграции к БД перед запуском всех integration тестов
 */

import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Применяет SQL файл к базе данных
 */
async function applySQLFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  console.log(`📄 Применение: ${fileName}`);
  
  try {
    await client.query(sql);
    console.log(`✅ ${fileName}`);
    return true;
  } catch (error) {
    // Игнорируем ошибки типа "already exists" - это нормально для повторных запусков
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate key') ||
        error.message.includes('violates unique constraint')) {
      console.log(`⚠️  ${fileName} (already exists, skipped)`);
      return true;
    }
    
    console.error(`❌ Ошибка в ${fileName}:`, error.message);
    return false;
  }
}

/**
 * Применяет все миграции к тестовой БД
 */
async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('\n🔌 Подключение к БД для миграций...');

    // Пути к миграциям и сидам
    const migrationsDir = path.join(__dirname, '..', '..', 'database', 'migrations');
    const seedsDir = path.join(__dirname, '..', '..', 'database', 'seeds');

    // Получаем список файлов миграций (только .sql)
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Получаем список файлов сидов
    const seedFiles = fs.readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`\n📋 Миграции (${migrationFiles.length}):`);

    // Применяем миграции
    let successCount = 0;
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const success = await applySQLFile(client, filePath);
      if (success) {
        successCount++;
      }
    }

    console.log(`\n🌱 Сиды (${seedFiles.length}):`);
    
    // Применяем сиды
    for (const file of seedFiles) {
      const filePath = path.join(seedsDir, file);
      const success = await applySQLFile(client, filePath);
      if (success) {
        successCount++;
      }
    }

    console.log(`\n✅ Миграции применены: ${successCount}/${migrationFiles.length + seedFiles.length}`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Критическая ошибка миграций:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Запускаем миграции перед всеми integration тестами
export default async function setup() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔧 SETUP: Применение миграций для интеграционных тестов');
  console.log('═'.repeat(60));
  
  await runMigrations();
  
  console.log('\n✅ Setup завершён, начинаем тесты...\n');
}
