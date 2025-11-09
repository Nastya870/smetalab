-- Migration: 032_update_act_statuses.sql
-- Description: Обновление статусов актов выполненных работ
-- Date: 2025-10-28
-- Author: System

-- ============================================================================
-- ОБНОВЛЕНИЕ CONSTRAINT ДЛЯ СТАТУСОВ
-- ============================================================================

-- Удаляем старый constraint
ALTER TABLE work_completion_acts 
DROP CONSTRAINT IF EXISTS work_completion_acts_status_check;

-- Добавляем новый constraint с актуальными статусами
ALTER TABLE work_completion_acts 
ADD CONSTRAINT work_completion_acts_status_check 
CHECK (status IN ('draft', 'pending', 'approved', 'paid'));

-- ============================================================================
-- КОММЕНТАРИИ К СТАТУСАМ
-- ============================================================================

COMMENT ON COLUMN work_completion_acts.status IS 
'Статус акта:
- draft: Черновик
- pending: На согласовании
- approved: Согласован
- paid: Оплачен';

-- ============================================================================
-- ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ЗАПИСЕЙ
-- ============================================================================

-- Маппинг старых статусов на новые:
-- signed -> approved (Подписан -> Согласован)
-- cancelled -> draft (Отменён -> Черновик)

UPDATE work_completion_acts 
SET status = 'approved' 
WHERE status = 'signed';

UPDATE work_completion_acts 
SET status = 'draft' 
WHERE status = 'cancelled';

-- ============================================================================
-- СОЗДАНИЕ ИНДЕКСА (если не существует)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_acts_status ON work_completion_acts(status);
