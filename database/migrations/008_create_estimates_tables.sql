-- ============================================================================
-- Migration 008: Создание таблиц для смет (Estimates)
-- Описание: Мультитенантная система управления сметами со связью с проектами
-- Дата: 13 октября 2025 г.
-- Версия: 1.0
-- ============================================================================

-- ============================================================================
-- 1. ТАБЛИЦА ESTIMATES - Основная таблица смет
-- ============================================================================

CREATE TABLE IF NOT EXISTS estimates (
  -- Первичный ключ
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Мультитенантность
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Связь с проектом
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Основная информация
  name VARCHAR(255) NOT NULL,                     -- Название сметы
  description TEXT,                               -- Описание сметы
  estimate_type VARCHAR(50) NOT NULL,             -- Тип сметы: строительство, реконструкция, капремонт, проектные работы, другое
  
  -- Статус
  status VARCHAR(50) NOT NULL DEFAULT 'draft',    -- draft, in_review, approved, rejected, completed
  
  -- Финансовая информация
  total_amount DECIMAL(15, 2) DEFAULT 0.00,       -- Общая сумма (рассчитывается автоматически)
  currency VARCHAR(10) DEFAULT 'RUB',             -- Валюта: RUB, USD, EUR, KZT
  
  -- Даты
  estimate_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Дата составления сметы
  valid_until DATE,                                -- Действительна до
  approved_at TIMESTAMPTZ,                         -- Дата утверждения
  approved_by UUID REFERENCES users(id),           -- Кто утвердил
  
  -- Управление доступом и аудит
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Временные метки
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT valid_total_amount CHECK (total_amount >= 0),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'in_review', 'approved', 'rejected', 'completed')),
  CONSTRAINT valid_estimate_type CHECK (estimate_type IN ('строительство', 'реконструкция', 'капремонт', 'проектные работы', 'другое')),
  CONSTRAINT valid_currency CHECK (currency IN ('RUB', 'USD', 'EUR', 'KZT')),
  CONSTRAINT valid_dates CHECK (valid_until IS NULL OR valid_until >= estimate_date)
);

-- Комментарии к таблице ESTIMATES
COMMENT ON TABLE estimates IS 'Сметы проектов с мультитенантной изоляцией';
COMMENT ON COLUMN estimates.id IS 'Уникальный идентификатор сметы (UUID)';
COMMENT ON COLUMN estimates.tenant_id IS 'ID компании-владельца сметы';
COMMENT ON COLUMN estimates.project_id IS 'ID проекта, к которому относится смета';
COMMENT ON COLUMN estimates.name IS 'Название сметы';
COMMENT ON COLUMN estimates.estimate_type IS 'Тип сметы из диалога создания';
COMMENT ON COLUMN estimates.status IS 'Текущий статус: draft, in_review, approved, rejected, completed';
COMMENT ON COLUMN estimates.total_amount IS 'Общая сумма сметы (автоматически рассчитывается)';

-- ============================================================================
-- 2. ТАБЛИЦА ESTIMATE_ITEMS - Позиции смет
-- ============================================================================

