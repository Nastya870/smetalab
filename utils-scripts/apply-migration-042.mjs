import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function applyMigration() {
  try {
    console.log('🔧 Применение миграции 042_fix_works_code_uniqueness.sql\n');
    
    const migrationPath = join(__dirname, 'database', 'migrations', '042_fix_works_code_uniqueness.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Выполнение SQL...\n');
    
    const result = await pool.query(sql);
    
    console.log('\n✅ Миграция успешно применена!');
    
    await pool.end();
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
