import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function renameTables() {
  try {
    console.log('🔄 Renaming mixedbread_index_state to vector_index_state...\n');
    
    // Проверим, существует ли vector_index_state
    const checkNew = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'vector_index_state'
      )
    `);
    
    if (checkNew.rows[0].exists) {
      console.log('✅ Table vector_index_state already exists, skipping rename');
      process.exit(0);
    }
    
    // Проверим, существует ли mixedbread_index_state
    const checkOld = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mixedbread_index_state'
      )
    `);
    
    if (!checkOld.rows[0].exists) {
      console.log('❌ Table mixedbread_index_state does not exist');
      process.exit(1);
    }
    
    // Переименовать
    await pool.query('ALTER TABLE mixedbread_index_state RENAME TO vector_index_state');
    
    console.log('✅ Table renamed: mixedbread_index_state → vector_index_state\n');
    
    // Проверка
    const verify = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('mixedbread_index_state', 'vector_index_state')
    `);
    
    console.log('Current tables:', verify.rows.map(r => r.table_name).join(', '));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

renameTables();
