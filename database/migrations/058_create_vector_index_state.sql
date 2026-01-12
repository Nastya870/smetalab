-- Migration: 058_create_vector_index_state.sql
-- Description: Универсальная таблица для tracking состояния векторной индексации

CREATE TABLE IF NOT EXISTS vector_index_state (
  -- Unique document identifier in Vector Store
  document_id TEXT PRIMARY KEY,
  
  -- Scope: 'global' or 'tenant'
  scope TEXT NOT NULL CHECK (scope IN ('global', 'tenant')),
  
  -- Tenant ID (NULL for global documents)
  tenant_id UUID,
  
  -- Entity type: 'material' or 'work'
  entity_type TEXT NOT NULL CHECK (entity_type IN ('material', 'work')),
  
  -- Database record ID (UUID or INTEGER as string)
  db_id TEXT NOT NULL,
  
  -- Last time this document was seen during sync
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Sync metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_vector_index_state_scope 
  ON vector_index_state(scope);

CREATE INDEX IF NOT EXISTS idx_vector_index_state_tenant 
  ON vector_index_state(tenant_id);

CREATE INDEX IF NOT EXISTS idx_vector_index_state_entity 
  ON vector_index_state(entity_type, db_id);

CREATE INDEX IF NOT EXISTS idx_vector_index_state_last_seen 
  ON vector_index_state(last_seen_at);

-- Комментарии
COMMENT ON TABLE vector_index_state IS 'Состояние векторной индексации документов';
