-- ============================================
-- МИГРАЦИЯ: Исправление уникальности кода работ
-- Дата: 17.11.2025
-- Описание: Код работы должен быть уникален только в рамках scope (глобальный/тенантный)
-- ============================================

-- ПРОБЛЕМА:
-- Сейчас код работы уникален глобально: code VARCHAR(50) NOT NULL UNIQUE
-- Это не позволяет создавать тенантные работы с тем же кодом, что и глобальные
-- 
-- РЕШЕНИЕ:
-- 1. Удаляем старый UNIQUE constraint на code
-- 2. Создаем составной UNIQUE constraint: (code, is_global, tenant_id)
--    - Для глобальных работ (is_global=TRUE): код уникален глобально
--    - Для тенантных работ (is_global=FALSE): код уникален в рамках tenant_id

BEGIN;

DO $$
BEGIN
  RAISE NOTICE '🔧 Исправление уникальности кода работ...';
  
  -- 1. Удаляем старый UNIQUE constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'works_code_key' AND conrelid = 'works'::regclass
  ) THEN
    ALTER TABLE works DROP CONSTRAINT works_code_key;
    RAISE NOTICE '✅ Удален старый constraint works_code_key';
  ELSE
    RAISE NOTICE '⚠️  Constraint works_code_key не найден (возможно, уже удален)';
  END IF;
  
  -- 2. Создаем новый составной UNIQUE constraint
  -- Для глобальных: код уникален (is_global=TRUE, tenant_id=NULL)
  -- Для тенантных: код уникален в рамках тенанта (is_global=FALSE, tenant_id=конкретный)
  ALTER TABLE works 
  ADD CONSTRAINT works_code_scope_unique 
  UNIQUE (code, is_global, tenant_id);
  
  RAISE NOTICE '✅ Создан новый constraint works_code_scope_unique (code, is_global, tenant_id)';
  
  -- 3. Создаем частичный индекс для глобальных работ (оптимизация)
  CREATE INDEX IF NOT EXISTS idx_works_global_code 
  ON works(code) 
  WHERE is_global = TRUE;
  
  RAISE NOTICE '✅ Создан индекс idx_works_global_code для глобальных работ';
  
  -- 4. Создаем составной индекс для тенантных работ (оптимизация)
  CREATE INDEX IF NOT EXISTS idx_works_tenant_code 
  ON works(tenant_id, code) 
  WHERE is_global = FALSE;
  
  RAISE NOTICE '✅ Создан индекс idx_works_tenant_code для тенантных работ';
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 РЕЗУЛЬТАТ:';
  RAISE NOTICE '   • Глобальная работа с кодом "0-1" может существовать один раз (is_global=TRUE)';
  RAISE NOTICE '   • Тенантная работа с кодом "0-1" может существовать в каждом тенанте отдельно';
  RAISE NOTICE '   • Тенантные справочники теперь независимы от глобальных!';
  RAISE NOTICE '';
  
END $$;

COMMIT;

-- ============================================
-- ТЕСТИРОВАНИЕ (опционально)
-- ============================================

-- Проверка constraint:
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'works_code_scope_unique' 
    AND conrelid = 'works'::regclass
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE '✅ Constraint works_code_scope_unique успешно применен';
  ELSE
    RAISE EXCEPTION '❌ Constraint works_code_scope_unique НЕ найден!';
  END IF;
END $$;

-- Проверка индексов:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_works_global_code') THEN
    RAISE NOTICE '✅ Индекс idx_works_global_code найден';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_works_tenant_code') THEN
    RAISE NOTICE '✅ Индекс idx_works_tenant_code найден';
  END IF;
END $$;

-- Успешное завершение
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Миграция 042_fix_works_code_uniqueness успешно применена!';
  RAISE NOTICE '';
END $$;
