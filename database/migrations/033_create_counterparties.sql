-- Migration: 033_create_counterparties.sql
-- Description: Создание таблицы контрагентов (физ. и юр. лица)
-- Date: 2025-10-28

-- ============================================================================
-- ТАБЛИЦА: counterparties - Контрагенты
-- ============================================================================

CREATE TABLE IF NOT EXISTS counterparties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Тип контрагента
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('individual', 'legal')),
    
    -- ============================================================================
    -- ПОЛЯ ДЛЯ ФИЗИЧЕСКОГО ЛИЦА (individual)
    -- ============================================================================
    
    -- ФИО (Обязательный для физ. лица)
    full_name VARCHAR(255),
    
    -- Дата рождения (Обязательный для физ. лица)
    birth_date DATE,
    
    -- Место рождения (Обязательный для физ. лица)
    birth_place TEXT,
    
    -- Паспорт Серия № (Обязательный для физ. лица)
    passport_series_number VARCHAR(50),
    
    -- Кем выдан (Обязательный для физ. лица)
    passport_issued_by TEXT,
    
    -- Когда выдан (Обязательный для физ. лица)
    passport_issue_date DATE,
    
    -- Адрес регистрации (Обязательный для физ. лица)
    registration_address TEXT,
    
    -- ============================================================================
    -- ПОЛЯ ДЛЯ ЮРИДИЧЕСКОГО ЛИЦА (legal)
    -- ============================================================================
    
    -- Наименование организации (Обязательный для юр. лица)
    company_name VARCHAR(500),
    
    -- ИНН (Обязательный для юр. лица)
    inn VARCHAR(12),
    
    -- ОГРН/ОГРНИП (Обязательный для юр. лица)
    ogrn VARCHAR(15),
    
    -- КПП (Обязательный для юр. лица)
    kpp VARCHAR(9),
    
    -- Юридический адрес (Обязательный для юр. лица)
    legal_address TEXT,
    
    -- Фактический адрес (Необязательный)
    actual_address TEXT,
    
    -- ============================================================================
    -- БАНКОВСКИЕ РЕКВИЗИТЫ (для юр. лица)
    -- ============================================================================
    
    -- Расчетный счет
    bank_account VARCHAR(20),
    
    -- Корреспондентский счет
    correspondent_account VARCHAR(20),
    
    -- БИК банка
    bank_bik VARCHAR(9),
    
    -- Наименование банка
    bank_name VARCHAR(500),
    
    -- Директор/Генеральный директор
    director_name VARCHAR(255),
    
    -- Бухгалтер
    accountant_name VARCHAR(255),
    
    -- ============================================================================
    -- КОНТАКТНЫЕ ДАННЫЕ (общие)
    -- ============================================================================
    
    -- Телефон (не обязательный)
    phone VARCHAR(50),
    
    -- Email (не обязательный)
    email VARCHAR(255),
    
    -- ============================================================================
    -- МЕТАДАННЫЕ
    -- ============================================================================
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    
    -- Ограничения
    CONSTRAINT counterparties_unique_individual UNIQUE(tenant_id, passport_series_number),
    CONSTRAINT counterparties_unique_legal UNIQUE(tenant_id, inn)
);

-- ============================================================================
-- ИНДЕКСЫ
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_counterparties_tenant_id ON counterparties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_counterparties_entity_type ON counterparties(entity_type);
CREATE INDEX IF NOT EXISTS idx_counterparties_full_name ON counterparties(full_name) WHERE entity_type = 'individual';
CREATE INDEX IF NOT EXISTS idx_counterparties_company_name ON counterparties(company_name) WHERE entity_type = 'legal';
CREATE INDEX IF NOT EXISTS idx_counterparties_inn ON counterparties(inn) WHERE entity_type = 'legal';
CREATE INDEX IF NOT EXISTS idx_counterparties_phone ON counterparties(phone);
CREATE INDEX IF NOT EXISTS idx_counterparties_email ON counterparties(email);

-- ============================================================================
-- RLS ПОЛИТИКИ
-- ============================================================================

-- Включаем RLS
ALTER TABLE counterparties ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: пользователи видят только своих контрагентов
CREATE POLICY counterparties_select_policy ON counterparties
    FOR SELECT
    USING (tenant_id = current_tenant_id() OR is_super_admin());

-- Политика INSERT: пользователи могут создавать контрагентов только для своего tenant
CREATE POLICY counterparties_insert_policy ON counterparties
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

-- Политика UPDATE: пользователи могут обновлять только своих контрагентов
CREATE POLICY counterparties_update_policy ON counterparties
    FOR UPDATE
    USING (tenant_id = current_tenant_id() OR is_super_admin())
    WITH CHECK (tenant_id = current_tenant_id() OR is_super_admin());

-- Политика DELETE: пользователи могут удалять только своих контрагентов
CREATE POLICY counterparties_delete_policy ON counterparties
    FOR DELETE
    USING (tenant_id = current_tenant_id() OR is_super_admin());

-- ============================================================================
-- КОММЕНТАРИИ
-- ============================================================================

COMMENT ON TABLE counterparties IS 'Контрагенты (физические и юридические лица)';
COMMENT ON COLUMN counterparties.entity_type IS 'Тип: individual (физ. лицо) или legal (юр. лицо)';
COMMENT ON COLUMN counterparties.full_name IS 'ФИО физического лица';
COMMENT ON COLUMN counterparties.company_name IS 'Наименование организации';
COMMENT ON COLUMN counterparties.inn IS 'ИНН (10 цифр для юр. лиц, 12 для ИП)';
COMMENT ON COLUMN counterparties.ogrn IS 'ОГРН (13 цифр) или ОГРНИП (15 цифр)';
COMMENT ON COLUMN counterparties.kpp IS 'КПП (9 цифр, только для юр. лиц)';
