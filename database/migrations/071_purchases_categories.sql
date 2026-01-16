-- =====================================
-- МИГРАЦИЯ 071: Поддержка иерархических категорий в закупках
-- Дата: 2026-01-16
-- =====================================

BEGIN;

-- 1. Добавляем поля в таблицу purchases (Закупки в сметах)
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS category_full_path text;

-- 2. Добавляем поля в таблицу global_purchases (Общий журнал закупок)
ALTER TABLE global_purchases ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE global_purchases ADD COLUMN IF NOT EXISTS category_full_path text;

-- 3. Индексы для ускорения фильтрации и поиска
CREATE INDEX IF NOT EXISTS idx_purchases_category_id ON purchases(category_id);
CREATE INDEX IF NOT EXISTS idx_global_purchases_category_id ON global_purchases(category_id);

-- 4. Регистрация миграции
INSERT INTO schema_version (id, description)
VALUES (71, 'Hierarchical categories: added category fields to purchases and global_purchases')
ON CONFLICT (id) DO UPDATE SET 
  applied_at = NOW(),
  description = EXCLUDED.description;

COMMIT;
