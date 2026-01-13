-- ============================================
-- МИГРАЦИЯ: Добавление поддержки глобальных справочников
-- Дата: 11.10.2025
-- Описание: Двухуровневая система - глобальные + тенантные
-- ============================================

-- ===========================
-- 1. ТАБЛИЦА MATERIALS
-- ===========================

-- Добавляем поле is_global
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;

-- Комментарий
COMMENT ON COLUMN materials.is_global IS 'Глобальный материал (доступен всем компаниям)';

-- Индекс для быстрого поиска глобальных материалов
CREATE INDEX IF NOT EXISTS idx_materials_is_global ON materials(is_global) WHERE is_global = TRUE;

-- Делаем tenant_id и created_by опциональными для глобальных записей
ALTER TABLE materials ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE materials ALTER COLUMN created_by DROP NOT NULL;

-- Обновляем RLS политики для глобальных материалов
DROP POLICY IF EXISTS materials_tenant_isolation ON materials;
CREATE POLICY materials_tenant_isolation ON materials
  FOR SELECT
  USING (
    is_global = TRUE OR                              -- Глобальные видят все
    tenant_id IS NULL OR                             -- Legacy записи
    tenant_id = current_tenant_id() OR               -- Свои записи
    is_super_admin()                                 -- Админы видят всё
  );

-- Политика INSERT: обычные пользователи могут создавать только тенантные
DROP POLICY IF EXISTS materials_insert_policy ON materials;
CREATE POLICY materials_insert_policy ON materials
  FOR INSERT
  WITH CHECK (
    (is_global = FALSE AND tenant_id = current_tenant_id()) OR  -- Тенантные записи
    (is_global = TRUE AND is_super_admin())                     -- Глобальные только для админов
  );

-- Политика UPDATE: глобальные редактируют только админы
DROP POLICY IF EXISTS materials_update_policy ON materials;
CREATE POLICY materials_update_policy ON materials
  FOR UPDATE
  USING (
    (is_global = FALSE AND tenant_id = current_tenant_id()) OR  -- Свои записи
    (is_global = TRUE AND is_super_admin())                     -- Глобальные только для админов
  );

-- Политика DELETE: глобальные удаляют только админы
DROP POLICY IF EXISTS materials_delete_policy ON materials;
CREATE POLICY materials_delete_policy ON materials
  FOR DELETE
  USING (
    (is_global = FALSE AND tenant_id = current_tenant_id()) OR  -- Свои записи
    (is_global = TRUE AND is_super_admin())                     -- Глобальные только для админов
  );

-- ===========================
-- 2. ТАБЛИЦА WORKS
-- ===========================

-- Добавляем поле is_global
ALTER TABLE works 
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;

-- Комментарий
COMMENT ON COLUMN works.is_global IS 'Глобальная работа (доступна всем компаниям)';

-- Индекс
CREATE INDEX IF NOT EXISTS idx_works_is_global ON works(is_global) WHERE is_global = TRUE;

-- Обновляем RLS политики для works
DROP POLICY IF EXISTS works_tenant_isolation ON works;
CREATE POLICY works_tenant_isolation ON works
  FOR SELECT
  USING (
    is_global = TRUE OR 
    tenant_id IS NULL OR 
    tenant_id = current_tenant_id() OR 
    is_super_admin()
  );

DROP POLICY IF EXISTS works_insert_policy ON works;
CREATE POLICY works_insert_policy ON works
  FOR INSERT
  WITH CHECK (
    (is_global = FALSE AND tenant_id = current_tenant_id()) OR
    (is_global = TRUE AND is_super_admin())
  );

DROP POLICY IF EXISTS works_update_policy ON works;
CREATE POLICY works_update_policy ON works
  FOR UPDATE
  USING (
    (is_global = FALSE AND tenant_id = current_tenant_id()) OR
    (is_global = TRUE AND is_super_admin())
  );

DROP POLICY IF EXISTS works_delete_policy ON works;
CREATE POLICY works_delete_policy ON works
  FOR DELETE
  USING (
    (is_global = FALSE AND tenant_id = current_tenant_id()) OR
    (is_global = TRUE AND is_super_admin())
  );

-- ===========================
-- 3. ПОМЕТИТЬ СУЩЕСТВУЮЩИЕ МАТЕРИАЛЫ КАК ГЛОБАЛЬНЫЕ
-- ===========================

