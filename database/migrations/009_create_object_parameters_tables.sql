-- =====================================================
-- Migration 009: Create Object Parameters Tables
-- Description: Создание таблиц для параметров помещений и проемов
-- Author: System
-- Date: 2025-10-13
-- =====================================================

-- ============================================
-- 1. Создание таблицы object_parameters
-- ============================================

CREATE TABLE IF NOT EXISTS object_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Связи
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    
    -- Порядковый номер строки
    position_number INTEGER NOT NULL,
    
    -- Основные параметры помещения
    room_name VARCHAR(255) NOT NULL,
    perimeter DECIMAL(10, 2),
    height DECIMAL(10, 2),
    floor_area DECIMAL(10, 2),
    wall_area DECIMAL(10, 2),
    ceiling_area DECIMAL(10, 2),
    ceiling_slopes DECIMAL(10, 2),
    doors_count INTEGER DEFAULT 0,
    baseboards DECIMAL(10, 2),
    
    -- Суммарное значение откосов окон (вычисляемое)
    total_window_slopes DECIMAL(10, 2) DEFAULT 0,
    
    -- Метаданные
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Ограничения
    CONSTRAINT object_parameters_position_check CHECK (position_number > 0),
    CONSTRAINT object_parameters_unique_position UNIQUE (estimate_id, position_number)
);

-- Индексы для object_parameters
CREATE INDEX idx_object_parameters_tenant ON object_parameters(tenant_id);
CREATE INDEX idx_object_parameters_estimate ON object_parameters(estimate_id);
CREATE INDEX idx_object_parameters_tenant_estimate ON object_parameters(tenant_id, estimate_id); -- Композитный для WHERE tenant_id AND estimate_id
CREATE INDEX idx_object_parameters_position ON object_parameters(estimate_id, position_number);

-- Комментарии для object_parameters
COMMENT ON TABLE object_parameters IS 'Параметры помещений в смете';
COMMENT ON COLUMN object_parameters.room_name IS 'Название помещения';
COMMENT ON COLUMN object_parameters.perimeter IS 'Периметр помещения в метрах';
COMMENT ON COLUMN object_parameters.height IS 'Высота помещения в метрах';
COMMENT ON COLUMN object_parameters.floor_area IS 'Площадь пола в м²';
COMMENT ON COLUMN object_parameters.wall_area IS 'Площадь стен в м²';
COMMENT ON COLUMN object_parameters.ceiling_area IS 'Площадь потолка в м²';
COMMENT ON COLUMN object_parameters.ceiling_slopes IS 'Откосы потолка в метрах';
COMMENT ON COLUMN object_parameters.doors_count IS 'Количество дверей';
COMMENT ON COLUMN object_parameters.baseboards IS 'Простенки (плинтус) в метрах';
COMMENT ON COLUMN object_parameters.total_window_slopes IS 'Суммарная длина откосов окон в метрах (вычисляется автоматически)';

-- ============================================
-- 2. Создание таблицы object_openings
-- ============================================

CREATE TABLE IF NOT EXISTS object_openings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Связи
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parameter_id UUID NOT NULL REFERENCES object_parameters(id) ON DELETE CASCADE,
    
    -- Тип проема
    opening_type VARCHAR(50) NOT NULL CHECK (opening_type IN ('window', 'portal')),
    
    -- Порядковый номер проема внутри помещения
    position_number INTEGER NOT NULL,
    
    -- Размеры проема
    height DECIMAL(10, 2) NOT NULL,
    width DECIMAL(10, 2) NOT NULL,
    
    -- Вычисляемая длина откосов (Ш + В*2)
    slope_length DECIMAL(10, 2) GENERATED ALWAYS AS (width + (height * 2)) STORED,
    
    -- Метаданные
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ограничения
    CONSTRAINT object_openings_position_check CHECK (position_number > 0),
    CONSTRAINT object_openings_dimensions_check CHECK (height > 0 AND width > 0),
    CONSTRAINT object_openings_unique_position UNIQUE (parameter_id, opening_type, position_number)
);

