-- ============================================================================
-- Migration 029: Обновление статусов проектов
-- Описание: Добавление новых статусов для проектов (согласование, отказ)
-- Дата: 27 октября 2025 г.
-- Версия: v1.6.5
-- ============================================================================

-- 1. Удаляем старый CHECK constraint для статуса
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- 2. Добавляем новый CHECK constraint с обновленными статусами
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('planning', 'approval', 'in_progress', 'rejected', 'completed', 'active', 'on-hold', 'cancelled'));

-- 3. Обновляем комментарий к колонке status
COMMENT ON COLUMN projects.status IS 'Текущий статус: planning (Планирование), approval (Согласование), in_progress (В работе), rejected (Отказ), completed (Завершён). Старые статусы: active, on-hold, cancelled - для обратной совместимости';

-- 4. Мигрируем старые статусы на новые (опционально)
-- active -> in_progress
UPDATE projects SET status = 'in_progress' WHERE status = 'active';

-- on-hold -> planning (приостановленные переводим в планирование)
-- UPDATE projects SET status = 'planning' WHERE status = 'on-hold';

-- cancelled -> rejected (отмененные переводим в отказ)
-- UPDATE projects SET status = 'rejected' WHERE status = 'cancelled';

-- ============================================================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration 029: Статусы проектов успешно обновлены!';
  RAISE NOTICE '📋 Новые статусы:';
  RAISE NOTICE '   1. planning - Планирование';
  RAISE NOTICE '   2. approval - Согласование';
  RAISE NOTICE '   3. in_progress - В работе';
  RAISE NOTICE '   4. rejected - Отказ';
  RAISE NOTICE '   5. completed - Завершён';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Миграция статусов:';
  RAISE NOTICE '   - active → in_progress (автоматически)';
  RAISE NOTICE '   - Старые статусы (on-hold, cancelled) сохранены для совместимости';
END $$;
