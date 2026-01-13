-- Migration 065: Optimize materials table indexes
-- This migration removes unused and redundant indexes to save space and improve write performance.
-- Total estimated space saving: ~275 MB

-- 1. Remove large unused indexes
DROP INDEX IF EXISTS idx_materials_global_category_covering; -- 168 MB, 0 usage
DROP INDEX IF EXISTS idx_materials_name_gin;                 -- 54 MB, redundant to idx_materials_name_trgm
DROP INDEX IF EXISTS idx_materials_search;                   -- 20 MB, unused (Full Text Search not used)
DROP INDEX IF EXISTS idx_materials_sku_gin;                  -- 12 MB, redundant to idx_materials_sku_trgm

-- 2. Remove other unused/redundant btree indexes
DROP INDEX IF EXISTS idx_materials_auto_calculate;           -- 3 MB, 0 usage
DROP INDEX IF EXISTS idx_materials_sku_number;               -- 4 MB, redundant to partial indexes (idx_materials_global_only, idx_materials_tenant_only)
DROP INDEX IF EXISTS idx_materials_supplier;                 -- 2.8 MB, 0 usage
DROP INDEX IF EXISTS idx_materials_global_tenant_sku;        -- 3.6 MB, 0 usage
DROP INDEX IF EXISTS idx_materials_supplier_global;          -- 3.6 MB, 0 usage
DROP INDEX IF EXISTS idx_materials_created_at;               -- 0.4 MB, 0 usage
DROP INDEX IF EXISTS idx_materials_name;                     -- 4.8 MB, 0 usage

-- 3. Refresh statistics
ANALYZE materials;

-- 4. Record migration
INSERT INTO schema_version (id, applied_at, description) 
VALUES ('065', NOW(), 'Optimize materials indexes: removed unused and redundant indexes (~275MB saved)');
