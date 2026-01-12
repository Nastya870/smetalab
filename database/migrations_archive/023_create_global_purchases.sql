-- =====================================================
-- Migration: Create global_purchases table
-- Description: Таблица для хранения фактических закупок материалов
-- Created: 2025-10-26
-- Version: 023
-- =====================================================

-- Создание таблицы global_purchases
CREATE TABLE IF NOT EXISTS global_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Связи
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  
  -- Денормализация для быстрого доступа (копируем из materials)
  material_sku VARCHAR(100),
  material_name TEXT NOT NULL,
  material_image TEXT,
  unit VARCHAR(50) NOT NULL,
  category VARCHAR(255),
  
  -- Данные ФАКТИЧЕСКОЙ закупки
  quantity DECIMAL(15, 4) NOT NULL,              -- Количество закупленное
  purchase_price DECIMAL(15, 2) NOT NULL,         -- Цена ЗАКУПКИ (вручную!)
  total_price DECIMAL(15, 2) NOT NULL,            -- Итого (quantity * purchase_price)
  
  -- Связь с плановой закупкой
  source_purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  
  -- Дата закупки (для календаря)
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Метаданные (денормализация для отчетов)
  project_name TEXT,
  estimate_name TEXT,
  
  -- Аудит
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT check_quantity_positive CHECK (quantity > 0),
  CONSTRAINT check_purchase_price_non_negative CHECK (purchase_price >= 0),
  CONSTRAINT check_total_price_non_negative CHECK (total_price >= 0)
);

-- =====================================================
-- Индексы для быстрого поиска
-- =====================================================

CREATE INDEX idx_global_purchases_tenant ON global_purchases(tenant_id);
CREATE INDEX idx_global_purchases_date ON global_purchases(purchase_date DESC);
CREATE INDEX idx_global_purchases_project ON global_purchases(project_id);
CREATE INDEX idx_global_purchases_estimate ON global_purchases(estimate_id);
CREATE INDEX idx_global_purchases_material ON global_purchases(material_id);

-- Составной индекс для фильтрации по дате + tenant
CREATE INDEX idx_global_purchases_tenant_date ON global_purchases(tenant_id, purchase_date DESC);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Включаем RLS
ALTER TABLE global_purchases ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи видят только закупки своего tenant
CREATE POLICY global_purchases_tenant_isolation ON global_purchases
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Политика: только создатель и админы могут изменять
CREATE POLICY global_purchases_owner_update ON global_purchases
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
    AND (
      created_by = current_setting('app.current_user_id')::UUID
      OR current_setting('app.current_user_role')::TEXT = 'admin'
    )
  );

-- Политика: только админы могут удалять
CREATE POLICY global_purchases_admin_delete ON global_purchases
  FOR DELETE
  USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
    AND current_setting('app.current_user_role')::TEXT = 'admin'
  );

-- =====================================================
-- Триггер для автоматического обновления updated_at
-- =====================================================

CREATE TRIGGER update_global_purchases_updated_at
  BEFORE UPDATE ON global_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Комментарии к таблице и колонкам
-- =====================================================

COMMENT ON TABLE global_purchases IS 'Фактические закупки материалов (что уже купили)';
COMMENT ON COLUMN global_purchases.quantity IS 'Фактически закупленное количество материала';
COMMENT ON COLUMN global_purchases.purchase_price IS 'Фактическая цена закупки (может отличаться от цены в смете)';
COMMENT ON COLUMN global_purchases.total_price IS 'Итоговая стоимость закупки (quantity * purchase_price)';
COMMENT ON COLUMN global_purchases.purchase_date IS 'Дата фактической закупки материала';
COMMENT ON COLUMN global_purchases.source_purchase_id IS 'Ссылка на плановую закупку из таблицы purchases';
COMMENT ON COLUMN global_purchases.project_name IS 'Название проекта (денормализация для отчетов)';
COMMENT ON COLUMN global_purchases.estimate_name IS 'Название сметы (денормализация для отчетов)';
