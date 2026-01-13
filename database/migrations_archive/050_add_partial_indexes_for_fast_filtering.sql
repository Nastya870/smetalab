-- ============================================
-- МИГРАЦИЯ 050: Partial Indexes для ускорения фильтрации справочников
-- Дата: 18 ноября 2025
-- Цель: Ускорение загрузки справочников в 10-20x через специализированные индексы
-- ============================================

-- ПРОБЛЕМА:
-- 1. Загрузка works/materials с фильтром is_global занимает 2-5 секунд
-- 2. Используются generic indexes, которые не оптимальны для конкретных фильтров
-- 3. PostgreSQL должен сканировать всю таблицу для is_global = TRUE/FALSE

-- РЕШЕНИЕ:
-- Partial (частичные) индексы - индексы только для подмножества данных
-- Covering (покрывающие) индексы - включают все нужные колонки для SELECT

-- ============================================
-- WORKS TABLE - PARTIAL INDEXES
-- ============================================

-- 1. Index только для ГЛОБАЛЬНЫХ работ (is_global = TRUE)
-- Covering index - включает все колонки для SELECT без обращения к таблице
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_works_global_only_covering
ON works (code ASC, id)
INCLUDE (name, unit, base_price, phase, section, subsection, created_at, updated_at)
WHERE is_global = TRUE;

-- 2. Index только для ТЕНАНТНЫХ работ (is_global = FALSE)
-- Покрывающий индекс с tenant_id для быстрой фильтрации по компании
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_works_tenant_only_covering
ON works (tenant_id, code ASC, id)
INCLUDE (name, unit, base_price, phase, section, subsection, is_global, created_at, updated_at)
WHERE is_global = FALSE;

-- 3. Index для поиска по КОДУ (ILIKE)
-- Ускоряет поиск с использованием pg_trgm
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_works_code_trgm
ON works USING gin (code gin_trgm_ops);

-- 4. Index для поиска по НАЗВАНИЮ (ILIKE)  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_works_name_trgm
ON works USING gin (name gin_trgm_ops);

-- ============================================
-- MATERIALS TABLE - PARTIAL INDEXES
-- ============================================

-- 1. Index только для ГЛОБАЛЬНЫХ материалов (is_global = TRUE)
-- Covering index с сортировкой по sku_number
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_global_only_covering
ON materials (sku_number ASC NULLS LAST, id)
INCLUDE (
  sku, name, unit, price, weight, supplier, category, 
  image, product_url, show_image, auto_calculate, 
  created_at, updated_at
)
WHERE is_global = TRUE;

-- 2. Index только для ТЕНАНТНЫХ материалов (is_global = FALSE)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_tenant_only_covering
ON materials (tenant_id, sku_number ASC NULLS LAST, id)
INCLUDE (
  sku, name, unit, price, weight, supplier, category, 
  image, product_url, show_image, auto_calculate, is_global,
  created_at, updated_at
)
WHERE is_global = FALSE;

-- 3. Index для поиска по SKU (ILIKE)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_sku_trgm
ON materials USING gin (sku gin_trgm_ops);

-- 4. Index для поиска по НАЗВАНИЮ (ILIKE)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_name_trgm
ON materials USING gin (name gin_trgm_ops);

-- 5. Index для поиска по ПОСТАВЩИКУ (фильтр)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_supplier_btree
ON materials (supplier)
WHERE supplier IS NOT NULL;

-- 6. Index для поиска по КАТЕГОРИИ (фильтр)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_category_btree
ON materials (category)
WHERE category IS NOT NULL;

-- ============================================
-- УДАЛЕНИЕ СТАРЫХ НЕЭФФЕКТИВНЫХ ИНДЕКСОВ
-- ============================================

-- Старые generic indexes заменены на partial covering indexes
-- DROP INDEX IF EXISTS idx_works_is_global;
-- DROP INDEX IF EXISTS idx_works_is_global_category;
-- DROP INDEX IF EXISTS idx_works_is_global_code;
-- DROP INDEX IF EXISTS idx_materials_is_global;
-- DROP INDEX IF EXISTS idx_materials_is_global_category;
-- DROP INDEX IF EXISTS idx_materials_is_global_sku;

-- Примечание: НЕ удаляем старые индексы автоматически, т.к. они могут использоваться
-- другими частями приложения. Удалите вручную после проверки EXPLAIN ANALYZE.

-- ============================================
-- ОБНОВЛЕНИЕ СТАТИСТИКИ
-- ============================================

ANALYZE works;
ANALYZE materials;

-- ============================================
-- ПРОВЕРКА СОЗДАННЫХ ИНДЕКСОВ
-- ============================================

