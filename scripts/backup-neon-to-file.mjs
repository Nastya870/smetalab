import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const NEON_URL = process.env.DATABASE_URL_NEON || process.env.DATABASE_URL;

if (!NEON_URL) {
  console.error('❌ Ошибка: DATABASE_URL_NEON не установлен');
  process.exit(1);
}

console.log('\n💾 BACKUP Neon PostgreSQL → Файл\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function backupToFile() {
  const client = new Client({ connectionString: NEON_URL });
  
  try {
    await client.connect();
    console.log('✅ Подключено к Neon PostgreSQL\n');

    // Создаем директорию для бэкапов
    const backupDir = join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const backupFile = join(backupDir, `neon-backup-${timestamp}.sql`);

    console.log(`📁 Файл бэкапа: ${backupFile}\n`);

    let sqlDump = `-- Neon PostgreSQL Backup
-- Date: ${new Date().toISOString()}
-- Database: ${NEON_URL.split('@')[1]?.split('/')[1] || 'neondb'}

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

`;

    // Получаем список таблиц
    const { rows: tables } = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`📦 Найдено таблиц: ${tables.length}\n`);

    for (const { tablename } of tables) {
      console.log(`   Экспорт: ${tablename}...`);

      // Структура таблицы
      const { rows: columns } = await client.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tablename]);

      sqlDump += `\n-- Table: ${tablename}\n`;
      sqlDump += `DROP TABLE IF EXISTS "${tablename}" CASCADE;\n`;
      sqlDump += `CREATE TABLE "${tablename}" (\n`;
      
      const columnDefs = columns.map(col => {
        let def = `  "${col.column_name}" ${col.data_type}`;
        if (col.character_maximum_length) {
          def += `(${col.character_maximum_length})`;
        }
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        return def;
      });

      sqlDump += columnDefs.join(',\n');
      sqlDump += '\n);\n\n';

      // Данные
      const { rows: data } = await client.query(`SELECT * FROM "${tablename}"`);
      
      if (data.length > 0) {
        sqlDump += `-- Data for ${tablename}\n`;
        
        for (const row of data) {
          const values = Object.values(row).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return val;
          });
          
          const columnNames = Object.keys(row).map(k => `"${k}"`).join(', ');
          sqlDump += `INSERT INTO "${tablename}" (${columnNames}) VALUES (${values.join(', ')});\n`;
        }
        sqlDump += '\n';
      }
    }

    // Записываем в файл
    fs.writeFileSync(backupFile, sqlDump, 'utf8');

    const fileSize = (fs.statSync(backupFile).size / 1024 / 1024).toFixed(2);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ BACKUP ЗАВЕРШЕН УСПЕШНО!\n');
    console.log(`   Файл: ${backupFile}`);
    console.log(`   Размер: ${fileSize} MB`);
    console.log(`   Таблиц: ${tables.length}\n`);

  } catch (error) {
    console.error('\n❌ ОШИБКА BACKUP:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Запуск
backupToFile();
