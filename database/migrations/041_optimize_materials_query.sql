-- ============================================
-- МИГРАЦИЯ: Оптимизация запросов материалов
-- Дата: 16.11.2025
-- Описание: Добавление индексов для ускорения запросов с фильтрацией
-- ============================================

-- Составной индекс для оптимизации запросов с фильтрами (is_global + tenant_id + sorting)
CREATE INDEX IF NOT EXISTS idx_materials_global_tenant_sku 
ON materials(is_global, tenant_id, sku_number) 
WHERE is_global IS NOT NULL;

-- Составной индекс для поиска по SKU и названию
CREATE INDEX IF NOT EXISTS idx_materials_search 
ON materials USING gin(to_tsvector('russian', name || ' ' || sku));

-- Partial index для глобальных материалов (часто используется без фильтров)
CREATE INDEX IF NOT EXISTS idx_materials_global_only 
ON materials(sku_number) 
WHERE is_global = TRUE;

-- Partial index для тенантных материалов
CREATE INDEX IF NOT EXISTS idx_materials_tenant_only 
ON materials(tenant_id, sku_number) 
WHERE is_global = FALSE;

-- Индекс для категорий с учетом глобальности
CREATE INDEX IF NOT EXISTS idx_materials_category_global 
ON materials(category, is_global, sku_number);

-- Индекс для поставщиков с учетом глобальности
CREATE INDEX IF NOT EXISTS idx_materials_supplier_global 
ON materials(supplier, is_global, sku_number);

-- Обновляем статистику для оптимизатора запросов
ANALYZE materials;

-- Успешное завершение миграции
DO $$
BEGIN
  RAISE NOTICE '✅ Миграция 041 успешно выполнена';
  RAISE NOTICE '✅ Добавлены составные индексы:';
  RAISE NOTICE '   • idx_materials_global_tenant_sku (is_global + tenant_id + sku_number)';
  RAISE NOTICE '   • idx_materials_search (полнотекстовый поиск)';
  RAISE NOTICE '   • idx_materials_global_only (для глобальных материалов)';
  RAISE NOTICE '   • idx_materials_tenant_only (для тенантных материалов)';
  RAISE NOTICE '   • idx_materials_category_global (категория + глобальность)';
  RAISE NOTICE '   • idx_materials_supplier_global (поставщик + глобальность)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Ожидаемый эффект:';
  RAISE NOTICE '   • Ускорение запросов с фильтрацией по is_global';
  RAISE NOTICE '   • Ускорение поиска по SKU и названию';
  RAISE NOTICE '   • Ускорение сортировки после фильтрации';
END $$;
