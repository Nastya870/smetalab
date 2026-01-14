-- Migration 065: Materials Schema Refinement and Index Optimization
-- This migration consolidates several cleanup tasks:
-- 1. Removes unused and redundant indexes (from former 065 and 066)
-- 2. Removes calculation columns from materials table (auto_calculate, consumption)
-- 3. Recreates the materials_with_global view

BEGIN;

-- 1. DROP REDUNDANT INDEXES (from former 065 and 066)
-- Materials table
DROP INDEX IF EXISTS idx_materials_global_category_covering;
DROP INDEX IF EXISTS idx_materials_name_gin;
DROP INDEX IF EXISTS idx_materials_search;
DROP INDEX IF EXISTS idx_materials_sku_gin;
DROP INDEX IF EXISTS idx_materials_auto_calculate;
DROP INDEX IF EXISTS idx_materials_sku_number;
DROP INDEX IF EXISTS idx_materials_supplier;
DROP INDEX IF EXISTS idx_materials_global_tenant_sku;
DROP INDEX IF EXISTS idx_materials_supplier_global;
DROP INDEX IF EXISTS idx_materials_created_at;
DROP INDEX IF EXISTS idx_materials_name;
DROP INDEX IF EXISTS idx_materials_category;
DROP INDEX IF EXISTS idx_materials_is_global;

-- Other tables (duplicate indexes)
DROP INDEX IF EXISTS idx_categories_parent;
DROP INDEX IF EXISTS idx_contracts_estimate_id;
DROP INDEX IF EXISTS idx_estimate_item_materials_item_id;
DROP INDEX IF EXISTS idx_estimate_items_estimate_id;
DROP INDEX IF EXISTS idx_estimate_template_materials_template_id;
DROP INDEX IF EXISTS idx_estimate_template_works_template_id;
DROP INDEX IF EXISTS idx_estimates_project_id;
DROP INDEX IF EXISTS idx_estimates_tenant_id;
DROP INDEX IF EXISTS idx_global_purchases_tenant;
DROP INDEX IF EXISTS idx_team_project_id;
DROP INDEX IF EXISTS idx_team_tenant_id;
DROP INDEX IF EXISTS idx_projects_tenant_id;
DROP INDEX IF EXISTS idx_role_permissions_role_id;
DROP INDEX IF EXISTS idx_schedules_estimate_id;
DROP INDEX IF EXISTS idx_user_role_assignments_tenant_user;
DROP INDEX IF EXISTS idx_user_tenants_tenant_id;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_vector_index_state_scope;
DROP INDEX IF EXISTS idx_work_materials_work_id;
DROP INDEX IF EXISTS idx_works_code;
DROP INDEX IF EXISTS idx_works_is_global;

-- 2. REFINE MATERIALS COLUMNS
-- Drop the view first as it depends on columns
DROP VIEW IF EXISTS materials_with_global CASCADE;

-- Drop columns from materials table
ALTER TABLE materials DROP COLUMN IF EXISTS auto_calculate;
ALTER TABLE materials DROP COLUMN IF EXISTS consumption;
ALTER TABLE materials DROP COLUMN IF EXISTS consumption_unit;

-- 3. RECREATE VIEW
CREATE OR REPLACE VIEW materials_with_global AS
 SELECT id,
    sku,
    name,
    image,
    unit,
    price,
    supplier,
    weight,
    category,
    product_url,
    show_image,
    tenant_id,
    created_by,
    created_at,
    updated_at,
    is_global,
    sku_number,
    CASE
        WHEN is_global THEN 'global'::text
        ELSE 'tenant'::text
    END AS source_type
   FROM materials m;

-- 4. ANALYZE
ANALYZE materials;

-- 5. RECORD MIGRATION
INSERT INTO schema_version (id, applied_at, description) 
VALUES (65, NOW(), 'Consolidated materials refinement: index optimization and column cleanup')
ON CONFLICT (id) DO UPDATE SET 
  applied_at = EXCLUDED.applied_at,
  description = EXCLUDED.description;

COMMIT;
