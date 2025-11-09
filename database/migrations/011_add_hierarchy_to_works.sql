-- ============================================
-- МИГРАЦИЯ: Добавление иерархии к таблице works
-- Дата: 14.10.2025
-- Описание: Добавление полей phase, section, subsection для 5-уровневой иерархии
-- ============================================

-- Добавляем поля иерархии к таблице works
ALTER TABLE works
ADD COLUMN IF NOT EXISTS phase VARCHAR(100),
ADD COLUMN IF NOT EXISTS section VARCHAR(100),
ADD COLUMN IF NOT EXISTS subsection VARCHAR(100);

-- Комментарии к новым колонкам
COMMENT ON COLUMN works.phase IS 'Фаза работы (уровень 1: Строительные работы, Отделочные работы и т.д.)';
COMMENT ON COLUMN works.section IS 'Раздел работы (уровень 2: Земляные работы, Фундаментные работы и т.д.)';
COMMENT ON COLUMN works.subsection IS 'Подраздел работы (уровень 3: Разработка грунта, Подготовка основания и т.д.)';

-- Создание индексов для оптимизации запросов по иерархии
CREATE INDEX IF NOT EXISTS idx_works_phase ON works(phase) WHERE phase IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_works_section ON works(section) WHERE section IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_works_subsection ON works(subsection) WHERE subsection IS NOT NULL;

-- Создание композитного индекса для быстрого поиска по всей иерархии
CREATE INDEX IF NOT EXISTS idx_works_hierarchy ON works(phase, section, subsection) WHERE phase IS NOT NULL;

-- Успешное завершение миграции
DO $$
BEGIN
  RAISE NOTICE '✅ Добавлены поля phase, section, subsection к таблице works';
  RAISE NOTICE '✅ Индексы для иерархии созданы';
END $$;
