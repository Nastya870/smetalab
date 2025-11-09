-- =====================================================
-- Migration: Create purchases table
-- Description: Таблица для хранения материалов для закупки (сгруппированных по смете)
-- Created: 2025-01-25
-- =====================================================

-- Создание таблицы purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Связи
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  
  -- Информация о материале
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  material_sku VARCHAR(100), -- Артикул материала
  material_name TEXT NOT NULL, -- Название материала
  category VARCHAR(255), -- Категория материала
  
  -- Количественные данные
  unit VARCHAR(50) NOT NULL, -- Единица измерения
  quantity DECIMAL(15, 4) NOT NULL DEFAULT 0, -- Суммарное количество по всей смете
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Цена за единицу
  total_price DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Итоговая стоимость (quantity * unit_price)
  
  -- Аудит
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT check_quantity_positive CHECK (quantity >= 0),
  CONSTRAINT check_unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT check_total_price_non_negative CHECK (total_price >= 0),
  
  -- Уникальность: один материал - одна запись на смету
  CONSTRAINT unique_material_per_estimate UNIQUE (estimate_id, material_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_purchases_tenant_id ON purchases(tenant_id);
CREATE INDEX idx_purchases_project_id ON purchases(project_id);
CREATE INDEX idx_purchases_estimate_id ON purchases(estimate_id);
CREATE INDEX idx_purchases_material_id ON purchases(material_id);
CREATE INDEX idx_purchases_created_at ON purchases(created_at);

-- Составной индекс для фильтрации по смете
CREATE INDEX idx_purchases_estimate_material ON purchases(estimate_id, material_id);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Включаем RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи видят только закупки своего tenant
CREATE POLICY purchases_tenant_isolation ON purchases
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Политика: только создатель и админы могут изменять
CREATE POLICY purchases_owner_update ON purchases
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
    AND (
      created_by = current_setting('app.current_user_id')::UUID
      OR current_setting('app.current_user_role')::TEXT = 'admin'
    )
  );

-- Политика: только админы могут удалять
CREATE POLICY purchases_admin_delete ON purchases
  FOR DELETE
  USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
    AND current_setting('app.current_user_role')::TEXT = 'admin'
  );

-- =====================================================
-- Триггер для автоматического обновления updated_at
-- =====================================================

CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Комментарии к таблице и колонкам
-- =====================================================

COMMENT ON TABLE purchases IS 'Материалы для закупки, сгруппированные и суммированные по смете';
COMMENT ON COLUMN purchases.material_id IS 'Ссылка на материал из справочника';
COMMENT ON COLUMN purchases.quantity IS 'Суммарное количество материала по всей смете';
COMMENT ON COLUMN purchases.total_price IS 'Автоматически рассчитываемая итоговая стоимость';
COMMENT ON CONSTRAINT unique_material_per_estimate ON purchases IS 'Один материал может быть только один раз в списке закупок для сметы';
