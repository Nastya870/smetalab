-- Migration: 032_add_last_act_to_work_completions.sql
-- Description: Добавление связи work_completions с актами для предотвращения дублирования работ
-- Date: 2025-11-06

-- ============================================================================
-- ДОБАВЛЯЕМ КОЛОНКУ last_act_id
-- ============================================================================

-- Добавляем ссылку на последний акт, в который была включена работа
ALTER TABLE work_completions 
ADD COLUMN last_act_id UUID REFERENCES work_completion_acts(id) ON DELETE SET NULL;

-- ============================================================================
-- ИНДЕКСЫ
-- ============================================================================

-- Индекс для быстрой выборки работ, которые еще не в актах
CREATE INDEX IF NOT EXISTS idx_work_completions_not_in_act 
ON work_completions(estimate_id, completed) 
WHERE completed = true AND last_act_id IS NULL;

-- Индекс для поиска работ по акту
CREATE INDEX IF NOT EXISTS idx_work_completions_by_act 
ON work_completions(last_act_id) 
WHERE last_act_id IS NOT NULL;

-- ============================================================================
-- КОММЕНТАРИИ
-- ============================================================================

COMMENT ON COLUMN work_completions.last_act_id 
IS 'Ссылка на последний акт выполненных работ, в который была включена эта работа (для предотвращения дублирования)';
