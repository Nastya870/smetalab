-- Миграция: Добавить поле source_type в estimate_items
-- Дата: 13.10.2025
-- Описание: Добавляет информацию об источнике работы (глобальная или тенантная)

-- Добавляем колонку source_type
ALTER TABLE estimate_items 
ADD COLUMN source_type TEXT DEFAULT 'tenant' CHECK (source_type IN ('global', 'tenant'));

COMMENT ON COLUMN estimate_items.source_type IS 'Источник работы: global - из глобального справочника, tenant - из тенантного справочника';

-- Обновляем существующие записи (по умолчанию ставим tenant)
UPDATE estimate_items SET source_type = 'tenant' WHERE source_type IS NULL;

-- Делаем колонку NOT NULL
ALTER TABLE estimate_items ALTER COLUMN source_type SET NOT NULL;