-- Индексы для object_openings
CREATE INDEX idx_object_openings_tenant ON object_openings(tenant_id);
CREATE INDEX idx_object_openings_parameter ON object_openings(parameter_id);
CREATE INDEX idx_object_openings_tenant_parameter ON object_openings(tenant_id, parameter_id); -- Композитный для JOIN с RLS
CREATE INDEX idx_object_openings_type ON object_openings(opening_type);

-- Комментарии для object_openings
COMMENT ON TABLE object_openings IS 'Проемы (окна, порталы) в помещениях';
COMMENT ON COLUMN object_openings.opening_type IS 'Тип проема: window (окно) или portal (портал)';
COMMENT ON COLUMN object_openings.position_number IS 'Порядковый номер проема (1, 2, 3...)';
COMMENT ON COLUMN object_openings.height IS 'Высота проема в метрах';
COMMENT ON COLUMN object_openings.width IS 'Ширина проема в метрах';
COMMENT ON COLUMN object_openings.slope_length IS 'Длина откосов: Ширина + (Высота * 2) - вычисляется автоматически';

-- ============================================
-- 3. Триггеры и функции
-- ============================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_object_parameters_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at в object_parameters
CREATE TRIGGER trigger_update_object_parameters_timestamp
    BEFORE UPDATE ON object_parameters
    FOR EACH ROW
    EXECUTE FUNCTION update_object_parameters_timestamp();

-- Триггер для обновления updated_at в object_openings
CREATE TRIGGER trigger_update_object_openings_timestamp
    BEFORE UPDATE ON object_openings
    FOR EACH ROW
    EXECUTE FUNCTION update_object_parameters_timestamp();

