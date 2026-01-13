-- =====================================
-- МИГРАЦИЯ 063: Удаление устаревшей таблицы suppliers
-- Дата: 2026-01-12
-- 
-- ПРОВЕРЕНО:
-- ✅ FK: НЕТ
-- ✅ Views: НЕТ
-- ✅ Функции: НЕТ
-- ✅ Триггеры: НЕТ
-- ✅ RLS политики: НЕТ
-- =====================================

-- Удаляем таблицу suppliers (не используется с версии X)
DROP TABLE IF EXISTS public.suppliers CASCADE;

-- Регистрируем миграцию
INSERT INTO schema_version (id, description)
VALUES (63, 'Удалена устаревшая таблица suppliers (не используется)')
ON CONFLICT (id) DO NOTHING;
