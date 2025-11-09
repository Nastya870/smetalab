-- Migration: 034_add_ks2_ks3_fields.sql
-- Description: Добавление полей для официальных форм КС-2 и КС-3 (ОКУД 0322005, 0322006)
-- Date: 2025-10-28

-- ============================================================================
-- РАСШИРЕНИЕ work_completion_acts ДЛЯ ФОРМ КС-2 И КС-3
-- ============================================================================

-- Добавление полей реквизитов сторон
ALTER TABLE work_completion_acts
ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES counterparties(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contractor_name VARCHAR(500),
ADD COLUMN IF NOT EXISTS contractor_inn VARCHAR(12),
ADD COLUMN IF NOT EXISTS contractor_kpp VARCHAR(9),
ADD COLUMN IF NOT EXISTS contractor_ogrn VARCHAR(15),
ADD COLUMN IF NOT EXISTS contractor_address TEXT,

ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES counterparties(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(500),
ADD COLUMN IF NOT EXISTS customer_inn VARCHAR(12),
ADD COLUMN IF NOT EXISTS customer_kpp VARCHAR(9),
ADD COLUMN IF NOT EXISTS customer_ogrn VARCHAR(15),
ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Добавление полей договора
ALTER TABLE work_completion_acts
ADD COLUMN IF NOT EXISTS contract_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS contract_date DATE,
ADD COLUMN IF NOT EXISTS contract_subject TEXT;

-- Добавление полей объекта строительства
ALTER TABLE work_completion_acts
ADD COLUMN IF NOT EXISTS construction_object VARCHAR(500),
ADD COLUMN IF NOT EXISTS construction_address TEXT,
ADD COLUMN IF NOT EXISTS construction_okpd VARCHAR(20); -- Код ОКПД2

-- Тип формы (для гибкости)
ALTER TABLE work_completion_acts
ADD COLUMN IF NOT EXISTS form_type VARCHAR(10) DEFAULT 'ks2-ks3' 
  CHECK (form_type IN ('ks2-ks3', 'custom', 'simplified'));

-- Поля для подписантов (для КС-2)
ALTER TABLE work_completion_acts
ADD COLUMN IF NOT EXISTS chief_contractor_name VARCHAR(255), -- Руководитель подрядчика
ADD COLUMN IF NOT EXISTS chief_contractor_position VARCHAR(255),
ADD COLUMN IF NOT EXISTS chief_customer_name VARCHAR(255), -- Руководитель заказчика
ADD COLUMN IF NOT EXISTS chief_customer_position VARCHAR(255),
ADD COLUMN IF NOT EXISTS inspector_name VARCHAR(255), -- Уполномоченный представитель
ADD COLUMN IF NOT EXISTS inspector_position VARCHAR(255);

-- Дополнительные суммы (для КС-3)
ALTER TABLE work_completion_acts
ADD COLUMN IF NOT EXISTS total_amount_ytd DECIMAL(15, 2), -- Всего с начала года
ADD COLUMN IF NOT EXISTS prev_period_amount DECIMAL(15, 2), -- В том числе за предыдущие периоды
ADD COLUMN IF NOT EXISTS current_period_amount DECIMAL(15, 2); -- В текущем периоде

-- ============================================================================
-- ТАБЛИЦА: act_signatories - Подписанты актов
-- ============================================================================

CREATE TABLE IF NOT EXISTS act_signatories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    act_id UUID NOT NULL REFERENCES work_completion_acts(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Роль подписанта
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'contractor_chief',      -- Руководитель подрядчика
        'contractor_accountant', -- Главбух подрядчика
        'customer_chief',        -- Руководитель заказчика
        'customer_inspector',    -- Представитель заказчика
        'technical_supervisor'   -- Технический надзор
    )),
    
    -- Данные подписанта
    full_name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    
    -- Дата подписи
    signed_at DATE,
    
    -- Метаданные
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ИНДЕКСЫ
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_act_signatories_act_id ON act_signatories(act_id);
CREATE INDEX IF NOT EXISTS idx_act_signatories_tenant_id ON act_signatories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_act_signatories_role ON act_signatories(role);

CREATE INDEX IF NOT EXISTS idx_acts_contractor_id ON work_completion_acts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_acts_customer_id ON work_completion_acts(customer_id);
CREATE INDEX IF NOT EXISTS idx_acts_contract_number ON work_completion_acts(contract_number);
CREATE INDEX IF NOT EXISTS idx_acts_form_type ON work_completion_acts(form_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE act_signatories ENABLE ROW LEVEL SECURITY;

CREATE POLICY act_signatories_tenant_isolation ON act_signatories
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY act_signatories_tenant_insert ON act_signatories
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================================
-- КОММЕНТАРИИ
-- ============================================================================

-- Комментарии к новым полям work_completion_acts
COMMENT ON COLUMN work_completion_acts.contractor_id IS 'Ссылка на контрагента-подрядчика';
COMMENT ON COLUMN work_completion_acts.customer_id IS 'Ссылка на контрагента-заказчика';
COMMENT ON COLUMN work_completion_acts.form_type IS 'Тип формы: ks2-ks3 (официальные), custom (произвольная), simplified (упрощенная)';
COMMENT ON COLUMN work_completion_acts.construction_object IS 'Наименование объекта строительства';
COMMENT ON COLUMN work_completion_acts.construction_okpd IS 'Код ОКПД2 для объекта строительства';
COMMENT ON COLUMN work_completion_acts.total_amount_ytd IS 'КС-3: Всего с начала года';
COMMENT ON COLUMN work_completion_acts.prev_period_amount IS 'КС-3: За предыдущие периоды';
COMMENT ON COLUMN work_completion_acts.current_period_amount IS 'КС-3: В текущем периоде (текущий акт)';

-- Комментарии к таблице act_signatories
COMMENT ON TABLE act_signatories IS 'Подписанты актов выполненных работ (КС-2)';
COMMENT ON COLUMN act_signatories.role IS 'Роль: contractor_chief, contractor_accountant, customer_chief, customer_inspector, technical_supervisor';
COMMENT ON COLUMN act_signatories.signed_at IS 'Дата подписания акта';

-- ============================================================================
-- ФУНКЦИЯ: Автоматическое заполнение данных контрагентов
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_counterparty_details()
RETURNS TRIGGER AS $$
BEGIN
    -- Если указан contractor_id, заполняем данные подрядчика
    IF NEW.contractor_id IS NOT NULL AND NEW.contractor_name IS NULL THEN
        SELECT 
            COALESCE(company_name, full_name),
            inn,
            kpp,
            ogrn,
            COALESCE(legal_address, registration_address)
        INTO 
            NEW.contractor_name,
            NEW.contractor_inn,
            NEW.contractor_kpp,
            NEW.contractor_ogrn,
            NEW.contractor_address
        FROM counterparties
        WHERE id = NEW.contractor_id
          AND tenant_id = NEW.tenant_id;
    END IF;
    
    -- Если указан customer_id, заполняем данные заказчика
    IF NEW.customer_id IS NOT NULL AND NEW.customer_name IS NULL THEN
        SELECT 
            COALESCE(company_name, full_name),
            inn,
            kpp,
            ogrn,
            COALESCE(legal_address, registration_address)
        INTO 
            NEW.customer_name,
            NEW.customer_inn,
            NEW.customer_kpp,
            NEW.customer_ogrn,
            NEW.customer_address
        FROM counterparties
        WHERE id = NEW.customer_id
          AND tenant_id = NEW.tenant_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автозаполнения
DROP TRIGGER IF EXISTS trigger_populate_counterparty_details ON work_completion_acts;
CREATE TRIGGER trigger_populate_counterparty_details
    BEFORE INSERT OR UPDATE ON work_completion_acts
    FOR EACH ROW
    EXECUTE FUNCTION populate_counterparty_details();

-- ============================================================================
-- СПРАВОЧНАЯ ИНФОРМАЦИЯ
-- ============================================================================

-- Формы КС-2 и КС-3 утверждены Постановлением Госкомстата РФ от 11.11.1999 № 100
-- 
-- КС-2 (ОКУД 0322005): Акт о приемке выполненных работ
--   - Используется для приемки выполненных строительно-монтажных работ
--   - Содержит перечень работ с объемами и стоимостью
--   - Подписывается подрядчиком и заказчиком
--
-- КС-3 (ОКУД 0322006): Справка о стоимости выполненных работ и затрат
--   - Используется для расчетов по выполненным работам
--   - Показывает стоимость работ нарастающим итогом с начала года
--   - Является основанием для оплаты
--
-- Обязательные реквизиты:
--   1. Наименование и реквизиты подрядчика и заказчика
--   2. Номер и дата договора
--   3. Наименование объекта строительства
--   4. Период выполнения работ
--   5. Перечень работ с количеством и стоимостью
--   6. Подписи уполномоченных лиц
