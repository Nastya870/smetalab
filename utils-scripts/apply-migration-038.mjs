import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем переменные окружения
dotenv.config({ path: join(__dirname, '.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function applyMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Читаем миграцию
    const migrationSQL = readFileSync(
      join(__dirname, 'database/migrations/038_update_counterparties_passport_fields.sql'),
      'utf8'
    );

    console.log('📄 Applying migration: 038_update_counterparties_passport_fields.sql');
    
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');

    console.log('✅ Migration applied successfully!');

    // Проверяем добавленные колонки
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'counterparties' 
      AND column_name IN ('passport_series', 'passport_number', 'passport_issued_by_code')
      ORDER BY column_name;
    `);

    console.log('\n✅ New columns created:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}(${row.character_maximum_length})`);
    });

    // Проверяем мигрированные данные
    const dataCheck = await client.query(`
      SELECT 
        id,
        full_name,
        passport_series_number,
        passport_series,
        passport_number,
        passport_issued_by_code
      FROM counterparties
      WHERE entity_type = 'individual'
      LIMIT 5;
    `);

    if (dataCheck.rows.length > 0) {
      console.log('\n📊 Sample migrated data:');
      dataCheck.rows.forEach((row, index) => {
        console.log(`\n   Record ${index + 1}:`);
        console.log(`   - Name: ${row.full_name}`);
        console.log(`   - Old format: ${row.passport_series_number}`);
        console.log(`   - Series: ${row.passport_series}`);
        console.log(`   - Number: ${row.passport_number}`);
        console.log(`   - Code: ${row.passport_issued_by_code || 'not set'}`);
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error applying migration:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

applyMigration();
