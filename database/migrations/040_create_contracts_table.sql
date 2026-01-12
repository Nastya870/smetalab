-- =====================================================
-- 040: Создание таблицы contracts (Договоры)
-- =====================================================
-- Описание: Таблица для хранения договоров между Заказчиком (физ. лицо) и Подрядчиком (юр. лицо)
-- Договор привязан к проекту и смете, содержит автозаполненные данные из counterparties
-- =====================================================

CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Связи с другими таблицами
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES counterparties(id), -- Заказчик (физ. лицо)
    contractor_id UUID NOT NULL REFERENCES counterparties(id), -- Подрядчик (юр. лицо)
    
    -- Основная информация о договоре
    contract_number VARCHAR(100) NOT NULL, -- Номер договора (генерируется автоматически или задается)
    contract_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Дата заключения договора
    
    -- Финансовая информация
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Общая стоимость по договору (из сметы)
    
    -- Статус договора
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- Возможные значения: draft, active, completed, cancelled
    
    -- Данные для шаблона (JSON с автозаполненными полями)
    template_data JSONB DEFAULT '{}',
    -- Содержит:
    -- - Данные заказчика (ФИО, паспорт, адрес, телефон)
    -- - Данные подрядчика (название, ИНН, ОГРН, адрес, телефон, директор)
    -- - Данные проекта (название объекта, адрес, описание)
    -- - Данные сметы (работы, материалы, стоимость)
    -- - Дополнительные условия (сроки, порядок оплаты, гарантии)
    
    -- Временные метки
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ограничения
    CONSTRAINT check_status CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    CONSTRAINT check_total_amount CHECK (total_amount >= 0),
    
    -- Уникальность: один договор на смету
    CONSTRAINT unique_contract_per_estimate UNIQUE (estimate_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_contracts_estimate_id ON contracts(estimate_id);
CREATE INDEX idx_contracts_project_id ON contracts(project_id);
CREATE INDEX idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX idx_contracts_contractor_id ON contracts(contractor_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX idx_contracts_created_at ON contracts(created_at);

-- Триггер автоматического обновления updated_at
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

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Включаем RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: пользователи видят только договоры своей компании
CREATE POLICY contracts_tenant_isolation ON contracts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = contracts.project_id
            AND (p.tenant_id = current_tenant_id() OR is_super_admin())
        )
    );

-- Комментарии к таблице и столбцам
COMMENT ON TABLE contracts IS 'Договоры между Заказчиком (физ. лицо) и Подрядчиком (юр. лицо)';
COMMENT ON COLUMN contracts.id IS 'Уникальный идентификатор договора';
COMMENT ON COLUMN contracts.estimate_id IS 'ID сметы (привязка к estimate)';
COMMENT ON COLUMN contracts.project_id IS 'ID проекта (привязка к project)';
COMMENT ON COLUMN contracts.customer_id IS 'ID заказчика из counterparties (физ. лицо)';
COMMENT ON COLUMN contracts.contractor_id IS 'ID подрядчика из counterparties (юр. лицо)';
COMMENT ON COLUMN contracts.contract_number IS 'Номер договора (например: Д-2025-001)';
COMMENT ON COLUMN contracts.contract_date IS 'Дата заключения договора';
COMMENT ON COLUMN contracts.total_amount IS 'Общая стоимость работ по договору (копируется из сметы)';
COMMENT ON COLUMN contracts.status IS 'Статус: draft (черновик), active (действующий), completed (выполнен), cancelled (отменен)';
COMMENT ON COLUMN contracts.template_data IS 'JSON с автозаполненными данными для шаблона договора';
COMMENT ON COLUMN contracts.created_at IS 'Дата создания записи';
COMMENT ON COLUMN contracts.updated_at IS 'Дата последнего обновления';

-- Успешное завершение
SELECT 'Migration 040: contracts table created successfully!' as status;
