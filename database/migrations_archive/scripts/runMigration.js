/**
 * Script to run a specific migration
 * Usage: node database/migrations/runMigration.js <migration_number>
 * Example: node database/migrations/runMigration.js 006
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration(migrationNumber) {
  try {
    console.log(`🚀 Running migration ${migrationNumber}...`);
    
    // Read migration file
    const migrationFile = path.join(__dirname, `${migrationNumber}_add_performance_indexes.sql`);
    
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }
    
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log(`📄 Executing SQL from ${migrationFile}...`);
    
    // Execute migration
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Get migration number from command line
const migrationNumber = process.argv[2];

if (!migrationNumber) {
  console.error('❌ Please provide migration number');
  console.log('Usage: node runMigration.js <migration_number>');
  console.log('Example: node runMigration.js 006');
  process.exit(1);
}

// Run migration
runMigration(migrationNumber)
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error.message);
    process.exit(1);
  });
