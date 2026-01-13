-- Migration: Add category column to works table
-- Date: 2025-12-28
-- Description: Добавляет колонку category в таблицу works для группировки работ по категориям

-- Добавляем колонку category (nullable)
ALTER TABLE works 
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Устанавливаем значение по умолчанию для существующих записей (опционально)
UPDATE works 
SET category = 'Общие работы' 
WHERE category IS NULL AND is_global = true;

-- Создаем индекс для быстрого поиска по категориям
CREATE INDEX IF NOT EXISTS idx_works_category ON works(category) WHERE category IS NOT NULL;

-- Комментарий
COMMENT ON COLUMN works.category IS 'Категория работы для группировки (например: Земляные работы, Бетонные работы). Необязательное поле.';
