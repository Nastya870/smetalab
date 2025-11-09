-- Migration 020: Add auto_calculate column to estimate_item_materials
-- Добавляем флаг автоматического пересчета количества материала

ALTER TABLE estimate_item_materials
ADD COLUMN IF NOT EXISTS auto_calculate BOOLEAN DEFAULT true;

-- Обновляем существующие записи (устанавливаем true для всех, где NULL)
UPDATE estimate_item_materials
SET auto_calculate = true
WHERE auto_calculate IS NULL;

COMMENT ON COLUMN estimate_item_materials.auto_calculate IS 'Автоматический пересчет количества материала при изменении количества работы';
