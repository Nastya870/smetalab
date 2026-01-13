/**
 * Скрипт для применения миграции 011
 * Usage: node database/migrations/run011.js
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration (Neon)
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  try {
    console.log('🚀 Running migration 011...');
    
    const migrationFile = path.join(__dirname, '011_add_hierarchy_to_works.sql');
    
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }
    
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('📄 Executing SQL...');
    
    await pool.query(sql);
    
    console.log('✅ Migration 011 completed successfully!');
    console.log('✅ Added phase, section, subsection fields to works table');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
