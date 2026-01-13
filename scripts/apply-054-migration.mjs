import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  try {
    await client.connect();
    console.log('🔌 Connected to database');
    
    const sql = fs.readFileSync('./database/migrations/054_add_category_to_works.sql', 'utf8');
    console.log('\n📄 Applying migration 054_add_category_to_works.sql...');
    
    await client.query(sql);
    
    console.log('✅ Migration applied successfully');
    
    // Проверяем результат
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='works' AND column_name='category'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column category exists in works table');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

applyMigration();
