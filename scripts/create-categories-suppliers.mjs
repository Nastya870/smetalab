import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const queries = [
  `CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  
  `CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    inn VARCHAR(50),
    kpp VARCHAR(50),
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  
  `CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_is_global ON categories(is_global)`,
  `CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_suppliers_is_global ON suppliers(is_global)`
];

async function createTables() {
  try {
    console.log('🔄 Creating categories and suppliers tables...\n');
    
    for (const query of queries) {
      await pool.query(query);
    }
    
    console.log('✅ Categories table created');
    console.log('✅ Suppliers table created');
    console.log('✅ Indexes created\n');
    
    // Verify
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('categories', 'suppliers')
      ORDER BY table_name
    `);
    
    console.log(`Verified ${result.rows.length} tables:`, result.rows.map(r => r.table_name).join(', '));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTables();