-- ============================================
-- Функция для пересчета суммы откосов окон
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_total_window_slopes()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем total_window_slopes для соответствующего помещения
    UPDATE object_parameters
    SET total_window_slopes = (
        SELECT COALESCE(SUM(slope_length), 0)
        FROM object_openings
        WHERE parameter_id = COALESCE(NEW.parameter_id, OLD.parameter_id)
          AND opening_type = 'window'
    )
    WHERE id = COALESCE(NEW.parameter_id, OLD.parameter_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического пересчета откосов
CREATE TRIGGER trigger_recalculate_slopes_insert
    AFTER INSERT ON object_openings
    FOR EACH ROW
    WHEN (NEW.opening_type = 'window')
    EXECUTE FUNCTION recalculate_total_window_slopes();

CREATE TRIGGER trigger_recalculate_slopes_update
    AFTER UPDATE ON object_openings
    FOR EACH ROW
    WHEN (NEW.opening_type = 'window' OR OLD.opening_type = 'window')
    EXECUTE FUNCTION recalculate_total_window_slopes();

CREATE TRIGGER trigger_recalculate_slopes_delete
    AFTER DELETE ON object_openings
    FOR EACH ROW
    WHEN (OLD.opening_type = 'window')
    EXECUTE FUNCTION recalculate_total_window_slopes();

-- ============================================
-- 4. Row Level Security (RLS)
-- ============================================

-- Включаем RLS для object_parameters
ALTER TABLE object_parameters ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: пользователь видит только данные своего тенанта
CREATE POLICY object_parameters_tenant_isolation_select ON object_parameters
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Политика INSERT: пользователь может создавать данные только для своего тенанта
CREATE POLICY object_parameters_tenant_isolation_insert ON object_parameters
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Политика UPDATE: пользователь может обновлять только данные своего тенанта
CREATE POLICY object_parameters_tenant_isolation_update ON object_parameters
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Политика DELETE: пользователь может удалять только данные своего тенанта
CREATE POLICY object_parameters_tenant_isolation_delete ON object_parameters
    FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Включаем RLS для object_openings
ALTER TABLE object_openings ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: пользователь видит только данные своего тенанта
CREATE POLICY object_openings_tenant_isolation_select ON object_openings
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Политика INSERT: пользователь может создавать данные только для своего тенанта
CREATE POLICY object_openings_tenant_isolation_insert ON object_openings
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Политика UPDATE: пользователь может обновлять только данные своего тенанта
CREATE POLICY object_openings_tenant_isolation_update ON object_openings
    FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Политика DELETE: пользователь может удалять только данные своего тенанта
CREATE POLICY object_openings_tenant_isolation_delete ON object_openings
    FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- ============================================
-- 5. Представления (Views)
-- ============================================

-- Представление для параметров с проемами
CREATE OR REPLACE VIEW v_object_parameters_with_openings AS
SELECT 
    op.id,
    op.tenant_id,
    op.estimate_id,
    op.position_number,
    op.room_name,
    op.perimeter,
    op.height,
    op.floor_area,
    op.wall_area,
    op.ceiling_area,
    op.ceiling_slopes,
    op.doors_count,
    op.baseboards,
    op.total_window_slopes,
    op.created_at,
    op.updated_at,
    -- Количество окон
    (SELECT COUNT(*) FROM object_openings WHERE parameter_id = op.id AND opening_type = 'window') as windows_count,
    -- Количество порталов
    (SELECT COUNT(*) FROM object_openings WHERE parameter_id = op.id AND opening_type = 'portal') as portals_count,
    -- JSON с проемами
    (SELECT json_agg(json_build_object(
        'id', oo.id,
        'type', oo.opening_type,
        'position', oo.position_number,
        'height', oo.height,
        'width', oo.width,
        'slope_length', oo.slope_length
    ) ORDER BY oo.opening_type, oo.position_number)
     FROM object_openings oo
     WHERE oo.parameter_id = op.id
    ) as openings
FROM object_parameters op;

COMMENT ON VIEW v_object_parameters_with_openings IS 'Параметры помещений с агрегированными данными по проемам';

-- ============================================
-- 6. Функции для работы с данными
-- ============================================

-- Функция для получения статистики по помещениям сметы
CREATE OR REPLACE FUNCTION get_object_parameters_statistics(p_estimate_id UUID)
RETURNS TABLE (
    rooms_count INTEGER,
    total_floor_area DECIMAL(10, 2),
    total_wall_area DECIMAL(10, 2),
    total_ceiling_area DECIMAL(10, 2),
    total_windows_count BIGINT,
    total_portals_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as rooms_count,
        COALESCE(SUM(op.floor_area), 0) as total_floor_area,
        COALESCE(SUM(op.wall_area), 0) as total_wall_area,
        COALESCE(SUM(op.ceiling_area), 0) as total_ceiling_area,
        COALESCE((SELECT COUNT(*) FROM object_openings oo 
                  JOIN object_parameters p ON oo.parameter_id = p.id 
                  WHERE p.estimate_id = p_estimate_id AND oo.opening_type = 'window'), 0) as total_windows_count,
        COALESCE((SELECT COUNT(*) FROM object_openings oo 
                  JOIN object_parameters p ON oo.parameter_id = p.id 
                  WHERE p.estimate_id = p_estimate_id AND oo.opening_type = 'portal'), 0) as total_portals_count
    FROM object_parameters op
    WHERE op.estimate_id = p_estimate_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_object_parameters_statistics IS 'Получить статистику по помещениям сметы';

-- =====================================================
-- Завершение миграции
-- =====================================================

-- Успешное завершение
DO $$
BEGIN
    RAISE NOTICE 'Migration 009: Object Parameters Tables created successfully';
    RAISE NOTICE 'Tables created: object_parameters, object_openings';
    RAISE NOTICE 'Views created: v_object_parameters_with_openings';
    RAISE NOTICE 'Functions created: get_object_parameters_statistics';
    RAISE NOTICE 'Triggers: Auto-update timestamps, auto-calculate window slopes';
    RAISE NOTICE 'RLS policies: Tenant isolation enabled for both tables';
END $$;
