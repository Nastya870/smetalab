-- =====================================================
-- Migration: Add image field to purchases table
-- Description: Добавление поля material_image для хранения URL изображения материала
-- Created: 2025-10-25
-- =====================================================

-- Добавляем колонку material_image
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS material_image TEXT;

-- Добавляем комментарий
COMMENT ON COLUMN purchases.material_image IS 'URL изображения материала (денормализация из materials.image)';

-- Обновляем существующие записи (если есть)
-- Заполняем material_image из таблицы materials
UPDATE purchases p
SET material_image = m.image
FROM materials m
WHERE p.material_id = m.id
  AND m.image IS NOT NULL
  AND m.image != ''
  AND p.material_image IS NULL;

-- Индекс не нужен (поле используется только для отображения)
