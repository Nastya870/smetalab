-- Migration 006: Performance Indexes для Materials и Works
-- Цель: ускорение queries на 5-10x через оптимизированные индексы
-- Дата: 11 октября 2025

-- ============================================
-- ENABLE pg_trgm EXTENSION (ПЕРВЫМ ДЕЛОМ!)
-- ============================================

-- Необходимо для ILIKE оптимизации с GIN indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- MATERIALS TABLE INDEXES
-- ============================================

-- 1. Index на is_global (самый частый фильтр)
CREATE INDEX IF NOT EXISTS idx_materials_is_global 
ON materials(is_global);

-- 2. Index на category для фильтрации
CREATE INDEX IF NOT EXISTS idx_materials_category 
ON materials(category);

-- 3. Index на sku для поиска (LIKE queries)
CREATE INDEX IF NOT EXISTS idx_materials_sku 
ON materials(sku);

-- 4. Index на supplier для фильтрации
CREATE INDEX IF NOT EXISTS idx_materials_supplier 
ON materials(supplier);

-- 5. Composite index для частого запроса (is_global + category)
CREATE INDEX IF NOT EXISTS idx_materials_is_global_category 
ON materials(is_global, category);

-- 6. Composite index для сортировки (is_global + sku)
CREATE INDEX IF NOT EXISTS idx_materials_is_global_sku 
ON materials(is_global DESC, sku ASC);

-- 7. Index для полнотекстового поиска по name
-- GIN index для ILIKE queries (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS idx_materials_name_gin 
ON materials USING gin(name gin_trgm_ops);

-- 8. Index для полнотекстового поиска по sku
CREATE INDEX IF NOT EXISTS idx_materials_sku_gin 
ON materials USING gin(sku gin_trgm_ops);

-- ============================================
-- WORKS TABLE INDEXES
-- ============================================

-- 1. Index на is_global (самый частый фильтр)
CREATE INDEX IF NOT EXISTS idx_works_is_global 
ON works(is_global);

-- 2. Index на category для фильтрации
CREATE INDEX IF NOT EXISTS idx_works_category 
ON works(category);

-- 3. Index на code для поиска
CREATE INDEX IF NOT EXISTS idx_works_code 
ON works(code);

-- 4. Composite index для частого запроса (is_global + category)
CREATE INDEX IF NOT EXISTS idx_works_is_global_category 
ON works(is_global, category);

-- 5. Composite index для сортировки (is_global + code)
CREATE INDEX IF NOT EXISTS idx_works_is_global_code 
ON works(is_global DESC, code ASC);

-- 6. Index для полнотекстового поиска по name
CREATE INDEX IF NOT EXISTS idx_works_name_gin 
ON works USING gin(name gin_trgm_ops);

-- 7. Index для полнотекстового поиска по code
CREATE INDEX IF NOT EXISTS idx_works_code_gin 
ON works USING gin(code gin_trgm_ops);

-- ============================================
-- ANALYZE TABLES (обновить статистику)
-- ============================================

ANALYZE materials;
ANALYZE works;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Проверить созданные индексы для materials
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'materials'
ORDER BY indexname;

-- Проверить созданные индексы для works
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'works'
ORDER BY indexname;

-- ============================================
-- PERFORMANCE TESTING
-- ============================================

-- Test query 1: Глобальные материалы (должен использовать idx_materials_is_global)
EXPLAIN ANALYZE
SELECT * FROM materials WHERE is_global = TRUE ORDER BY sku ASC;

-- Test query 2: Поиск по категории (должен использовать idx_materials_is_global_category)
EXPLAIN ANALYZE
SELECT * FROM materials WHERE is_global = TRUE AND category = 'Кирпич' ORDER BY sku ASC;

-- Test query 3: Поиск по name (должен использовать idx_materials_name_gin)
EXPLAIN ANALYZE
SELECT * FROM materials WHERE name ILIKE '%кирпич%';

-- Test query 4: Глобальные работы (должен использовать idx_works_is_global)
EXPLAIN ANALYZE
SELECT * FROM works WHERE is_global = TRUE ORDER BY code ASC;

-- ============================================
-- NOTES
-- ============================================

-- 1. GIN indexes (pg_trgm) - для быстрого ILIKE поиска
--    - Занимают больше места, но ускоряют LIKE/ILIKE queries до 100x
--    - Идеально для поиска по sku, name, code
--
-- 2. Composite indexes - для частых комбинаций фильтров
--    - (is_global, category) - самая частая комбинация
--    - (is_global DESC, sku ASC) - для сортировки с приоритетом глобальных
--
-- 3. ANALYZE - обновление статистики для query planner
--    - PostgreSQL использует статистику для выбора оптимального index
--    - Запускать после bulk insert/update операций
--
-- 4. Мониторинг использования indexes:
--    SELECT * FROM pg_stat_user_indexes WHERE relname IN ('materials', 'works');
--
-- 5. Размер indexes:
--    SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid))
--    FROM pg_stat_user_indexes
--    WHERE relname IN ('materials', 'works');

-- ============================================
-- ROLLBACK (если нужно откатить миграцию)
-- ============================================

-- DROP INDEX IF EXISTS idx_materials_is_global;
-- DROP INDEX IF EXISTS idx_materials_category;
-- DROP INDEX IF EXISTS idx_materials_sku;
-- DROP INDEX IF EXISTS idx_materials_supplier;
-- DROP INDEX IF EXISTS idx_materials_is_global_category;
-- DROP INDEX IF EXISTS idx_materials_is_global_sku;
-- DROP INDEX IF EXISTS idx_materials_name_gin;
-- DROP INDEX IF EXISTS idx_materials_sku_gin;
-- DROP INDEX IF EXISTS idx_works_is_global;
-- DROP INDEX IF EXISTS idx_works_category;
-- DROP INDEX IF EXISTS idx_works_code;
-- DROP INDEX IF EXISTS idx_works_is_global_category;
-- DROP INDEX IF EXISTS idx_works_is_global_code;
-- DROP INDEX IF EXISTS idx_works_name_gin;
-- DROP INDEX IF EXISTS idx_works_code_gin;