-- Проверить размеры индексов
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE relname IN ('works', 'materials')
ORDER BY pg_relation_size(indexrelid) DESC;

-- Проверить использование индексов (запустить после тестирования)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE relname IN ('works', 'materials')
  AND indexname LIKE '%_covering%'
ORDER BY idx_scan DESC;

-- ============================================
-- ТЕСТИРОВАНИЕ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

-- Test 1: Загрузка ГЛОБАЛЬНЫХ работ (должен использовать idx_works_global_only_covering)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, code, name, unit, base_price, phase, section, subsection, TRUE as is_global
FROM works 
WHERE is_global = TRUE 
ORDER BY code ASC 
LIMIT 20000;

-- Test 2: Загрузка ТЕНАНТНЫХ работ (должен использовать idx_works_tenant_only_covering)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, code, name, unit, base_price, phase, section, subsection, is_global
FROM works 
WHERE is_global = FALSE AND tenant_id = 'some-tenant-uuid'::uuid
ORDER BY code ASC 
LIMIT 20000;

-- Test 3: Загрузка ГЛОБАЛЬНЫХ материалов (должен использовать idx_materials_global_only_covering)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, sku, name, unit, price, weight, supplier, category, 
       image, product_url, show_image, auto_calculate, TRUE as is_global
FROM materials 
WHERE is_global = TRUE 
ORDER BY sku_number ASC 
LIMIT 50000;

-- Test 4: Загрузка ТЕНАНТНЫХ материалов (должен использовать idx_materials_tenant_only_covering)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, sku, name, unit, price, weight, supplier, category, 
       image, product_url, show_image, auto_calculate, is_global
FROM materials 
WHERE is_global = FALSE AND tenant_id = 'some-tenant-uuid'::uuid
ORDER BY sku_number ASC 
LIMIT 50000;

-- Test 5: Поиск по коду работы (должен использовать idx_works_code_trgm)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM works WHERE code ILIKE '%12345%';

-- Test 6: Поиск по названию материала (должен использовать idx_materials_name_trgm)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM materials WHERE name ILIKE '%кирпич%';

-- ============================================
-- ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ
-- ============================================

-- ✅ Index-Only Scan (или Index Scan) вместо Seq Scan
-- ✅ Execution Time < 100ms для 20,000 записей works
-- ✅ Execution Time < 200ms для 50,000 записей materials
-- ✅ Buffers: shared hit (кэш PostgreSQL) > shared read (диск)
-- ✅ Planning Time < 5ms

-- ============================================
-- МОНИТОРИНГ (запускать периодически)
-- ============================================

-- Статистика по индексам (какие используются, какие нет)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as size,
    idx_tup_read as rows_read,
    idx_tup_fetch as rows_fetched,
    CASE 
        WHEN idx_scan = 0 THEN '🔴 UNUSED'
        WHEN idx_scan < 100 THEN '🟡 RARE'
        ELSE '🟢 ACTIVE'
    END as status
FROM pg_stat_user_indexes
WHERE relname IN ('works', 'materials')
ORDER BY idx_scan DESC;

-- ============================================
-- ROLLBACK (если нужно откатить)
-- ============================================

-- DROP INDEX CONCURRENTLY IF EXISTS idx_works_global_only_covering;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_works_tenant_only_covering;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_works_code_trgm;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_works_name_trgm;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_materials_global_only_covering;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_materials_tenant_only_covering;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_materials_sku_trgm;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_materials_name_trgm;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_materials_supplier_btree;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_materials_category_btree;

-- ============================================
-- ПРИМЕЧАНИЯ
-- ============================================

-- 1. CONCURRENTLY - создание индекса без блокировки таблицы
--    Можно применять на production без downtime
--
-- 2. INCLUDE - covering index (PostgreSQL 11+)
--    Все колонки SELECT включены в индекс = index-only scan без чтения таблицы
--
-- 3. WHERE is_global = TRUE/FALSE - partial index
--    Индекс только для подмножества данных = меньше размер, быстрее поиск
--
-- 4. gin_trgm_ops - триграммы для ILIKE
--    Поддержка поиска с % в начале/конце (%term%, %term, term%)
--
-- 5. Размер индексов:
--    - Covering indexes больше обычных (содержат копии колонок)
--    - Partial indexes меньше (только часть данных)
--    - Trade-off: место на диске vs скорость queries
--
-- 6. Обслуживание:
--    REINDEX CONCURRENTLY idx_materials_global_only_covering;
--    Пересоздание индекса для дефрагментации (раз в квартал)

