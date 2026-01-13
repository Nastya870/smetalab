-- ============================================
-- МИГРАЦИЯ: Добавление поддержки автоматического расчёта материалов
-- Дата: 16.10.2025
-- Описание: Добавление колонки auto_calculate и consumption для расчёта количества материалов
-- ============================================

-- Добавляем колонку auto_calculate (флаг автоматического расчёта)
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS auto_calculate BOOLEAN DEFAULT true;

-- Добавляем колонку consumption (расход материала на единицу работы)
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS consumption DECIMAL(10, 4) DEFAULT 0;

-- Комментарии к новым колонкам
COMMENT ON COLUMN materials.auto_calculate IS 'Флаг автоматического расчёта количества материала по формуле: quantity = work_quantity * consumption. Если false - количество вводится вручную в смете.';
COMMENT ON COLUMN materials.consumption IS 'Расход материала на единицу работы (используется если auto_calculate = true). Например: 1.05 м³ бетона на 1 м³ работы.';

-- Обновляем существующие записи: если есть материалы, устанавливаем auto_calculate = true
UPDATE materials 
SET auto_calculate = true 
WHERE consumption > 0;

-- Обновляем существующие записи: если consumption = 0, устанавливаем auto_calculate = false
UPDATE materials 
SET auto_calculate = false 
WHERE consumption = 0 OR consumption IS NULL;

-- Создаём индекс для быстрого поиска материалов по типу расчёта
CREATE INDEX IF NOT EXISTS idx_materials_auto_calculate ON materials(auto_calculate);

-- Успешное завершение миграции
DO $$
BEGIN
  RAISE NOTICE '✅ Колонка auto_calculate добавлена в таблицу materials';
  RAISE NOTICE '✅ Колонка consumption добавлена в таблицу materials';
  RAISE NOTICE '✅ Существующие записи обновлены';
  RAISE NOTICE '✅ Индекс idx_materials_auto_calculate создан';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Логика работы:';
  RAISE NOTICE '   • auto_calculate = true → количество рассчитывается автоматически';
  RAISE NOTICE '   • auto_calculate = false → количество вводится вручную в смете';
  RAISE NOTICE '   • consumption используется только для auto_calculate = true';
END $$;
