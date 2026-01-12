-- ============================================
-- МИГРАЦИЯ: Создание таблицы works (Работы)
-- Дата: 11.10.2025
-- Описание: Справочник строительных работ
-- ============================================

-- Создание таблицы works
CREATE TABLE IF NOT EXISTS works (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  phase VARCHAR(100),
  section VARCHAR(100),
  subsection VARCHAR(100),
  is_global BOOLEAN DEFAULT FALSE,
  tenant_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Внешние ключи
  CONSTRAINT fk_works_tenant 
    FOREIGN KEY (tenant_id) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_works_created_by 
    FOREIGN KEY (created_by) 
    REFERENCES users(id) 
    ON DELETE SET NULL
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_works_code ON works(code);
CREATE INDEX IF NOT EXISTS idx_works_category ON works(category);
CREATE INDEX IF NOT EXISTS idx_works_tenant_id ON works(tenant_id);
CREATE INDEX IF NOT EXISTS idx_works_is_global ON works(is_global);
CREATE INDEX IF NOT EXISTS idx_works_phase ON works(phase);
CREATE INDEX IF NOT EXISTS idx_works_created_at ON works(created_at DESC);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_works_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_works_updated_at
  BEFORE UPDATE ON works
  FOR EACH ROW
  EXECUTE FUNCTION update_works_updated_at();

-- Комментарии к таблице и колонкам
COMMENT ON TABLE works IS 'Справочник строительных работ';
COMMENT ON COLUMN works.id IS 'Уникальный идентификатор работы';
COMMENT ON COLUMN works.code IS 'Код работы (уникальный)';
COMMENT ON COLUMN works.name IS 'Наименование работы';
COMMENT ON COLUMN works.category IS 'Категория работы (Земляные, Бетонные и т.д.)';
COMMENT ON COLUMN works.unit IS 'Единица измерения (м², м³, шт и т.д.)';
COMMENT ON COLUMN works.base_price IS 'Базовая цена за единицу';
COMMENT ON COLUMN works.tenant_id IS 'ID компании (для мультитенантности)';
COMMENT ON COLUMN works.created_by IS 'ID пользователя, создавшего запись';
COMMENT ON COLUMN works.created_at IS 'Дата и время создания';
COMMENT ON COLUMN works.updated_at IS 'Дата и время последнего обновления';
COMMENT ON COLUMN works.phase IS 'Этап работ (Фаза)';
COMMENT ON COLUMN works.section IS 'Раздел работ';
COMMENT ON COLUMN works.subsection IS 'Подраздел работ';
COMMENT ON COLUMN works.is_global IS 'Флаг глобальной работы (доступна всем)';

-- RLS (Row Level Security) - опционально
-- Включаем RLS если нужна изоляция данных между компаниями
ALTER TABLE works ENABLE ROW LEVEL SECURITY;

-- Политика: Пользователи видят только работы своей компании
CREATE POLICY works_tenant_isolation ON works
  FOR ALL
  USING (
    is_global = TRUE OR 
    tenant_id = current_tenant_id() OR 
    is_super_admin()
  );

-- Политика: Только авторизованные пользователи могут добавлять работы
CREATE POLICY works_insert_policy ON works
  FOR INSERT
  WITH CHECK (
    current_user_id() IS NOT NULL AND
    (tenant_id IS NULL OR tenant_id = current_tenant_id() OR is_super_admin())
  );

-- Политика: Пользователи могут редактировать работы своей компании
CREATE POLICY works_update_policy ON works
  FOR UPDATE
  USING (
    tenant_id IS NULL OR 
    tenant_id = current_tenant_id() OR 
    is_super_admin()
  );

-- Политика: Пользователи могут удалять работы своей компании
CREATE POLICY works_delete_policy ON works
  FOR DELETE
  USING (
    tenant_id IS NULL OR 
    tenant_id = current_tenant_id() OR 
    is_super_admin()
  );

-- Успешное завершение миграции
DO $$
BEGIN
  RAISE NOTICE '✅ Таблица works успешно создана';
  RAISE NOTICE '✅ Индексы созданы';
  RAISE NOTICE '✅ Триггеры созданы';
  RAISE NOTICE '✅ RLS политики применены';
END $$;
