-- =====================================================
-- МИГРАЦИЯ: Создание таблиц для смет
-- Версия: 004
-- Описание: Таблицы estimates (сметы) и estimate_items (позиции смет)
-- =====================================================

-- =====================================================
-- ТАБЛИЦА: estimates (сметы)
-- =====================================================
CREATE TABLE estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- Основная информация
    number TEXT NOT NULL, -- Номер сметы (генерируется автоматически)
    title TEXT NOT NULL, -- Название сметы
    description TEXT, -- Описание сметы
    
    -- Статус
    status TEXT DEFAULT 'draft', -- draft, in_review, approved, rejected, completed
    
    -- Финансы
    total_amount DECIMAL(15, 2) DEFAULT 0, -- Общая сумма
    currency TEXT DEFAULT 'RUB', -- Валюта (RUB, USD, EUR)
    
    -- Клиент/Проект
    client_name TEXT, -- Название клиента
    client_contact TEXT, -- Контакт клиента
    project_name TEXT, -- Название проекта
    project_address TEXT, -- Адрес объекта
    
    -- Даты
    estimate_date DATE, -- Дата сметы
    valid_until DATE, -- Действительна до
    approved_at TIMESTAMPTZ, -- Дата утверждения
    approved_by UUID REFERENCES users(id), -- Кто утвердил
    
    -- Метаданные
    notes TEXT, -- Примечания
    tags TEXT[], -- Теги для поиска
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT estimates_status_check CHECK (status IN ('draft', 'in_review', 'approved', 'rejected', 'completed')),
    CONSTRAINT estimates_currency_check CHECK (currency IN ('RUB', 'USD', 'EUR', 'KZT')),
    CONSTRAINT estimates_amount_check CHECK (total_amount >= 0)
);

COMMENT ON TABLE estimates IS 'Сметы/калькуляции проектов';
COMMENT ON COLUMN estimates.number IS 'Номер сметы (уникальный в рамках tenant)';
COMMENT ON COLUMN estimates.status IS 'Статус сметы: черновик, на проверке, утверждена, отклонена, завершена';
COMMENT ON COLUMN estimates.total_amount IS 'Общая сумма сметы (рассчитывается автоматически)';

-- =====================================================
-- ТАБЛИЦА: estimate_items (позиции сметы)
-- =====================================================
CREATE TABLE estimate_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    
    -- Позиция
    position_number INTEGER NOT NULL, -- Порядковый номер позиции
    
    -- Описание работ/материалов
    item_type TEXT NOT NULL, -- work, material, service, equipment
    name TEXT NOT NULL, -- Название позиции
    description TEXT, -- Подробное описание
    
    -- Единицы измерения
    unit TEXT NOT NULL, -- м2, м3, шт, кг, тонна, час и т.д.
    quantity DECIMAL(15, 3) NOT NULL, -- Количество
    
    -- Цены
    unit_price DECIMAL(15, 2) NOT NULL, -- Цена за единицу
    total_price DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED, -- Общая стоимость позиции
    
    -- Дополнительные расходы
    overhead_percent DECIMAL(5, 2) DEFAULT 0, -- Накладные расходы %
    profit_percent DECIMAL(5, 2) DEFAULT 0, -- Прибыль %
    tax_percent DECIMAL(5, 2) DEFAULT 0, -- НДС %
    
    -- Итоговая стоимость с учетом всех надбавок
    final_price DECIMAL(15, 2),
    
    -- Метаданные
    notes TEXT, -- Примечания к позиции
    is_optional BOOLEAN DEFAULT FALSE, -- Опциональная позиция
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT estimate_items_type_check CHECK (item_type IN ('work', 'material', 'service', 'equipment', 'other')),
    CONSTRAINT estimate_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT estimate_items_price_check CHECK (unit_price >= 0)
);

COMMENT ON TABLE estimate_items IS 'Позиции (строки) в сметах';
COMMENT ON COLUMN estimate_items.position_number IS 'Порядковый номер позиции в смете';
COMMENT ON COLUMN estimate_items.item_type IS 'Тип позиции: работа, материал, услуга, оборудование';
COMMENT ON COLUMN estimate_items.final_price IS 'Итоговая цена с учетом накладных, прибыли и налогов';

-- =====================================================
-- ИНДЕКСЫ
-- =====================================================

-- Индексы для estimates
CREATE INDEX idx_estimates_tenant_id ON estimates(tenant_id);
CREATE INDEX idx_estimates_created_by ON estimates(created_by);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_number ON estimates(tenant_id, number);
CREATE INDEX idx_estimates_date ON estimates(estimate_date DESC);
CREATE INDEX idx_estimates_client ON estimates(tenant_id, client_name);
CREATE INDEX idx_estimates_created_at ON estimates(created_at DESC);