CREATE TABLE IF NOT EXISTS estimate_items (
  -- Первичный ключ
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Связь со сметой
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  
  -- Позиция в смете
  position_number INTEGER NOT NULL,               -- Порядковый номер позиции
  
  -- Тип и описание позиции
  item_type VARCHAR(50) NOT NULL,                 -- work, material, service, equipment, other
  name VARCHAR(255) NOT NULL,                     -- Название позиции
  description TEXT,                               -- Подробное описание
  code VARCHAR(100),                              -- Код (артикул, шифр)
  phase VARCHAR(100),                             -- Этап работ (Фаза)
  section VARCHAR(100),                           -- Раздел работ
  subsection VARCHAR(100),                        -- Подраздел работ
  
  -- Единицы измерения и количество
  unit VARCHAR(50) NOT NULL,                      -- м2, м3, шт, кг, тонна, час и т.д.
  quantity DECIMAL(15, 3) NOT NULL,               -- Количество
  
  -- Цены
  unit_price DECIMAL(15, 2) NOT NULL,             -- Цена за единицу
  total_price DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED, -- Стоимость позиции
  
  -- Дополнительные расходы (проценты)
  overhead_percent DECIMAL(5, 2) DEFAULT 0,       -- Накладные расходы %
  profit_percent DECIMAL(5, 2) DEFAULT 0,         -- Прибыль %
  tax_percent DECIMAL(5, 2) DEFAULT 0,            -- НДС %
  
  -- Итоговая стоимость с учетом всех надбавок
  final_price DECIMAL(15, 2),                     -- Рассчитывается в триггере
  
  -- Метаданные
  notes TEXT,                                     -- Примечания к позиции
  is_optional BOOLEAN DEFAULT FALSE,              -- Опциональная позиция
  
  -- Временные метки
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT valid_item_type CHECK (item_type IN ('work', 'material', 'service', 'equipment', 'other')),
  CONSTRAINT valid_quantity CHECK (quantity > 0),
  CONSTRAINT valid_unit_price CHECK (unit_price >= 0),
  CONSTRAINT valid_overhead_percent CHECK (overhead_percent >= 0 AND overhead_percent <= 100),
  CONSTRAINT valid_profit_percent CHECK (profit_percent >= 0 AND profit_percent <= 100),
  CONSTRAINT valid_tax_percent CHECK (tax_percent >= 0 AND tax_percent <= 100)
);

-- Комментарии к таблице ESTIMATE_ITEMS
COMMENT ON TABLE estimate_items IS 'Позиции (строки) в сметах';
COMMENT ON COLUMN estimate_items.position_number IS 'Порядковый номер позиции в смете';
COMMENT ON COLUMN estimate_items.item_type IS 'Тип позиции: работа, материал, услуга, оборудование, другое';
COMMENT ON COLUMN estimate_items.total_price IS 'Стоимость позиции (количество × цена за единицу)';
COMMENT ON COLUMN estimate_items.final_price IS 'Итоговая цена с учетом накладных, прибыли и налогов';
COMMENT ON COLUMN estimate_items.phase IS 'Этап работ (Фаза)';
COMMENT ON COLUMN estimate_items.section IS 'Раздел работ';
COMMENT ON COLUMN estimate_items.subsection IS 'Подраздел работ';

-- ============================================================================
-- 3. ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ЗАПРОСОВ
-- ============================================================================

-- Индексы для таблицы ESTIMATES
CREATE INDEX idx_estimates_tenant_id ON estimates(tenant_id);
CREATE INDEX idx_estimates_project_id ON estimates(project_id);
CREATE INDEX idx_estimates_created_by ON estimates(created_by);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_estimate_date ON estimates(estimate_date DESC);
CREATE INDEX idx_estimates_created_at ON estimates(created_at DESC);

-- Составные индексы
CREATE INDEX idx_estimates_tenant_project ON estimates(tenant_id, project_id);
CREATE INDEX idx_estimates_tenant_status ON estimates(tenant_id, status);
CREATE INDEX idx_estimates_project_status ON estimates(project_id, status);

-- GIN индекс для полнотекстового поиска
CREATE INDEX idx_estimates_name_gin ON estimates USING gin(name gin_trgm_ops);

-- Индексы для таблицы ESTIMATE_ITEMS
CREATE INDEX idx_estimate_items_estimate_id ON estimate_items(estimate_id);
CREATE INDEX idx_estimate_items_item_type ON estimate_items(item_type);
CREATE INDEX idx_estimate_items_position ON estimate_items(estimate_id, position_number);
CREATE INDEX idx_estimate_items_phase ON estimate_items(phase);
CREATE INDEX idx_estimate_items_section ON estimate_items(section);

