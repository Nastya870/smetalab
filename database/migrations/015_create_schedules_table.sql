-- =====================================================
-- Migration: Create schedules table
-- Description: Таблица для хранения графиков производства работ
-- Created: 2025-01-16
-- =====================================================

-- Создание таблицы schedules
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Связи
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  
  -- Информация о фазе и работе
  phase VARCHAR(255) NOT NULL, -- Фаза работ (например: "Подготовительные работы")
  work_id UUID REFERENCES estimate_items(id) ON DELETE SET NULL, -- Ссылка на работу из estimate_items
  work_code VARCHAR(50), -- Код работы
  work_name TEXT NOT NULL, -- Название работы
  
  -- Количественные данные
  unit VARCHAR(50) NOT NULL, -- Единица измерения
  quantity DECIMAL(15, 4) NOT NULL DEFAULT 0, -- Количество
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Цена за единицу
  total_price DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Итоговая стоимость (quantity * unit_price)
  
  -- Порядок отображения
  position_number INTEGER NOT NULL DEFAULT 0, -- Позиция в графике
  
  -- Аудит
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT check_quantity_positive CHECK (quantity >= 0),
  CONSTRAINT check_unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT check_total_price_non_negative CHECK (total_price >= 0)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_schedules_tenant_id ON schedules(tenant_id);
CREATE INDEX idx_schedules_project_id ON schedules(project_id);
CREATE INDEX idx_schedules_estimate_id ON schedules(estimate_id);
CREATE INDEX idx_schedules_phase ON schedules(phase);
CREATE INDEX idx_schedules_position ON schedules(position_number);
CREATE INDEX idx_schedules_created_at ON schedules(created_at);

-- Составной индекс для фильтрации по смете и сортировки
CREATE INDEX idx_schedules_estimate_phase_position ON schedules(estimate_id, phase, position_number);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Включаем RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи видят только графики своего tenant
CREATE POLICY schedules_tenant_isolation ON schedules
  FOR ALL
  USING (tenant_id = current_tenant_id() OR is_super_admin());

-- Политика: только создатель и админы могут изменять
CREATE POLICY schedules_owner_update ON schedules
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND (
      created_by = current_user_id()
      OR is_super_admin()
    )
  );

-- Политика: только админы могут удалять
CREATE POLICY schedules_admin_delete ON schedules
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND is_super_admin()
  );

-- =====================================================
-- Триггер для автоматического обновления updated_at
-- =====================================================

CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Комментарии к таблице и колонкам
-- =====================================================

COMMENT ON TABLE schedules IS 'График производства работ, сгруппированный по фазам';
COMMENT ON COLUMN schedules.phase IS 'Фаза выполнения работ (группировка)';
COMMENT ON COLUMN schedules.work_id IS 'Ссылка на работу из estimate_items (опционально)';
COMMENT ON COLUMN schedules.position_number IS 'Порядковый номер в графике для сортировки';
COMMENT ON COLUMN schedules.total_price IS 'Автоматически рассчитываемая итоговая стоимость';
