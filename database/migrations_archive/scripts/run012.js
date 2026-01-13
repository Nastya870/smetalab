import pg from 'pg';
const { Client } = pg;

// Neon PostgreSQL connection
const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
  const client = new Client({ connectionString });

  try {
    console.log('🚀 Running migration 012...');
    await client.connect();

    // Read and execute migration file
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '012_create_work_materials_table.sql'),
      'utf8'
    );

    console.log('📄 Executing SQL...');
    await client.query(migrationSQL);

    console.log('✅ Migration 012 completed successfully!');
    console.log('✅ Created work_materials table with:');
    console.log('   - work_id (FK to works)');
    console.log('   - material_id (FK to materials)');
    console.log('   - consumption (расход на единицу)');
    console.log('   - is_required (обязательный/опциональный)');
    console.log('   - tenant_id (мультитенантность)');
    console.log('   - RLS policies enabled');
    console.log('   - Indexes created');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
