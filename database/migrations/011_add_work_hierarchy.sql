-- ============================================
-- МИГРАЦИЯ 011: Добавление иерархии работ
-- Дата: 13.10.2025
-- Описание: Добавление 4-х уровневой иерархии (фаза → раздел → подраздел → работа)
-- ============================================

-- ==========================================
-- ЧАСТЬ 1: Обновление таблицы works
-- ==========================================

-- Добавляем поля иерархии в таблицу works
ALTER TABLE works ADD COLUMN IF NOT EXISTS phase VARCHAR(100);
ALTER TABLE works ADD COLUMN IF NOT EXISTS section VARCHAR(100);
ALTER TABLE works ADD COLUMN IF NOT EXISTS subsection VARCHAR(100);

-- Комментарии к новым полям
COMMENT ON COLUMN works.phase IS 'Фаза/Этап работ (1-й уровень иерархии)';
COMMENT ON COLUMN works.section IS 'Раздел работ (2-й уровень иерархии)';
COMMENT ON COLUMN works.subsection IS 'Подраздел работ (3-й уровень иерархии)';
COMMENT ON COLUMN works.name IS 'Название работы (4-й уровень иерархии)';

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_works_phase ON works(phase);
CREATE INDEX IF NOT EXISTS idx_works_section ON works(section);
CREATE INDEX IF NOT EXISTS idx_works_subsection ON works(subsection);
CREATE INDEX IF NOT EXISTS idx_works_phase_section ON works(phase, section);
CREATE INDEX IF NOT EXISTS idx_works_phase_section_subsection ON works(phase, section, subsection);

-- ==========================================
-- ЧАСТЬ 2: Создание справочника иерархии
-- ==========================================

-- Таблица для хранения справочных значений иерархии
CREATE TABLE IF NOT EXISTS work_hierarchy (
  id SERIAL PRIMARY KEY,
  level VARCHAR(20) NOT NULL CHECK (level IN ('phase', 'section', 'subsection')),
  parent_value VARCHAR(100),   -- Значение родительского уровня (для связи)
  value VARCHAR(100) NOT NULL, -- Название элемента
  code VARCHAR(50),            -- Опциональный код для сортировки
  sort_order INT DEFAULT 0,    -- Порядок сортировки
  is_global BOOLEAN DEFAULT false,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Внешний ключ на компанию
  CONSTRAINT fk_work_hierarchy_tenant 
    FOREIGN KEY (tenant_id) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE,
  
  -- Уникальность: один и тот же элемент не может повторяться для одного тенанта
  CONSTRAINT uq_work_hierarchy_level_value_tenant_parent
    UNIQUE(level, value, tenant_id, parent_value)
);

-- Комментарии к таблице
COMMENT ON TABLE work_hierarchy IS 'Справочник иерархии работ (фазы, разделы, подразделы)';
COMMENT ON COLUMN work_hierarchy.level IS 'Уровень иерархии: phase, section, subsection';
COMMENT ON COLUMN work_hierarchy.parent_value IS 'Значение родительского элемента (для построения дерева)';
COMMENT ON COLUMN work_hierarchy.value IS 'Название элемента иерархии';
COMMENT ON COLUMN work_hierarchy.code IS 'Код для сортировки (опционально)';
COMMENT ON COLUMN work_hierarchy.sort_order IS 'Порядковый номер для сортировки';
COMMENT ON COLUMN work_hierarchy.is_global IS 'Глобальный элемент (доступен всем компаниям)';

-- Индексы для быстрых запросов
CREATE INDEX IF NOT EXISTS idx_work_hierarchy_level ON work_hierarchy(level);
CREATE INDEX IF NOT EXISTS idx_work_hierarchy_parent ON work_hierarchy(parent_value);
CREATE INDEX IF NOT EXISTS idx_work_hierarchy_tenant ON work_hierarchy(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_hierarchy_level_parent ON work_hierarchy(level, parent_value);
CREATE INDEX IF NOT EXISTS idx_work_hierarchy_global ON work_hierarchy(is_global) WHERE is_global = true;

-- RLS для tenant isolation
ALTER TABLE work_hierarchy ENABLE ROW LEVEL SECURITY;

-- Политика: Пользователи видят глобальные записи + свои тенантные
CREATE POLICY work_hierarchy_select_policy ON work_hierarchy
  FOR SELECT
  USING (
    is_global = true OR 
    tenant_id = current_tenant_id() OR 
    is_super_admin()
  );

-- Политика: Только авторизованные пользователи могут создавать записи
CREATE POLICY work_hierarchy_insert_policy ON work_hierarchy
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id() OR 
    is_super_admin()
  );

-- Политика: Можно обновлять только свои записи
CREATE POLICY work_hierarchy_update_policy ON work_hierarchy
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id() OR 
    is_super_admin()
  );

-- Политика: Можно удалять только свои записи
CREATE POLICY work_hierarchy_delete_policy ON work_hierarchy
  FOR DELETE
  USING (
    tenant_id = current_tenant_id() OR 
    is_super_admin()
  );

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_work_hierarchy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_work_hierarchy_updated_at
  BEFORE UPDATE ON work_hierarchy
  FOR EACH ROW
  EXECUTE FUNCTION update_work_hierarchy_updated_at();