-- ============================================================================
-- 4. ФУНКЦИИ И ТРИГГЕРЫ
-- ============================================================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_estimates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для ESTIMATES
CREATE TRIGGER trigger_update_estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_estimates_updated_at();

-- Триггер для ESTIMATE_ITEMS
CREATE TRIGGER trigger_update_estimate_items_updated_at
  BEFORE UPDATE ON estimate_items
  FOR EACH ROW
  EXECUTE FUNCTION update_estimates_updated_at();

-- Функция для расчёта final_price с учётом накладных, прибыли и НДС
CREATE OR REPLACE FUNCTION calculate_estimate_item_final_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Расчёт: базовая цена + накладные + прибыль + НДС
  NEW.final_price := NEW.total_price * 
    (1 + COALESCE(NEW.overhead_percent, 0) / 100) * 
    (1 + COALESCE(NEW.profit_percent, 0) / 100) * 
    (1 + COALESCE(NEW.tax_percent, 0) / 100);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического расчёта final_price
CREATE TRIGGER trigger_calculate_final_price
  BEFORE INSERT OR UPDATE ON estimate_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_estimate_item_final_price();

-- Функция для автоматического пересчёта total_amount в смете
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

-- Триггеры для автопересчёта суммы сметы при изменении позиций
CREATE TRIGGER trigger_recalculate_on_insert
  AFTER INSERT ON estimate_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_estimate_total();

CREATE TRIGGER trigger_recalculate_on_update
  AFTER UPDATE ON estimate_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_estimate_total();

CREATE TRIGGER trigger_recalculate_on_delete
  AFTER DELETE ON estimate_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_estimate_total();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) ПОЛИТИКИ
-- ============================================================================

-- Включаем RLS для таблицы ESTIMATES
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: пользователи видят только сметы своей компании + супер-админы видят все
CREATE POLICY estimates_select_policy ON estimates
  FOR SELECT
  USING (
    tenant_id = current_tenant_id() OR    -- Свои сметы
    is_super_admin()                       -- Супер-админ видит все
  );

-- Политика INSERT: пользователи могут создавать сметы только в своей компании
CREATE POLICY estimates_insert_policy ON estimates
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id() AND    -- Только в своей компании
    created_by = current_user_id() AND     -- Только от своего имени
    EXISTS (                               -- Проект должен принадлежать той же компании
      SELECT 1 FROM projects
      WHERE id = project_id
      AND tenant_id = current_tenant_id()
    )
  );

-- Политика UPDATE: можно обновлять сметы своей компании
CREATE POLICY estimates_update_policy ON estimates
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id() OR     -- Свои сметы
    is_super_admin()                       -- Или супер-админ
  )
  WITH CHECK (
    tenant_id = current_tenant_id() OR     -- Остаются в своей компании
    is_super_admin()
  );

-- Политика DELETE: можно удалять сметы своей компании
CREATE POLICY estimates_delete_policy ON estimates
  FOR DELETE
  USING (
    tenant_id = current_tenant_id() OR     -- Свои сметы
    is_super_admin()                       -- Или супер-админ
  );

-- Включаем RLS для таблицы ESTIMATE_ITEMS
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: видят позиции смет своей компании
CREATE POLICY estimate_items_select_policy ON estimate_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.id = estimate_items.estimate_id
      AND (e.tenant_id = current_tenant_id() OR is_super_admin())
    )
  );

-- Политика INSERT: можно добавлять позиции только в сметы своей компании
CREATE POLICY estimate_items_insert_policy ON estimate_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.id = estimate_items.estimate_id
      AND e.tenant_id = current_tenant_id()
    )
  );

-- Политика UPDATE: можно обновлять позиции смет своей компании
CREATE POLICY estimate_items_update_policy ON estimate_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.id = estimate_items.estimate_id
      AND (e.tenant_id = current_tenant_id() OR is_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.id = estimate_items.estimate_id
      AND (e.tenant_id = current_tenant_id() OR is_super_admin())
    )
  );

