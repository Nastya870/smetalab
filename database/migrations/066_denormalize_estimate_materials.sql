-- Migration 066: Denormalize estimate_item_materials
-- Добавляем material_name, material_sku, material_unit для независимости от справочника

BEGIN;

-- 1. Добавляем новые колонки
ALTER TABLE estimate_item_materials 
  ADD COLUMN IF NOT EXISTS material_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS material_sku VARCHAR(100),
  ADD COLUMN IF NOT EXISTS material_unit VARCHAR(50);

-- 2. Backfill: заполняем данные из таблицы materials
UPDATE estimate_item_materials eim
SET 
  material_name = m.name,
  material_sku = m.sku,
  material_unit = m.unit
FROM materials m
WHERE eim.material_id = m.id
  AND eim.material_name IS NULL;

-- 3. Записываем миграцию
INSERT INTO schema_version (id, applied_at, description)
VALUES (66, NOW(), 'Denormalize estimate_item_materials: add material_name, material_sku, material_unit')
ON CONFLICT (id) DO UPDATE SET
  applied_at = EXCLUDED.applied_at,
  description = EXCLUDED.description;

COMMIT;
