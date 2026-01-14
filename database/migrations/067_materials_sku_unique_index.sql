-- =====================================
-- Migration 067: Add UNIQUE index for materials bulk upsert
-- Fixes slow ON CONFLICT queries (1000ms+ -> 10ms)
-- Created: 2026-01-14
-- =====================================

-- Problem:
-- The bulk import uses ON CONFLICT (sku, is_global, COALESCE(tenant_id, '00000000-...'))
-- but no matching UNIQUE index exists, causing full table scans.

-- Solution:
-- Create a UNIQUE index that matches the ON CONFLICT expression exactly.
-- This uses COALESCE to handle NULL tenant_id (for global materials).

-- Note: Not using CONCURRENTLY because migration runs in a transaction.
-- For large tables in production, consider running manually with CONCURRENTLY outside transaction.

CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_sku_scope_unique
ON materials (
  sku, 
  is_global, 
  COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000')
);

-- Add a comment to explain the purpose
COMMENT ON INDEX idx_materials_sku_scope_unique IS 
  'Unique constraint for materials: prevents duplicate SKUs within the same scope (global or per-tenant). Required for efficient ON CONFLICT upserts.';
