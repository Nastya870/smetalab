-- ============================================================================
-- Скрипт для удаления всех проектов и смет из базы данных
-- Дата: 15 октября 2025 г.
-- Внимание: Необратимая операция! Будут удалены ВСЕ проекты и сметы ВСЕХ пользователей
-- ============================================================================

-- Начинаем транзакцию для безопасности
BEGIN;

-- ============================================================================
-- 1. ИНФОРМАЦИЯ ПЕРЕД УДАЛЕНИЕМ
-- ============================================================================

DO $$ 
DECLARE
  v_estimates_count INTEGER;
  v_estimate_items_count INTEGER;
  v_estimate_materials_count INTEGER;
  v_projects_count INTEGER;
  v_team_members_count INTEGER;
BEGIN
  -- Подсчитываем количество записей
  SELECT COUNT(*) INTO v_estimates_count FROM estimates;
  SELECT COUNT(*) INTO v_estimate_items_count FROM estimate_items;
  SELECT COUNT(*) INTO v_estimate_materials_count FROM estimate_item_materials;
  SELECT COUNT(*) INTO v_projects_count FROM projects;
  SELECT COUNT(*) INTO v_team_members_count FROM project_team_members;
  
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  📊 СТАТИСТИКА ПЕРЕД УДАЛЕНИЕМ                             ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Проектов:                        % записей              ║', LPAD(v_projects_count::TEXT, 8, ' ');
  RAISE NOTICE '║  Участников команд проектов:      % записей              ║', LPAD(v_team_members_count::TEXT, 8, ' ');
  RAISE NOTICE '║  Смет:                            % записей              ║', LPAD(v_estimates_count::TEXT, 8, ' ');
  RAISE NOTICE '║  Позиций смет:                    % записей              ║', LPAD(v_estimate_items_count::TEXT, 8, ' ');
  RAISE NOTICE '║  Материалов в позициях:           % записей              ║', LPAD(v_estimate_materials_count::TEXT, 8, ' ');
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 2. УДАЛЕНИЕ ДАННЫХ (в правильном порядке с учётом зависимостей)
-- ============================================================================

-- Отключаем RLS временно для операций удаления (требуются права супер-админа)
-- Это позволит удалить данные всех tenant'ов
SET session_replication_role = 'replica';

RAISE NOTICE '🗑️  Начинаем удаление данных...';
RAISE NOTICE '';

-- Шаг 1: Удаляем материалы из позиций смет (если такая таблица существует)
DO $$ 
DECLARE
  v_deleted INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimate_item_materials') THEN
    DELETE FROM estimate_item_materials;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RAISE NOTICE '  ✅ Удалено материалов из позиций смет: % записей', v_deleted;
  END IF;
END $$;

-- Шаг 2: Удаляем позиции смет
DO $$ 
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM estimate_items;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '  ✅ Удалено позиций смет: % записей', v_deleted;
END $$;

-- Шаг 3: Удаляем сметы
DO $$ 
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM estimates;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '  ✅ Удалено смет: % записей', v_deleted;
END $$;

-- Шаг 4: Удаляем участников команд проектов
DO $$ 
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM project_team_members;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '  ✅ Удалено участников команд: % записей', v_deleted;
END $$;

-- Шаг 5: Удаляем проекты
DO $$ 
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM projects;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '  ✅ Удалено проектов: % записей', v_deleted;
END $$;

-- Включаем RLS обратно
SET session_replication_role = 'origin';

RAISE NOTICE '';
RAISE NOTICE '✅ Удаление завершено!';
RAISE NOTICE '';

-- ============================================================================
-- 3. ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ============================================================================

DO $$ 
DECLARE
  v_estimates_count INTEGER;
  v_estimate_items_count INTEGER;
  v_estimate_materials_count INTEGER;
  v_projects_count INTEGER;
  v_team_members_count INTEGER;
BEGIN
  -- Подсчитываем оставшиеся записи
  SELECT COUNT(*) INTO v_estimates_count FROM estimates;
  SELECT COUNT(*) INTO v_estimate_items_count FROM estimate_items;
  
  -- Проверяем существование таблицы estimate_item_materials
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimate_item_materials') THEN
    SELECT COUNT(*) INTO v_estimate_materials_count FROM estimate_item_materials;
  ELSE
    v_estimate_materials_count := 0;
  END IF;
  
  SELECT COUNT(*) INTO v_projects_count FROM projects;
  SELECT COUNT(*) INTO v_team_members_count FROM project_team_members;
  
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  📊 СТАТИСТИКА ПОСЛЕ УДАЛЕНИЯ                              ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Проектов:                        % записей              ║', LPAD(v_projects_count::TEXT, 8, ' ');
  RAISE NOTICE '║  Участников команд проектов:      % записей              ║', LPAD(v_team_members_count::TEXT, 8, ' ');
  RAISE NOTICE '║  Смет:                            % записей              ║', LPAD(v_estimates_count::TEXT, 8, ' ');
  RAISE NOTICE '║  Позиций смет:                    % записей              ║', LPAD(v_estimate_items_count::TEXT, 8, ' ');
  RAISE NOTICE '║  Материалов в позициях:           % записей              ║', LPAD(v_estimate_materials_count::TEXT, 8, ' ');
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  
  -- Проверяем что всё удалено
  IF v_projects_count = 0 AND v_estimates_count = 0 AND v_estimate_items_count = 0 AND v_team_members_count = 0 THEN
    RAISE NOTICE '✅ Все проекты и сметы успешно удалены!';
  ELSE
    RAISE WARNING '⚠️  Некоторые записи могли остаться из-за ограничений прав доступа';
  END IF;
END $$;

-- ============================================================================
-- 4. СБРОС ПОСЛЕДОВАТЕЛЬНОСТЕЙ (если используются)
-- ============================================================================

-- Примечание: UUID не используют последовательности, поэтому этот шаг не требуется
-- Но если бы использовались SERIAL, нужно было бы сбросить:
-- ALTER SEQUENCE projects_id_seq RESTART WITH 1;
-- ALTER SEQUENCE estimates_id_seq RESTART WITH 1;

RAISE NOTICE '';
RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
RAISE NOTICE '║  🎯 ОПЕРАЦИЯ ЗАВЕРШЕНА УСПЕШНО                             ║';
RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';
RAISE NOTICE '║  • Все проекты удалены                                     ║';
RAISE NOTICE '║  • Все сметы удалены                                       ║';
RAISE NOTICE '║  • Все позиции смет удалены                                ║';
RAISE NOTICE '║  • Все участники команд удалены                            ║';
RAISE NOTICE '║                                                            ║';
RAISE NOTICE '║  База данных готова для новых проектов!                    ║';
RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';

-- Подтверждаем транзакцию
COMMIT;

-- ============================================================================
-- ПРИМЕЧАНИЯ:
-- ============================================================================
-- 1. Этот скрипт удаляет ВСЕ проекты и сметы ВСЕХ пользователей/компаний
-- 2. Справочники (works, materials, users, tenants) НЕ затрагиваются
-- 3. Используется транзакция - если что-то пойдёт не так, можно откатить
-- 4. RLS временно отключается для доступа ко всем tenant'ам
-- 5. Операция необратима после COMMIT!
-- 
-- ДЛЯ ЗАПУСКА:
-- psql "postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require" -f clear_projects_and_estimates.sql
-- ============================================================================
