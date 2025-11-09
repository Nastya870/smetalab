-- Migration 012: Populate demo hierarchy data for existing works
-- Description: Updates existing works with hierarchy information for testing
-- Date: 2025-10-13

-- ============================================
-- ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ РАБОТ С ИЕРАРХИЕЙ
-- ============================================

-- 1. Земляные работы (коды 01-xxx)
UPDATE works 
SET 
  phase = 'Подготовительные работы',
  section = 'Земляные работы',
  subsection = 'Разработка грунта'
WHERE code LIKE '01-%' AND name LIKE '%грунт%';

UPDATE works 
SET 
  phase = 'Подготовительные работы',
  section = 'Земляные работы',
  subsection = 'Планировка площадей'
WHERE code LIKE '01-%' AND name LIKE '%планировка%';

-- 2. Бетонные работы (коды 02-xxx)
UPDATE works 
SET 
  phase = 'Основные строительные работы',
  section = 'Бетонные работы',
  subsection = 'Бетонная подготовка'
WHERE code LIKE '02-%' AND (name LIKE '%подготовк%' OR name LIKE '%подготовит%');

UPDATE works 
SET 
  phase = 'Основные строительные работы',
  section = 'Бетонные работы',
  subsection = 'Устройство фундаментов'
WHERE code LIKE '02-%' AND name LIKE '%фундамент%';

-- 3. Кирпичная кладка (коды 03-xxx)
UPDATE works 
SET 
  phase = 'Основные строительные работы',
  section = 'Каменные работы',
  subsection = 'Кладка стен'
WHERE code LIKE '03-%';

-- 4. Отделочные работы (коды 04-xxx)
UPDATE works 
SET 
  phase = 'Отделочные работы',
  section = 'Внутренняя отделка',
  subsection = 'Штукатурные работы'
WHERE code LIKE '04-%' AND name LIKE '%штукатур%';

UPDATE works 
SET 
  phase = 'Отделочные работы',
  section = 'Внутренняя отделка',
  subsection = 'Облицовка'
WHERE code LIKE '04-%' AND name LIKE '%облицовк%';

UPDATE works 
SET 
  phase = 'Отделочные работы',
  section = 'Внутренняя отделка',
  subsection = 'Окраска'
WHERE code LIKE '04-%' AND name LIKE '%окрас%';

-- 5. Кровельные работы (коды 05-xxx)
UPDATE works 
SET 
  phase = 'Основные строительные работы',
  section = 'Кровельные работы',
  subsection = 'Устройство кровли'
WHERE code LIKE '05-%';

-- 6. Прочие работы (коды 06-xxx)
UPDATE works 
SET 
  phase = 'Отделочные работы',
  section = 'Установка изделий',
  subsection = 'Окна и двери'
WHERE code LIKE '06-%';

-- ============================================
-- ОБНОВЛЕНИЕ ESTIMATE_ITEMS С ИЕРАРХИЕЙ
-- ============================================
-- Note: estimate_items хранит денормализованные данные
-- Иерархия копируется в estimate_items только при НОВОМ добавлении работ через bulkCreateFromWorks
-- Существующие estimate_items не обновляются автоматически

-- ============================================
-- ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ============================================

-- Проверяем сколько работ обновлено
DO $$
DECLARE
  works_with_hierarchy INTEGER;
  total_works INTEGER;
  items_with_hierarchy INTEGER;
  total_items INTEGER;
BEGIN
  -- Считаем работы с иерархией
  SELECT COUNT(*) INTO works_with_hierarchy 
  FROM works 
  WHERE phase IS NOT NULL OR section IS NOT NULL OR subsection IS NOT NULL;
  
  SELECT COUNT(*) INTO total_works FROM works;
  
  -- Считаем позиции смет с иерархией
  SELECT COUNT(*) INTO items_with_hierarchy 
  FROM estimate_items 
  WHERE phase IS NOT NULL OR section IS NOT NULL OR subsection IS NOT NULL;
  
  SELECT COUNT(*) INTO total_items FROM estimate_items;
  
  -- Выводим результаты
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Миграция 012: Демо данные иерархии';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Работы с иерархией: % из %', works_with_hierarchy, total_works;
  RAISE NOTICE 'Позиции смет с иерархией: % из %', items_with_hierarchy, total_items;
  RAISE NOTICE '=================================================';
END $$;

-- ============================================
-- КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================

COMMENT ON COLUMN works.phase IS 'Фаза работ (уровень 1): Подготовительные, Основные, Отделочные, Завершающие';
COMMENT ON COLUMN works.section IS 'Раздел работ (уровень 2): Земляные, Бетонные, Каменные, Кровельные, Отделочные';
COMMENT ON COLUMN works.subsection IS 'Подраздел работ (уровень 3): Конкретный вид работ внутри раздела';

-- ============================================
-- ПРИМЕРЫ ИЕРАРХИИ
-- ============================================

/*
Примеры созданной иерархии:

1. Подготовительные работы → Земляные работы → Разработка грунта
   - Разработка грунта экскаватором
   - Планировка площадей бульдозером

2. Основные строительные работы → Бетонные работы → Устройство фундаментов
   - Устройство бетонной подготовки
   - Устройство монолитных фундаментов

3. Основные строительные работы → Каменные работы → Кладка стен
   - Кладка стен из кирпича

4. Отделочные работы → Внутренняя отделка → Штукатурные работы
   - Штукатурка внутренних стен

5. Отделочные работы → Внутренняя отделка → Облицовка
   - Облицовка стен керамической плиткой

6. Отделочные работы → Внутренняя отделка → Окраска
   - Окраска стен водоэмульсионной краской

7. Основные строительные работы → Кровельные работы → Устройство кровли
   - Устройство кровли из металлочерепицы

8. Отделочные работы → Установка изделий → Окна и двери
   - Монтаж окон ПВХ
*/
