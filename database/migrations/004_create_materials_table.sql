-- ============================================
-- МИГРАЦИЯ: Создание таблицы materials (Материалы)
-- Дата: 11.10.2025
-- Описание: Справочник строительных материалов
-- ============================================

-- Создание таблицы materials
CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  image TEXT,
  unit VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  sku_number INTEGER,
  is_global BOOLEAN DEFAULT FALSE,
  supplier VARCHAR(255),
  weight DECIMAL(10, 3),
  category VARCHAR(100) NOT NULL,
  product_url TEXT,
  show_image BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Внешние ключи
  CONSTRAINT fk_materials_tenant 
    FOREIGN KEY (tenant_id) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_materials_created_by 
    FOREIGN KEY (created_by) 
    REFERENCES users(id) 
    ON DELETE SET NULL
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_materials_sku ON materials(sku);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_supplier ON materials(supplier);
CREATE INDEX IF NOT EXISTS idx_materials_tenant_id ON materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_materials_is_global ON materials(is_global);
CREATE INDEX IF NOT EXISTS idx_materials_sku_number ON materials(sku_number);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION update_materials_updated_at();

-- Комментарии к таблице и колонкам
COMMENT ON TABLE materials IS 'Справочник строительных материалов';
COMMENT ON COLUMN materials.id IS 'Уникальный идентификатор материала';
COMMENT ON COLUMN materials.sku IS 'Артикул (SKU) - уникальный код материала';
COMMENT ON COLUMN materials.name IS 'Наименование материала';
COMMENT ON COLUMN materials.image IS 'URL изображения материала';
COMMENT ON COLUMN materials.unit IS 'Единица измерения (кг, м², шт и т.д.)';
COMMENT ON COLUMN materials.price IS 'Цена за единицу';
COMMENT ON COLUMN materials.supplier IS 'Название поставщика';
COMMENT ON COLUMN materials.weight IS 'Вес единицы материала (кг)';
COMMENT ON COLUMN materials.category IS 'Категория материала';
COMMENT ON COLUMN materials.product_url IS 'Ссылка на страницу товара у поставщика';
COMMENT ON COLUMN materials.show_image IS 'Показывать ли изображение в таблице';
COMMENT ON COLUMN materials.tenant_id IS 'ID компании (для мультитенантности)';
COMMENT ON COLUMN materials.created_by IS 'ID пользователя, создавшего запись';
COMMENT ON COLUMN materials.created_at IS 'Дата и время создания';
COMMENT ON COLUMN materials.updated_at IS 'Дата и время последнего обновления';
COMMENT ON COLUMN materials.sku_number IS 'Числовое значение SKU для правильной сортировки';
COMMENT ON COLUMN materials.is_global IS 'Флаг глобального материала (доступен всем)';

-- RLS (Row Level Security)
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Политика: Пользователи видят только материалы своей компании
CREATE POLICY materials_tenant_isolation ON materials
  FOR ALL
  USING (
    is_global = TRUE OR 
    tenant_id = current_tenant_id() OR 
    is_super_admin()
  );

-- Политика: Только авторизованные пользователи могут добавлять материалы
CREATE POLICY materials_insert_policy ON materials
  FOR INSERT
  WITH CHECK (
    current_user_id() IS NOT NULL AND
    (tenant_id IS NULL OR tenant_id = current_tenant_id() OR is_super_admin())
  );

-- Политика: Пользователи могут редактировать материалы своей компании
CREATE POLICY materials_update_policy ON materials
  FOR UPDATE
  USING (
    tenant_id IS NULL OR 
    tenant_id = current_tenant_id() OR 
    is_super_admin()
  );

-- Политика: Пользователи могут удалять материалы своей компании
CREATE POLICY materials_delete_policy ON materials
  FOR DELETE
  USING (
    tenant_id IS NULL OR 
    tenant_id = current_tenant_id() OR 
    is_super_admin()
  );

-- Успешное завершение миграции
DO $$
BEGIN
  RAISE NOTICE '✅ Таблица materials успешно создана';
  RAISE NOTICE '✅ Индексы созданы (6 индексов)';
  RAISE NOTICE '✅ Триггеры созданы';
  RAISE NOTICE '✅ RLS политики применены';
END $$;
