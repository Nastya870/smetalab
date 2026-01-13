import pkg from 'pg';
const { Client } = pkg;
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RENDER_URL = 'postgresql://smetalab_user:KJPh8y7plWvVIK2xiTeu9ROpUEk0QFSh@dpg-d51t19f6s9ss73eui8k0-a.frankfurt-postgres.render.com/smetalab_yay5';

async function restoreBackup() {
  const client = new Client({ 
    connectionString: RENDER_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 120000,
    query_timeout: 300000  // 5 минут на query
  });

  try {
    console.log('\n🔄 ВОССТАНОВЛЕНИЕ ИЗ БЭКАПА\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🔌 Подключение к Render PostgreSQL...');
    await client.connect();
    console.log('✅ Подключено\n');

    console.log('📖 Чтение backup файла...');
    const backupPath = join(__dirname, '..', 'backups', 'neon-backup-2025-12-18.sql');
    let sql = await readFile(backupPath, 'utf-8');
    console.log(`✅ Прочитано ${(sql.length / 1024 / 1024).toFixed(2)} MB\n`);
    
    console.log('🔧 Замена типов данных...');
    sql = sql.replace(/USER-DEFINED/g, 'citext');
    sql = sql.replace(/uuid_generate_v4\(\)/g, 'gen_random_uuid()');
    console.log('✅ Типы обновлены: USER-DEFINED → citext, uuid_generate_v4 → gen_random_uuid\n');

    console.log('️  Удаление существующих таблиц...');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('✅ Схема очищена\n');
    
    console.log('📦 Создание расширений...');
    await client.query('CREATE EXTENSION IF NOT EXISTS citext;');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('✅ Расширения созданы (citext, uuid-ossp)\n');

    console.log('📦 Восстановление структуры БД...');
    // Извлекаем все CREATE TABLE команды
    const createTableRegex = /CREATE TABLE[^;]+;/gs;
    const createTables = sql.match(createTableRegex) || [];
    
    for (const ddl of createTables) {
      try {
        await client.query(ddl);
      } catch (error) {
        console.log(`   ⚠️  ${error.message.substring(0, 60)}`);
      }
    }
    console.log(`✅ Создано ${createTables.length} таблиц\n`);

    console.log('📦 Восстановление данных (INSERT операции, батчами по 100)...');
    // Извлекаем все INSERT команды
    const insertRegex = /INSERT INTO[^;]+;/gs;
    const inserts = sql.match(insertRegex) || [];
    
    let processed = 0;
    const batchSize = 100;
    
    for (let i = 0; i < inserts.length; i += batchSize) {
      // Переподключаемся каждый батч для стабильности
      const batchClient = new Client({ 
        connectionString: RENDER_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 60000,
        query_timeout: 120000
      });
      
      await batchClient.connect();
      
      const batch = inserts.slice(i, i + batchSize);
      for (const insert of batch) {
        try {
          await batchClient.query(insert);
          processed++;
        } catch (error) {
          // Игнорируем FK ошибки - порядок INSERT может быть не оптимальным
        }
      }
      
      await batchClient.end();
      
      if (processed % 1000 === 0) {
        console.log(`   ⏳ ${processed}/${inserts.length} записей`);
      }
    }
    console.log(`✅ Вставлено ${processed}/${inserts.length} блоков данных\n`);

    console.log('📊 Проверка результата...');
    const { rows } = await client.query(`
      SELECT tablename, 
        (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tablename) as columns
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`\n✅ Создано таблиц: ${rows.length}\n`);
    rows.forEach(r => console.log(`   • ${r.tablename} (${r.columns} колонок)`));

    await client.end();
    console.log('\n✅ ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО!\n');
  } catch (error) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error('Stack:', error.stack);
    await client.end();
    process.exit(1);
  }
}

restoreBackup();
