-- Migration: 030_create_work_completion_table.sql
-- Description: Создание таблицы для учета фактически выполненных работ
-- Date: 2025-10-27

-- Таблица для хранения фактов выполнения работ по смете
CREATE TABLE IF NOT EXISTS work_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    estimate_item_id UUID NOT NULL, -- ID позиции в смете (из estimate_items)
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Данные о выполнении
    completed BOOLEAN DEFAULT FALSE, -- Выполнена ли работа
    actual_quantity DECIMAL(15, 2) DEFAULT 0, -- Фактическое количество
    actual_total DECIMAL(15, 2) DEFAULT 0, -- Фактическая сумма
    
    -- Дополнительная информация
    completion_date TIMESTAMPTZ, -- Дата выполнения
    notes TEXT, -- Комментарии/заметки
    
    -- Метаданные
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Ограничения
    CONSTRAINT work_completions_estimate_item_unique UNIQUE(estimate_id, estimate_item_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_work_completions_estimate_id ON work_completions(estimate_id);
CREATE INDEX IF NOT EXISTS idx_work_completions_tenant_id ON work_completions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_completions_completed ON work_completions(completed);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_work_completions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_work_completions_updated_at ON work_completions;
CREATE TRIGGER trigger_update_work_completions_updated_at
    BEFORE UPDATE ON work_completions
    FOR EACH ROW
    EXECUTE FUNCTION update_work_completions_updated_at();

-- RLS (Row Level Security) политики
ALTER TABLE work_completions ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои записи
CREATE POLICY work_completions_tenant_isolation ON work_completions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Политика: пользователи могут создавать записи только для своего tenant
CREATE POLICY work_completions_tenant_insert ON work_completions
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Комментарии к таблице
COMMENT ON TABLE work_completions IS 'Учет фактически выполненных работ по сметам';
COMMENT ON COLUMN work_completions.completed IS 'Отметка о выполнении работы';
COMMENT ON COLUMN work_completions.actual_quantity IS 'Фактическое количество выполненной работы';
COMMENT ON COLUMN work_completions.actual_total IS 'Фактическая стоимость (количество × цена)';
COMMENT ON COLUMN work_completions.completion_date IS 'Дата фактического выполнения работы';
