import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;

async function applyMigration() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Подключение к базе данных Neon...');
    await client.connect();
    console.log('✅ Подключение установлено\n');

    // Читаем SQL файл миграции
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '040_create_contracts_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Применение миграции 040_create_contracts_table.sql...\n');

    await client.query(sql);

    console.log('✅ Миграция успешно применена!');
    console.log('📊 Таблица contracts создана\n');

    // Проверяем, что таблица создана
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'contracts'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Подтверждение: Таблица contracts существует в БД');
    }

  } catch (error) {
    console.error('❌ Ошибка при применении миграции:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Соединение закрыто');
  }
}

applyMigration();
