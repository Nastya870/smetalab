-- =====================================
-- МИГРАЦИЯ 070: Иерархические категории (Pro)
-- Дата: 2026-01-16
-- =====================================

BEGIN;

-- 1. Улучшаем таблицу categories для поддержки иерархии и уникальности
-- Добавляем ограничение, чтобы нельзя было создать две одинаковые подкатегории в одном родителе
-- Примечание: Используем UNIQUE INDEX, так как стандартный CONSTRAINT не поддерживает выражения (COALESCE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_parent_scope_unique 
ON categories (name, parent_id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'));


-- 2. Обновляем таблицу materials
-- Добавляем связь с таблицей категорий
ALTER TABLE materials ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

-- Добавляем поле для хранения полного пути категории (для быстрого поиска и AI)
-- Например: "Строительные смеси / Штукатурки / Гипсовые"
ALTER TABLE materials ADD COLUMN IF NOT EXISTS category_full_path text;

-- 3. Создаем индексы для ускорения работы
CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
-- Индекс для ускоренного текстового поиска по пути категории
CREATE INDEX IF NOT EXISTS idx_materials_category_full_path_trgm ON materials USING gin (category_full_path gin_trgm_ops);

-- 4. Функция для автоматического обновления полного пути категории (по желанию для будущего)
-- Пока оставим это на уровне бэкенда при импорте, для прозрачности процесса.

-- 5. Регистрация миграции
INSERT INTO schema_version (id, description)
VALUES (70, 'Hierarchical categories: added category_id and category_full_path to materials')
ON CONFLICT (id) DO UPDATE SET 
  applied_at = NOW(),
  description = EXCLUDED.description;

COMMIT;