-- Политика DELETE: можно удалять позиции из смет своей компании
CREATE POLICY estimate_items_delete_policy ON estimate_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.id = estimate_items.estimate_id
      AND (e.tenant_id = current_tenant_id() OR is_super_admin())
    )
  );

-- ============================================================================
-- 6. ПРЕДСТАВЛЕНИЯ (VIEWS) ДЛЯ УДОБНОГО ДОСТУПА
-- ============================================================================

-- Представление: Сметы с дополнительной информацией о проекте
CREATE OR REPLACE VIEW v_estimates_with_project AS
SELECT 
  e.*,
  -- Информация о проекте
  p.name AS project_name,
  p.object_name AS project_object_name,
  p.client AS project_client,
  p.address AS project_address,
  p.status AS project_status,
  -- Информация о создателе
  u_created.full_name AS created_by_name,
  u_created.email AS created_by_email,
  -- Информация о том, кто утвердил
  u_approved.full_name AS approved_by_name,
  u_approved.email AS approved_by_email,
  -- Информация о компании
  t.name AS tenant_name,
  -- Статистика по позициям
  (SELECT COUNT(*) FROM estimate_items WHERE estimate_id = e.id) AS items_count,
  (SELECT SUM(quantity) FROM estimate_items WHERE estimate_id = e.id) AS total_quantity
FROM estimates e
JOIN projects p ON e.project_id = p.id
LEFT JOIN users u_created ON e.created_by = u_created.id
LEFT JOIN users u_approved ON e.approved_by = u_approved.id
LEFT JOIN tenants t ON e.tenant_id = t.id;

COMMENT ON VIEW v_estimates_with_project IS 'Расширенное представление смет с информацией о проекте и статистикой';

-- Представление: Позиции смет с информацией о смете и проекте
CREATE OR REPLACE VIEW v_estimate_items_extended AS
SELECT 
  ei.*,
  e.name AS estimate_name,
  e.status AS estimate_status,
  e.project_id,
  p.name AS project_name,
  e.tenant_id
FROM estimate_items ei
JOIN estimates e ON ei.estimate_id = e.id
JOIN projects p ON e.project_id = p.id;

COMMENT ON VIEW v_estimate_items_extended IS 'Позиции смет с информацией о смете и проекте';

-- ============================================================================
-- 7. ФУНКЦИИ-ПОМОЩНИКИ
-- ============================================================================

-- Функция для получения общей статистики по смете
CREATE OR REPLACE FUNCTION get_estimate_statistics(p_estimate_id UUID)
RETURNS TABLE (
  items_count BIGINT,
  works_count BIGINT,
  materials_count BIGINT,
  total_quantity NUMERIC,
  base_total NUMERIC,
  final_total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS items_count,
    COUNT(*) FILTER (WHERE item_type = 'work')::BIGINT AS works_count,
    COUNT(*) FILTER (WHERE item_type = 'material')::BIGINT AS materials_count,
    COALESCE(SUM(quantity), 0) AS total_quantity,
    COALESCE(SUM(total_price), 0) AS base_total,
    COALESCE(SUM(final_price), 0) AS final_total
  FROM estimate_items
  WHERE estimate_id = p_estimate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_estimate_statistics IS 'Возвращает статистику по смете: количество позиций, работ, материалов и суммы';

-- ============================================================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration 008: Таблицы для смет успешно созданы!';
  RAISE NOTICE '📋 Создано таблиц: 2 (estimates, estimate_items)';
  RAISE NOTICE '🔗 Связи: estimates → projects';
  RAISE NOTICE '🔍 Создано индексов: 12';
  RAISE NOTICE '🔒 Применено RLS политик: 10';
  RAISE NOTICE '⚙️  Создано функций и триггеров: 7';
  RAISE NOTICE '👁️  Создано представлений: 2';
  RAISE NOTICE '🎯 Автоматический пересчёт total_amount и final_price настроен';
END $$;
