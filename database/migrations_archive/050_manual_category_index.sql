-- Последний индекс категории материалов (отдельно, т.к. CREATE INDEX CONCURRENTLY не работает в транзакции)
-- Запустить вручную в Neon SQL Editor или через psql

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_category_btree
ON materials (category)
WHERE category IS NOT NULL;

-- Обновление статистики после создания индекса
ANALYZE materials;

-- Проверка созданного индекса
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE relname = 'materials'
  AND indexname = 'idx_materials_category_btree';
