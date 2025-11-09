-- Migration: 031_create_work_completion_acts.sql
-- Description: Создание таблиц для актов выполненных работ (для заказчика и специалиста)
-- Date: 2025-10-28

-- ============================================================================
-- ТАБЛИЦА: work_completion_acts - Основная таблица актов
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_completion_acts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Тип акта
    act_type VARCHAR(20) NOT NULL CHECK (act_type IN ('client', 'specialist')),
    
    -- Номер и дата акта
    act_number VARCHAR(50) NOT NULL,
    act_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Период выполнения работ
    period_from DATE,
    period_to DATE,
    
    -- Финансовые данные
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_quantity DECIMAL(15, 2) NOT NULL DEFAULT 0,
    work_count INTEGER DEFAULT 0,
    
    -- Статус акта
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'signed', 'cancelled')),
    
    -- Дополнительная информация
    notes TEXT,
    
    -- Метаданные
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    
    -- Ограничения
    CONSTRAINT work_completion_acts_unique UNIQUE(tenant_id, estimate_id, act_type, act_number)
);

-- ============================================================================
-- ТАБЛИЦА: work_completion_act_items - Позиции актов (работы)
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_completion_act_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    act_id UUID NOT NULL REFERENCES work_completion_acts(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Ссылка на работу в смете
    estimate_item_id UUID NOT NULL,
    work_id INTEGER REFERENCES works(id),
    
    -- Данные работы
    work_code VARCHAR(50),
    work_name TEXT NOT NULL,
    section VARCHAR(255),
    subsection VARCHAR(255),
    unit VARCHAR(50),
    
    -- Количество и цены
    planned_quantity DECIMAL(15, 2), -- План (для справки)
    actual_quantity DECIMAL(15, 2) NOT NULL, -- Факт
    unit_price DECIMAL(15, 2) NOT NULL, -- Цена (заказчика или специалиста)
    total_price DECIMAL(15, 2) NOT NULL, -- Сумма = actual_quantity × unit_price
    
    -- Позиция в документе
    position_number INTEGER,
    
    -- Метаданные
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ИНДЕКСЫ
-- ============================================================================

-- Индексы для work_completion_acts
CREATE INDEX IF NOT EXISTS idx_acts_estimate_id ON work_completion_acts(estimate_id);
CREATE INDEX IF NOT EXISTS idx_acts_tenant_id ON work_completion_acts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acts_project_id ON work_completion_acts(project_id);
CREATE INDEX IF NOT EXISTS idx_acts_type ON work_completion_acts(act_type);
CREATE INDEX IF NOT EXISTS idx_acts_status ON work_completion_acts(status);
CREATE INDEX IF NOT EXISTS idx_acts_date ON work_completion_acts(act_date);

-- Индексы для work_completion_act_items
CREATE INDEX IF NOT EXISTS idx_act_items_act_id ON work_completion_act_items(act_id);
CREATE INDEX IF NOT EXISTS idx_act_items_tenant_id ON work_completion_act_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_act_items_estimate_item_id ON work_completion_act_items(estimate_item_id);
CREATE INDEX IF NOT EXISTS idx_act_items_section ON work_completion_act_items(section);

-- ============================================================================
-- ТРИГГЕРЫ
-- ============================================================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_work_completion_acts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для work_completion_acts
DROP TRIGGER IF EXISTS trigger_update_work_completion_acts_updated_at ON work_completion_acts;
CREATE TRIGGER trigger_update_work_completion_acts_updated_at
    BEFORE UPDATE ON work_completion_acts
    FOR EACH ROW
    EXECUTE FUNCTION update_work_completion_acts_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Включаем RLS для обеих таблиц
ALTER TABLE work_completion_acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_completion_act_items ENABLE ROW LEVEL SECURITY;

-- Политики для work_completion_acts
CREATE POLICY work_completion_acts_tenant_isolation ON work_completion_acts
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY work_completion_acts_tenant_insert ON work_completion_acts
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Политики для work_completion_act_items
CREATE POLICY work_completion_act_items_tenant_isolation ON work_completion_act_items
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY work_completion_act_items_tenant_insert ON work_completion_act_items
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================================
-- КОММЕНТАРИИ
-- ============================================================================

-- Комментарии к таблице work_completion_acts
COMMENT ON TABLE work_completion_acts IS 'Акты выполненных работ (для заказчика и специалиста)';
COMMENT ON COLUMN work_completion_acts.act_type IS 'Тип акта: client (для заказчика) или specialist (для специалиста)';
COMMENT ON COLUMN work_completion_acts.act_number IS 'Номер акта (уникальный в рамках tenant и типа)';
COMMENT ON COLUMN work_completion_acts.total_amount IS 'Общая сумма акта';
COMMENT ON COLUMN work_completion_acts.work_count IS 'Количество работ в акте';
COMMENT ON COLUMN work_completion_acts.status IS 'Статус: draft (черновик), approved (утвержден), signed (подписан), cancelled (отменен)';

-- Комментарии к таблице work_completion_act_items
COMMENT ON TABLE work_completion_act_items IS 'Позиции (работы) в актах выполненных работ';
COMMENT ON COLUMN work_completion_act_items.actual_quantity IS 'Фактическое количество выполненной работы';
COMMENT ON COLUMN work_completion_act_items.unit_price IS 'Цена за единицу (цена заказчика для актов client, базовая цена для актов specialist)';
COMMENT ON COLUMN work_completion_act_items.total_price IS 'Сумма = actual_quantity × unit_price';