-- ==========================================
-- ЧАСТЬ 3: Обновление estimate_items
-- ==========================================

-- Добавляем поля иерархии в estimate_items (для быстрого доступа)
ALTER TABLE estimate_items ADD COLUMN IF NOT EXISTS phase VARCHAR(100);
ALTER TABLE estimate_items ADD COLUMN IF NOT EXISTS section VARCHAR(100);
ALTER TABLE estimate_items ADD COLUMN IF NOT EXISTS subsection VARCHAR(100);

-- Комментарии
COMMENT ON COLUMN estimate_items.phase IS 'Фаза работы (копируется из works при импорте)';
COMMENT ON COLUMN estimate_items.section IS 'Раздел работы (копируется из works при импорте)';
COMMENT ON COLUMN estimate_items.subsection IS 'Подраздел работы (копируется из works при импорте)';

-- Индексы для фильтрации в расчете
CREATE INDEX IF NOT EXISTS idx_estimate_items_phase ON estimate_items(phase);
CREATE INDEX IF NOT EXISTS idx_estimate_items_section ON estimate_items(section);

-- ==========================================
-- ЧАСТЬ 4: Тестовые глобальные данные
-- ==========================================

-- Вставляем несколько глобальных фаз, разделов и подразделов для примера
INSERT INTO work_hierarchy (level, parent_value, value, code, sort_order, is_global, tenant_id) VALUES
-- Фазы (1-й уровень)
('phase', NULL, 'Подготовительные работы', '01', 1, true, NULL),
('phase', NULL, 'Земляные работы', '02', 2, true, NULL),
('phase', NULL, 'Фундаментные работы', '03', 3, true, NULL),
('phase', NULL, 'Стены и перекрытия', '04', 4, true, NULL),
('phase', NULL, 'Кровельные работы', '05', 5, true, NULL),
('phase', NULL, 'Отделочные работы', '06', 6, true, NULL),
('phase', NULL, 'Инженерные системы', '07', 7, true, NULL),
('phase', NULL, 'Благоустройство', '08', 8, true, NULL),

-- Разделы для "Подготовительные работы" (2-й уровень)
('section', 'Подготовительные работы', '01. Разметка территории', '01.01', 1, true, NULL),
('section', 'Подготовительные работы', '02. Расчистка участка', '01.02', 2, true, NULL),
('section', 'Подготовительные работы', '03. Снос строений', '01.03', 3, true, NULL),

-- Подразделы для "01. Разметка территории" (3-й уровень)
('subsection', '01. Разметка территории', '01.01 Геодезические работы', '01.01.01', 1, true, NULL),
('subsection', '01. Разметка территории', '01.02 Установка ограждений', '01.01.02', 2, true, NULL),

-- Разделы для "Земляные работы" (2-й уровень)
('section', 'Земляные работы', '01. Разработка котлована', '02.01', 1, true, NULL),
('section', 'Земляные работы', '02. Обратная засыпка', '02.02', 2, true, NULL),
('section', 'Земляные работы', '03. Планировка', '02.03', 3, true, NULL),

-- Подразделы для "01. Разработка котлована" (3-й уровень)
('subsection', '01. Разработка котлована', '01.01 Механизированная выемка', '02.01.01', 1, true, NULL),
('subsection', '01. Разработка котлована', '01.02 Ручная доработка', '02.01.02', 2, true, NULL),

-- Разделы для "Отделочные работы" (2-й уровень)
('section', 'Отделочные работы', '01. Штукатурные работы', '06.01', 1, true, NULL),
('section', 'Отделочные работы', '02. Малярные работы', '06.02', 2, true, NULL),
('section', 'Отделочные работы', '03. Полы', '06.03', 3, true, NULL),
('section', 'Отделочные работы', '04. Потолки', '06.04', 4, true, NULL),

-- Подразделы для "01. Штукатурные работы" (3-й уровень)
('subsection', '01. Штукатурные работы', '01.01 Внутренняя штукатурка', '06.01.01', 1, true, NULL),
('subsection', '01. Штукатурные работы', '01.02 Наружная штукатурка', '06.01.02', 2, true, NULL),
('subsection', '01. Штукатурные работы', '01.03 Декоративная штукатурка', '06.01.03', 3, true, NULL)

ON CONFLICT (level, value, tenant_id, parent_value) DO NOTHING;

-- ==========================================
-- ЗАВЕРШЕНИЕ
-- ==========================================

-- Выводим итоговую информацию
DO $$
DECLARE
  phases_count INT;
  sections_count INT;
  subsections_count INT;
BEGIN
  SELECT COUNT(*) INTO phases_count FROM work_hierarchy WHERE level = 'phase';
  SELECT COUNT(*) INTO sections_count FROM work_hierarchy WHERE level = 'section';
  SELECT COUNT(*) INTO subsections_count FROM work_hierarchy WHERE level = 'subsection';
  
  RAISE NOTICE '✅ Миграция 011 выполнена успешно!';
  RAISE NOTICE '📊 Статистика:';
  RAISE NOTICE '   - Фаз: %', phases_count;
  RAISE NOTICE '   - Разделов: %', sections_count;
  RAISE NOTICE '   - Подразделов: %', subsections_count;
  RAISE NOTICE '   - Индексов: 11';
  RAISE NOTICE '   - RLS политик: 4';
END $$;
