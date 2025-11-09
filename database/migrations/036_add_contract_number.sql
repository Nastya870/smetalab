-- =====================================================
-- Миграция 036: Добавление номера договора в projects
-- Дата: 29.10.2025
-- Описание: Добавляем поле contract_number с автогенерацией
-- =====================================================

-- Добавляем поле для номера договора
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_number VARCHAR(50);

-- Добавляем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_projects_contract_number ON projects(contract_number) WHERE contract_number IS NOT NULL;

-- Добавляем уникальность номера договора в рамках тенанта
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_tenant_contract_number 
ON projects(tenant_id, contract_number) 
WHERE contract_number IS NOT NULL;

-- Комментарий
COMMENT ON COLUMN projects.contract_number IS 'Номер договора (автогенерируется при создании)';

-- Функция для генерации номера договора
-- Формат: ДОГ-YYYYMMDD-XXX (например: ДОГ-20251029-001)
CREATE OR REPLACE FUNCTION generate_contract_number(p_tenant_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
    v_date_part VARCHAR(8);
    v_counter INTEGER;
    v_contract_number VARCHAR(50);
BEGIN
    -- Формируем дату YYYYMMDD
    v_date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Получаем следующий номер для этой даты
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(contract_number FROM 'ДОГ-[0-9]+-([0-9]+)') 
            AS INTEGER
        )
    ), 0) + 1
    INTO v_counter
    FROM projects
    WHERE tenant_id = p_tenant_id
      AND contract_number LIKE 'ДОГ-' || v_date_part || '-%';
    
    -- Формируем итоговый номер
    v_contract_number := 'ДОГ-' || v_date_part || '-' || LPAD(v_counter::TEXT, 3, '0');
    
    RETURN v_contract_number;
END;
$$;

COMMENT ON FUNCTION generate_contract_number(UUID) IS 'Генерация уникального номера договора для проекта';
