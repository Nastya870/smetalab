/**
 * Migration: Enable pg_trgm extension for fuzzy text search
 * Date: 2026-01-04
 */

export async function up(db) {
  console.log('📊 Enabling pg_trgm extension for hybrid search...');
  
  // Enable pg_trgm extension
  await db.query(`
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  `);
  
  console.log('✅ pg_trgm extension enabled');
  
  // Create GIN indexes for faster similarity search
  console.log('📊 Creating GIN indexes for materials...');
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_materials_name_gin 
    ON materials USING gin (name gin_trgm_ops);
  `);
  
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_materials_category_gin 
    ON materials USING gin (category gin_trgm_ops);
  `);
  
  console.log('✅ Materials indexes created');
  
  console.log('📊 Creating GIN indexes for works...');
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_works_name_gin 
    ON works USING gin (name gin_trgm_ops);
  `);
  
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_works_category_gin 
    ON works USING gin (category gin_trgm_ops);
  `);
  
  console.log('✅ Works indexes created');
  console.log('✅ Migration completed successfully');
}

export async function down(db) {
  console.log('📊 Removing GIN indexes...');
  
  await db.query('DROP INDEX IF EXISTS idx_materials_name_gin');
  await db.query('DROP INDEX IF EXISTS idx_materials_category_gin');
  await db.query('DROP INDEX IF EXISTS idx_works_name_gin');
  await db.query('DROP INDEX IF EXISTS idx_works_category_gin');
  
  console.log('✅ Indexes removed');
  
  // Note: We don't drop pg_trgm extension as it might be used by other features
  console.log('⚠️  pg_trgm extension NOT removed (might be used elsewhere)');
}