-- Индексы для estimate_items
CREATE INDEX idx_estimate_items_estimate_id ON estimate_items(estimate_id);
CREATE INDEX idx_estimate_items_type ON estimate_items(item_type);
CREATE INDEX idx_estimate_items_position ON estimate_items(estimate_id, position_number);

-- =====================================================
-- ФУНКЦИИ
-- =====================================================

/**
 * Функция для автоматического обновления updated_at
 */
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автообновления updated_at
CREATE TRIGGER update_estimates_updated_at
    BEFORE UPDATE ON estimates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimate_items_updated_at
    BEFORE UPDATE ON estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

/**
 * Функция для автоматического пересчета total_amount в смете
 */
CREATE OR REPLACE FUNCTION recalculate_estimate_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE estimates
    SET total_amount = (
        SELECT COALESCE(SUM(COALESCE(final_price, total_price)), 0)
        FROM estimate_items
        WHERE estimate_id = COALESCE(NEW.estimate_id, OLD.estimate_id)
    )
    WHERE id = COALESCE(NEW.estimate_id, OLD.estimate_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автопересчета суммы сметы
CREATE TRIGGER recalculate_on_insert
    AFTER INSERT ON estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_estimate_total();

CREATE TRIGGER recalculate_on_update
    AFTER UPDATE ON estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_estimate_total();

CREATE TRIGGER recalculate_on_delete
    AFTER DELETE ON estimate_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_estimate_total();

/**
 * Функция для генерации номера сметы
 */
CREATE OR REPLACE FUNCTION generate_estimate_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
    v_year TEXT;
    v_number TEXT;
BEGIN
    -- Получаем текущий год
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Считаем количество смет за текущий год
    SELECT COUNT(*) + 1 INTO v_count
    FROM estimates
    WHERE tenant_id = p_tenant_id
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Формируем номер: SMT-2025-0001
    v_number := 'SMT-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
    
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_estimate_number IS 'Генерирует уникальный номер сметы в формате SMT-YYYY-NNNN';

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Включаем RLS для estimates
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

-- Политика для суперадмина (доступ ко всем)
CREATE POLICY estimates_super_admin_all ON estimates
    FOR ALL
    USING (is_super_admin());

-- Политика для просмотра (только своя компания)
CREATE POLICY estimates_tenant_select ON estimates
    FOR SELECT
    USING (tenant_id = current_tenant_id());

-- Политика для создания (только в своей компании)
CREATE POLICY estimates_tenant_insert ON estimates
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id());

-- Политика для обновления (только своя компания)
CREATE POLICY estimates_tenant_update ON estimates
    FOR UPDATE
    USING (tenant_id = current_tenant_id());

-- Политика для удаления (только своя компания)
CREATE POLICY estimates_tenant_delete ON estimates
    FOR DELETE
    USING (tenant_id = current_tenant_id());

-- Включаем RLS для estimate_items
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;

-- Политика для суперадмина
CREATE POLICY estimate_items_super_admin_all ON estimate_items
    FOR ALL
    USING (is_super_admin());

-- Политики для позиций смет (через связь с estimates)
CREATE POLICY estimate_items_tenant_select ON estimate_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM estimates e
            WHERE e.id = estimate_items.estimate_id
              AND e.tenant_id = current_tenant_id()
        )
    );

CREATE POLICY estimate_items_tenant_insert ON estimate_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM estimates e
            WHERE e.id = estimate_items.estimate_id
              AND e.tenant_id = current_tenant_id()
        )
    );

CREATE POLICY estimate_items_tenant_update ON estimate_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM estimates e
            WHERE e.id = estimate_items.estimate_id
              AND e.tenant_id = current_tenant_id()
        )
    );

CREATE POLICY estimate_items_tenant_delete ON estimate_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM estimates e
            WHERE e.id = estimate_items.estimate_id
              AND e.tenant_id = current_tenant_id()
        )
    );

-- =====================================================
-- ПРЕДСТАВЛЕНИЯ
-- =====================================================

/**
 * Представление для смет с дополнительной информацией
 */
CREATE OR REPLACE VIEW v_estimates_with_details AS
SELECT 
    e.*,
    t.name as tenant_name,
    u.full_name as creator_name,
    u.email as creator_email,
    a.full_name as approver_name,
    COUNT(ei.id) as items_count,
    COALESCE(SUM(ei.quantity), 0) as total_quantity
FROM estimates e
JOIN tenants t ON e.tenant_id = t.id
JOIN users u ON e.created_by = u.id
LEFT JOIN users a ON e.approved_by = a.id
LEFT JOIN estimate_items ei ON e.id = ei.estimate_id
GROUP BY e.id, t.name, u.full_name, u.email, a.full_name;

COMMENT ON VIEW v_estimates_with_details IS 'Сметы с дополнительной информацией о тенанте, создателе и количестве позиций';

-- =====================================================
-- ГОТОВО
-- =====================================================
