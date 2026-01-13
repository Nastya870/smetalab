import db from '../server/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    console.log('🚀 Applying migration 044...\n');
    
    const migrationPath = path.join(__dirname, '../database/migrations/044_add_work_link_to_template_materials.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await db.query(sql);
    
    console.log('\n✅ Migration 044 applied successfully!');
    console.log('📝 Added template_work_id column to estimate_template_materials table');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

applyMigration();
