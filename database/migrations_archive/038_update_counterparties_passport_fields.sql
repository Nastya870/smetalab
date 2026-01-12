-- Migration: 038_update_counterparties_passport_fields.sql
-- Description: Разделение паспортных данных на отдельные поля
-- Date: 2025-11-09

-- ============================================================================
-- ДОБАВЛЕНИЕ НОВЫХ ПОЛЕЙ ДЛЯ ПАСПОРТНЫХ ДАННЫХ
-- ============================================================================

-- Добавляем серию паспорта (4 цифры)
ALTER TABLE counterparties 
ADD COLUMN IF NOT EXISTS passport_series VARCHAR(4);

-- Добавляем номер паспорта (6 цифр)
ALTER TABLE counterparties 
ADD COLUMN IF NOT EXISTS passport_number VARCHAR(6);

-- Добавляем код подразделения (формат: xxx-xxx)
ALTER TABLE counterparties 
ADD COLUMN IF NOT EXISTS passport_issued_by_code VARCHAR(7);

-- ============================================================================
-- МИГРАЦИЯ СУЩЕСТВУЮЩИХ ДАННЫХ
-- ============================================================================

-- Попытка разделить существующие данные из passport_series_number
-- Формат может быть: "4509123456", "45 09 123456", "4509 123456"
UPDATE counterparties
SET 
    passport_series = SUBSTRING(REGEXP_REPLACE(passport_series_number, '[^0-9]', '', 'g'), 1, 4),
    passport_number = SUBSTRING(REGEXP_REPLACE(passport_series_number, '[^0-9]', '', 'g'), 5, 6)
WHERE 
    entity_type = 'individual' 
    AND passport_series_number IS NOT NULL 
    AND passport_series_number <> ''
    AND LENGTH(REGEXP_REPLACE(passport_series_number, '[^0-9]', '', 'g')) >= 10;

-- ============================================================================
-- КОММЕНТАРИИ К НОВЫМ ПОЛЯМ
-- ============================================================================

COMMENT ON COLUMN counterparties.passport_series IS 'Серия паспорта (4 цифры)';
COMMENT ON COLUMN counterparties.passport_number IS 'Номер паспорта (6 цифр)';
COMMENT ON COLUMN counterparties.passport_issued_by_code IS 'Код подразделения (формат: xxx-xxx)';

-- ============================================================================
-- ПРИМЕЧАНИЕ
-- ============================================================================
-- Старое поле passport_series_number оставляем для обратной совместимости
-- В будущем можно будет удалить после полного перехода на новые поля
-- ALTER TABLE counterparties DROP COLUMN passport_series_number;

