-- Migration 013: Create estimate_item_materials table
-- Таблица для связи позиций сметы с материалами (детализация)

CREATE TABLE IF NOT EXISTS estimate_item_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_item_id UUID NOT NULL REFERENCES estimate_items(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  
  -- Количество материала
  quantity NUMERIC(15, 4) NOT NULL CHECK (quantity > 0),
  
  -- Цена за единицу (может отличаться от базовой цены материала)
  unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
  
  -- Итоговая стоимость
  total_price NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  -- Коэффициент расхода (например, 1.05 для бетона)
  consumption_coefficient NUMERIC(8, 4) DEFAULT 1.0 CHECK (consumption_coefficient > 0),
  
  -- Обязательный ли материал
  is_required BOOLEAN DEFAULT true,
  
  -- Автоматический расчет
  auto_calculate BOOLEAN DEFAULT true,
  
  -- Примечания
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Индексы для быстрого поиска
CREATE INDEX idx_estimate_item_materials_item_id ON estimate_item_materials(estimate_item_id);
CREATE INDEX idx_estimate_item_materials_material_id ON estimate_item_materials(material_id);

-- Unique constraint: один материал может быть использован только один раз в позиции
CREATE UNIQUE INDEX idx_estimate_item_materials_unique ON estimate_item_materials(estimate_item_id, material_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_estimate_item_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_estimate_item_materials_updated_at
  BEFORE UPDATE ON estimate_item_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_estimate_item_materials_updated_at();

-- Комментарии
COMMENT ON TABLE estimate_item_materials IS 'Материалы, используемые в позициях сметы с детализацией расхода';
COMMENT ON COLUMN estimate_item_materials.consumption_coefficient IS 'Коэффициент расхода материала (например, 1.05 для бетона с учетом потерь)';
COMMENT ON COLUMN estimate_item_materials.total_price IS 'Вычисляемое поле: quantity * unit_price';
