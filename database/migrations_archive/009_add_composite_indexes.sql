-- Добавление композитных индексов для оптимизации object_parameters queries
-- Применяется к существующей БД после миграции 009

-- Композитный индекс для основного запроса WHERE tenant_id = X AND estimate_id = Y
CREATE INDEX IF NOT EXISTS idx_object_parameters_tenant_estimate 
ON object_parameters(tenant_id, estimate_id);

-- Композитный индекс для JOIN с object_openings с учетом RLS
CREATE INDEX IF NOT EXISTS idx_object_openings_tenant_parameter 
ON object_openings(tenant_id, parameter_id);

-- Обновить статистику для оптимизатора запросов
ANALYZE object_parameters;
ANALYZE object_openings;

-- Проверка созданных индексов
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('object_parameters', 'object_openings')
ORDER BY tablename, indexname;
