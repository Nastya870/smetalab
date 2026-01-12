-- =====================================================
-- МИГРАЦИЯ: Исправление UNIQUE констрейнта для ролей
-- Версия: 061
-- Описание: Делает roles(key) уникальным только в рамках tenant_id (или глобально если tenant_id is null)
-- =====================================================

-- 1. Удаляем старый жесткий констрейн
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_key_unique;

-- 2. Создаем правильный уникальный индекс
-- Уникальность пары (key, tenant_id)
-- Но так как tenant_id может быть NULL, обычный UNIQUE(key, tenant_id) позволит дубликаты с NULL
-- Поэтому используем частичные индексы или NULLS NOT DISTINCT (в PG 15+)
-- Для совместимости лучше использовать два индекса:

-- Для тенантных ролей:
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_key_tenant 
ON roles (key, tenant_id) 
WHERE tenant_id IS NOT NULL;

-- Для глобальных ролей (tenant_id IS NULL):
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_key_global 
ON roles (key) 
WHERE tenant_id IS NULL;