-- Помечаем текущие 12 материалов как глобальные (опционально)
-- UPDATE materials SET is_global = TRUE WHERE tenant_id IS NOT NULL;

-- Или создаём копии для каждого тенанта (опционально)
-- Закомментировано - выбор за пользователем

-- ===========================
-- 4. ФУНКЦИЯ ДЛЯ КОПИРОВАНИЯ ГЛОБАЛЬНЫХ В ТЕНАНТНЫЕ
-- ===========================

CREATE OR REPLACE FUNCTION copy_global_materials_to_tenant(
  target_tenant_id UUID,
  target_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  copied_count INTEGER := 0;
BEGIN
  -- Копируем все глобальные материалы для нового тенанта
  INSERT INTO materials (
    sku, name, image, unit, price, supplier, weight, 
    category, product_url, show_image, 
    tenant_id, created_by, is_global
  )
  SELECT 
    sku || '-COPY-' || target_tenant_id::TEXT, -- Уникальный SKU
    name,
    image,
    unit,
    price,
    supplier,
    weight,
    category,
    product_url,
    show_image,
    target_tenant_id,
    target_user_id,
    FALSE  -- Копии - это тенантные записи
  FROM materials
  WHERE is_global = TRUE;
  
  GET DIAGNOSTICS copied_count = ROW_COUNT;
  RETURN copied_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION copy_global_materials_to_tenant IS 
  'Копирует все глобальные материалы в справочник конкретного тенанта';

-- Аналогичная функция для works
CREATE OR REPLACE FUNCTION copy_global_works_to_tenant(
  target_tenant_id UUID,
  target_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  copied_count INTEGER := 0;
BEGIN
  INSERT INTO works (
    code, name, category, unit, base_price, 
    tenant_id, created_by, is_global
  )
  SELECT 
    code || '-COPY-' || target_tenant_id::TEXT,
    name,
    category,
    unit,
    base_price,
    target_tenant_id,
    target_user_id,
    FALSE
  FROM works
  WHERE is_global = TRUE;
  
  GET DIAGNOSTICS copied_count = ROW_COUNT;
  RETURN copied_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================
-- 5. VIEW ДЛЯ ОБЪЕДИНЕНИЯ ГЛОБАЛЬНЫХ И ТЕНАНТНЫХ
-- ===========================

-- View для materials (глобальные + свои)
CREATE OR REPLACE VIEW materials_with_global AS
SELECT 
  m.*,
  CASE 
    WHEN m.is_global THEN 'global'
    ELSE 'tenant'
  END as source_type
FROM materials m
WHERE 
  m.is_global = TRUE OR                    -- Все глобальные
  m.tenant_id = current_tenant_id() OR     -- Свои тенантные
  is_super_admin();                        -- Админы видят всё

COMMENT ON VIEW materials_with_global IS 
  'Объединённый view глобальных и тенантных материалов';

-- View для works
CREATE OR REPLACE VIEW works_with_global AS
SELECT 
  w.*,
  CASE 
    WHEN w.is_global THEN 'global'
    ELSE 'tenant'
  END as source_type
FROM works w
WHERE 
  w.is_global = TRUE OR 
  w.tenant_id = current_tenant_id() OR 
  is_super_admin();

-- ===========================
-- ЗАВЕРШЕНИЕ
-- ===========================

DO $$
BEGIN
  RAISE NOTICE '✅ Поле is_global добавлено в materials и works';
  RAISE NOTICE '✅ RLS политики обновлены для двухуровневой системы';
  RAISE NOTICE '✅ Индексы созданы для оптимизации';
  RAISE NOTICE '✅ Функции копирования глобальных справочников созданы';
  RAISE NOTICE '✅ Views для объединённых данных созданы';
  RAISE NOTICE '';
  RAISE NOTICE '📝 NEXT STEPS:';
  RAISE NOTICE '1. Пометить существующие материалы как глобальные:';
  RAISE NOTICE '   UPDATE materials SET is_global = TRUE;';
  RAISE NOTICE '';
  RAISE NOTICE '2. При регистрации нового тенанта копировать глобальные:';
  RAISE NOTICE '   SELECT copy_global_materials_to_tenant(tenant_id, user_id);';
  RAISE NOTICE '   SELECT copy_global_works_to_tenant(tenant_id, user_id);';
END $$;
