-- ============================================
-- МИГРАЦИЯ: Исправление numeric overflow в materials
-- Дата: 28.12.2025
-- Описание: Увеличение precision для price (10,2 → 12,2)
-- Причина: Ошибка "precision 10, scale 2 must be < 10^8" в getMaterialsStats
-- ============================================

-- БЕЗОПАСНАЯ ОПЕРАЦИЯ: Увеличение precision не требует пересчёта данных
-- PostgreSQL автоматически сохранит все существующие значения

-- 1. Удаляем зависимые представления
DROP VIEW IF EXISTS materials_with_global;
DROP VIEW IF EXISTS v_estimate_materials_with_weight;

-- 2. Увеличиваем precision для price с 10 до 12 знаков
ALTER TABLE materials 
  ALTER COLUMN price TYPE DECIMAL(12, 2);

-- 3. Восстанавливаем представления
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

-- Комментарий для документации
COMMENT ON COLUMN materials.price IS 'Цена материала (макс. 9,999,999,999.99). DECIMAL(12,2) для избежания overflow в агрегатах.';
COMMENT ON VIEW materials_with_global IS 'Объединённый view глобальных и тенантных материалов';
COMMENT ON VIEW v_estimate_materials_with_weight IS 'Представление для выборки материалов сметы с расчётом веса';
