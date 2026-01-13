-- =====================================================
-- Миграция 037: Создание таблицы contracts (Договоры)
-- Дата: 06.11.2025
-- Описание: Таблица для хранения договоров с физическими лицами
-- =====================================================

-- ============================================================================
-- ТАБЛИЦА: contracts - Договоры строительного подряда
-- ============================================================================

CREATE TABLE IF NOT EXISTS contracts (
    -- Первичный ключ
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Связи с другими таблицами
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    
    -- Основная информация о договоре
    contract_number VARCHAR(50) NOT NULL,
    contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Стороны договора (контрагенты)
    customer_id UUID REFERENCES counterparties(id) ON DELETE RESTRICT, -- Заказчик (физ. лицо)
    contractor_id UUID REFERENCES counterparties(id) ON DELETE RESTRICT, -- Подрядчик (юр. лицо)
    
    -- Финансовая информация
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    materials_amount DECIMAL(15, 2) DEFAULT 0.00,
    warranty_period VARCHAR(100) DEFAULT '1 год', -- Гарантийный срок
    
    -- Статус договора
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- draft - черновик
    -- active - действующий
    -- completed - выполнен
    -- cancelled - отменен
    
    -- Данные для заполнения шаблона договора (все плейсхолдеры)
    template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Структура template_data:
    -- {
    --   "contractNumber": "ДОГ-20251106-001",
    --   "contractDate": "2025-11-06",
    --   "city": "Москва",
    --   "customerFullName": "Иванов Иван Иванович",
    --   "customerPassportSeries": "4509",
    --   "customerPassportNumber": "123456",
    --   "objectAddress": "г. Москва, ул. Примерная, д. 10",
    --   "objectArea": "150.5",
    --   "totalAmount": "5523006.00",
    --   "stage1Amount": "1012171.00",
    --   ... и т.д. все плейсхолдеры из шаблона
    -- }
    
    -- Ссылка на сгенерированный файл (опционально)
    file_url TEXT, -- URL сгенерированного DOCX файла
    
    -- Метаданные
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Ограничения
    CONSTRAINT contracts_unique_number UNIQUE(tenant_id, contract_number),
    CONSTRAINT contracts_positive_amount CHECK (total_amount >= 0),
    CONSTRAINT contracts_valid_status CHECK (status IN ('draft', 'active', 'completed', 'cancelled'))
);

-- ============================================================================
-- ИНДЕКСЫ
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_estimate_id ON contracts(estimate_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contractor_id ON contracts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_date ON contracts(contract_date DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);

-- Составной индекс для быстрого поиска договора по смете
CREATE INDEX IF NOT EXISTS idx_contracts_estimate_status ON contracts(estimate_id, status);

-- GIN индекс для JSONB поля template_data (для быстрого поиска по плейсхолдерам)
CREATE INDEX IF NOT EXISTS idx_contracts_template_data ON contracts USING GIN (template_data);

-- ============================================================================
-- RLS ПОЛИТИКИ (Row Level Security)
-- ============================================================================

-- Включаем RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: пользователи видят только договоры своего tenant
CREATE POLICY contracts_select_policy ON contracts
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Политика INSERT: пользователи могут создавать договоры только для своего tenant
CREATE POLICY contracts_insert_policy ON contracts
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Политика UPDATE: пользователи могут обновлять только договоры своего tenant
CREATE POLICY contracts_update_policy ON contracts
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Политика DELETE: пользователи могут удалять только договоры своего tenant
CREATE POLICY contracts_delete_policy ON contracts
    FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ============================================================================
-- ТРИГГЕРЫ
-- ============================================================================

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_contracts_updated_at();

-- Триггер для автоматической генерации номера договора (если не указан)
CREATE OR REPLACE FUNCTION generate_contract_number_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Если номер договора не указан, генерируем автоматически
    IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
        NEW.contract_number := generate_contract_number(NEW.tenant_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_contract_number
    BEFORE INSERT ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION generate_contract_number_trigger();

-- ============================================================================
-- КОММЕНТАРИИ
-- ============================================================================

COMMENT ON TABLE contracts IS 'Договоры строительного подряда с физическими лицами';
COMMENT ON COLUMN contracts.contract_number IS 'Уникальный номер договора (формат: ДОГ-YYYYMMDD-XXX)';
COMMENT ON COLUMN contracts.contract_date IS 'Дата заключения договора';
COMMENT ON COLUMN contracts.customer_id IS 'Заказчик - физическое лицо (FK на counterparties)';
COMMENT ON COLUMN contracts.contractor_id IS 'Подрядчик - юридическое лицо (FK на counterparties)';
COMMENT ON COLUMN contracts.total_amount IS 'Общая стоимость работ по договору';
COMMENT ON COLUMN contracts.materials_amount IS 'Стоимость материалов';
COMMENT ON COLUMN contracts.status IS 'Статус: draft, active, completed, cancelled';
COMMENT ON COLUMN contracts.template_data IS 'JSONB данные для заполнения всех плейсхолдеров шаблона договора';
COMMENT ON COLUMN contracts.file_url IS 'URL сгенерированного файла договора (DOCX)';
COMMENT ON COLUMN contracts.warranty_period IS 'Гарантийный срок (по умолчанию 1 год)';

-- ============================================================================
-- SAMPLE DATA (для разработки, закомментировано)
-- ============================================================================

-- INSERT INTO contracts (
--     tenant_id, 
--     project_id, 
--     estimate_id, 
--     contract_number,
--     customer_id,
--     contractor_id,
--     total_amount,
--     status,
--     template_data
-- ) VALUES (
--     'tenant-uuid-here',
--     'project-uuid-here',
--     'estimate-uuid-here',
--     'ДОГ-20251106-001',
--     'customer-uuid-here',
--     'contractor-uuid-here',
--     5523006.00,
--     'draft',
--     '{"contractNumber": "ДОГ-20251106-001", "totalAmount": "5523006.00"}'::jsonb
-- );

