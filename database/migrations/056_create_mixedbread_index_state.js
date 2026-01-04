/**
 * Migration: Create mixedbread_index_state table
 * 
 * Purpose: Track synchronized documents in Mixedbread Store to enable safe cleanup
 * - Tracks which documents have been synced to Mixedbread
 * - Enables detection of deleted documents (in DB but not seen in recent sync)
 * - Prevents cross-contamination between global and tenant segments
 */

export async function up(db) {
  console.log('Creating mixedbread_index_state table...');
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS mixedbread_index_state (
      -- Unique document identifier in Mixedbread Store
      document_id VARCHAR(255) PRIMARY KEY,
      
      -- Scope: 'global' or 'tenant'
      scope VARCHAR(10) NOT NULL CHECK (scope IN ('global', 'tenant')),
      
      -- Tenant ID (NULL for global documents)
      tenant_id UUID,
      
      -- Entity type: 'material' or 'work'
      entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('material', 'work')),
      
      -- Database record ID (for reference, not enforced FK)
      db_id UUID NOT NULL,
      
      -- Last time this document was seen during sync
      last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      
      -- Sync metadata
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  console.log('Creating indexes on mixedbread_index_state...');
  
  // Index for efficient cleanup queries (find documents to delete)
  await db.query(`
    CREATE INDEX idx_mixedbread_state_scope_tenant 
    ON mixedbread_index_state(scope, tenant_id, last_seen_at);
  `);
  
  // Index for efficient lookups by entity type
  await db.query(`
    CREATE INDEX idx_mixedbread_state_entity_type 
    ON mixedbread_index_state(entity_type, scope);
  `);
  
  // Index for tenant-specific queries
  await db.query(`
    CREATE INDEX idx_mixedbread_state_tenant_id 
    ON mixedbread_index_state(tenant_id) 
    WHERE tenant_id IS NOT NULL;
  `);

  console.log('✅ mixedbread_index_state table created successfully');
}

export async function down(db) {
  console.log('Dropping mixedbread_index_state table...');
  
  await db.query(`DROP TABLE IF EXISTS mixedbread_index_state CASCADE;`);
  
  console.log('✅ mixedbread_index_state table dropped');
}
