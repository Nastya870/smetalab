-- ============================================================================
-- Скрипт для удаления всех проектов и смет через веб-интерфейс NEON
-- Дата: 15 октября 2025 г.
-- Инструкция: Скопируй и вставь этот код в SQL Editor на console.neon.tech
-- ============================================================================

-- Сначала посмотрим что у нас есть:
SELECT 'BEFORE DELETE - Statistics' as info;
SELECT 
  (SELECT COUNT(*) FROM projects) as projects_count,
  (SELECT COUNT(*) FROM estimates) as estimates_count,
  (SELECT COUNT(*) FROM estimate_items) as estimate_items_count,
  (SELECT COUNT(*) FROM project_team_members) as team_members_count;

-- Смотрим детальную информацию по tenant'ам:
SELECT 
  t.name as company,
  COUNT(DISTINCT p.id) as projects,
  COUNT(DISTINCT e.id) as estimates
FROM tenants t
LEFT JOIN projects p ON p.tenant_id = t.id
LEFT JOIN estimates e ON e.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.name;

-- ============================================================================
-- УДАЛЕНИЕ ДАННЫХ (раскомментируй когда будешь готов удалить)
-- ============================================================================

-- Шаг 1: Удаляем материалы из позиций смет (если таблица существует)
-- DELETE FROM estimate_item_materials;

-- Шаг 2: Удаляем позиции смет
-- DELETE FROM estimate_items;

-- Шаг 3: Удаляем сметы
-- DELETE FROM estimates;

-- Шаг 4: Удаляем участников команд проектов
-- DELETE FROM project_team_members;

-- Шаг 5: Удаляем проекты
-- DELETE FROM projects;

-- ============================================================================
-- ПРОВЕРКА ПОСЛЕ УДАЛЕНИЯ (раскомментируй после удаления)
-- ============================================================================

-- SELECT 'AFTER DELETE - Statistics' as info;
-- SELECT 
--   (SELECT COUNT(*) FROM projects) as projects_count,
--   (SELECT COUNT(*) FROM estimates) as estimates_count,
--   (SELECT COUNT(*) FROM estimate_items) as estimate_items_count,
--   (SELECT COUNT(*) FROM project_team_members) as team_members_count;

-- ============================================================================
-- ИНСТРУКЦИЯ ДЛЯ ВЫПОЛНЕНИЯ:
-- ============================================================================
-- 1. Открой https://console.neon.tech
-- 2. Выбери свой проект и базу данных
-- 3. Открой SQL Editor
-- 4. Скопируй ВСЁ содержимое этого файла
-- 5. Вставь в SQL Editor
-- 6. Сначала выполни запросы статистики (они уже активны)
-- 7. Если готов удалить - раскомментируй DELETE команды (убери -- в начале)
-- 8. Выполни DELETE команды
-- 9. Раскомментируй и выполни проверку после удаления
-- ============================================================================
