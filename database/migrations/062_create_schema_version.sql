-- =====================================
-- МИГРАЦИЯ 062: Таблица учёта версий схемы
-- Дата: 2026-01-12
-- Причина: контроль применённых изменений
-- =====================================

-- Создаём таблицу учёта версий (если нет)
CREATE TABLE IF NOT EXISTS schema_version (
  id INT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT NOT NULL
);

-- Регистрируем эту миграцию
INSERT INTO schema_version (id, description)
VALUES (62, 'Добавлена таблица schema_version для учёта миграций')
ON CONFLICT (id) DO NOTHING;

-- Комментарий
COMMENT ON TABLE schema_version IS 'Таблица учёта применённых миграций схемы БД';
