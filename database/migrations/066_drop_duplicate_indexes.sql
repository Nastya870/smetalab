-- Migration: Drop duplicate indexes identified by PgHero
-- Description: Removes redundant indexes that are covered by other composite indexes.
-- This improves write performance and reduces storage usage.

BEGIN;

-- 1. Categories
DROP INDEX IF EXISTS idx_categories_parent;

-- 2. Contracts
DROP INDEX IF EXISTS idx_contracts_estimate_id;

-- 3. Estimate Item Materials
DROP INDEX IF EXISTS idx_estimate_item_materials_item_id;

-- 4. Estimate Items
DROP INDEX IF EXISTS idx_estimate_items_estimate_id;

-- 5. Estimate Template Materials
DROP INDEX IF EXISTS idx_estimate_template_materials_template_id;

-- 6. Estimate Template Works
DROP INDEX IF EXISTS idx_estimate_template_works_template_id;

-- 7. Estimates
DROP INDEX IF EXISTS idx_estimates_project_id;
DROP INDEX IF EXISTS idx_estimates_tenant_id;

-- 8. Global Purchasings
DROP INDEX IF EXISTS idx_global_purchases_tenant;

-- 9. Materials
DROP INDEX IF EXISTS idx_materials_category;
DROP INDEX IF EXISTS idx_materials_is_global;

-- 10. Project Team Members (Team)
DROP INDEX IF EXISTS idx_team_project_id;
DROP INDEX IF EXISTS idx_team_tenant_id;

-- 11. Projects
DROP INDEX IF EXISTS idx_projects_tenant_id;

-- 12. Role Permissions
DROP INDEX IF EXISTS idx_role_permissions_role_id;

-- 13. Schedules
DROP INDEX IF EXISTS idx_schedules_estimate_id;

-- 14. User Role Assignments
DROP INDEX IF EXISTS idx_user_role_assignments_tenant_user;

-- 15. User Tenants
DROP INDEX IF EXISTS idx_user_tenants_tenant_id;

-- 16. Users
DROP INDEX IF EXISTS idx_users_email;

-- 17. Vector Index State
DROP INDEX IF EXISTS idx_vector_index_state_scope;

-- 18. Work Materials
DROP INDEX IF EXISTS idx_work_materials_work_id;

-- 19. Works
DROP INDEX IF EXISTS idx_works_code;
DROP INDEX IF EXISTS idx_works_is_global;

COMMIT;
