-- ============================================
-- МИГРАЦИЯ 053: Добавление полей веса в estimate_item_materials
-- Дата: 26.12.2025
-- Описание: Добавляет поля weight (вес единицы) и total_weight (общий вес)
--           для автоматического расчёта веса материалов в смете
-- ============================================

-- 1. Добавляем поле weight (вес единицы материала в кг)
ALTER TABLE estimate_item_materials
ADD COLUMN IF NOT EXISTS weight NUMERIC(10, 3) DEFAULT 0;

-- 2. Добавляем вычисляемое поле total_weight (общий вес = количество × вес единицы)
ALTER TABLE estimate_item_materials
ADD COLUMN IF NOT EXISTS total_weight NUMERIC(15, 3) 
  GENERATED ALWAYS AS (quantity * weight) STORED;

-- 3. Создаём индекс для быстрой выборки материалов с весом
CREATE INDEX IF NOT EXISTS idx_estimate_item_materials_weight 
ON estimate_item_materials(weight) 
WHERE weight > 0;

-- 4. Обновляем существующие записи - копируем вес из materials
UPDATE estimate_item_materials eim
SET weight = COALESCE(m.weight, 0)
FROM materials m
WHERE eim.material_id = m.id
  AND eim.weight IS NULL;

-- 5. Комментарии к полям
COMMENT ON COLUMN estimate_item_materials.weight IS 'Вес единицы материала (кг) - копируется из materials при добавлении';
COMMENT ON COLUMN estimate_item_materials.total_weight IS 'Общий вес материала = quantity × weight (кг), вычисляется автоматически';

-- 6. Добавляем функцию для автоматического копирования веса при INSERT
CREATE OR REPLACE FUNCTION copy_material_weight()
RETURNS TRIGGER AS $$
BEGIN
  -- Копируем вес из справочника materials, если не указан явно
  IF NEW.weight IS NULL OR NEW.weight = 0 THEN
    SELECT COALESCE(weight, 0) INTO NEW.weight
    FROM materials
    WHERE id = NEW.material_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Триггер для автоматического копирования веса
DROP TRIGGER IF EXISTS trigger_copy_material_weight ON estimate_item_materials;
CREATE TRIGGER trigger_copy_material_weight
  BEFORE INSERT ON estimate_item_materials
  FOR EACH ROW
  EXECUTE FUNCTION copy_material_weight();

-- 8. Создаём представление для удобной выборки материалов с весом
CREATE OR REPLACE VIEW v_estimate_materials_with_weight AS
SELECT 
  eim.id,
  eim.estimate_item_id,
  eim.material_id,
  m.sku,
  m.name AS material_name,
  m.unit,
  eim.quantity,
  eim.unit_price,
  eim.total_price,
  eim.weight,
  eim.total_weight,
  eim.consumption_coefficient,
  eim.auto_calculate,
  m.supplier,
  m.category
FROM estimate_item_materials eim
JOIN materials m ON m.id = eim.material_id;

COMMENT ON VIEW v_estimate_materials_with_weight IS 'Представление для выборки материалов сметы с расчётом веса';

-- ============================================
-- ОТКАТ МИГРАЦИИ (если понадобится)
-- ============================================

-- DROP VIEW IF EXISTS v_estimate_materials_with_weight;
-- DROP TRIGGER IF EXISTS trigger_copy_material_weight ON estimate_item_materials;
-- DROP FUNCTION IF EXISTS copy_material_weight();
-- DROP INDEX IF EXISTS idx_estimate_item_materials_weight;
-- ALTER TABLE estimate_item_materials DROP COLUMN IF EXISTS total_weight;
-- ALTER TABLE estimate_item_materials DROP COLUMN IF EXISTS weight;
