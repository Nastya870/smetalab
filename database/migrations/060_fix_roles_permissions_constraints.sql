-- =====================================================
-- МИГРАЦИЯ: Исправление дубликатов и добавление констрейнтов
-- Версия: 060
-- Описание: Удаляет дубликаты в roles, permissions, role_permissions и добавляет UNIQUE индексы
-- =====================================================

-- 1. Удаление дубликатов в role_permissions
-- Оставляем только одну запись для каждой пары (role_id, permission_id)
DELETE FROM role_permissions a USING role_permissions b
WHERE a.id < b.id 
  AND a.role_id = b.role_id 
  AND a.permission_id = b.permission_id;

-- 2. Удаление дубликатов в permissions
-- Оставляем запись с минимальным ID для каждого key
DELETE FROM permissions a USING permissions b
WHERE a.id < b.id 
  AND a.key = b.key;

-- Оставляем запись с минимальным ID для каждой пары (resource, action)
DELETE FROM permissions a USING permissions b
WHERE a.id < b.id 
  AND a.resource = b.resource 
  AND a.action = b.action;

-- 3. Удаление дубликатов в roles
-- Оставляем запись с минимальным ID для каждого key в рамках одного тенанта (или глобально)
DELETE FROM roles a USING roles b
WHERE a.id < b.id 
  AND a.key = b.key
  AND (a.tenant_id = b.tenant_id OR (a.tenant_id IS NULL AND b.tenant_id IS NULL));

-- 4. Добавление UNIQUE констрейнтов (если их нет)

DO $$
BEGIN
    -- roles(key)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_key_unique') THEN
        ALTER TABLE roles ADD CONSTRAINT roles_key_unique UNIQUE (key);
    END IF;

    -- permissions(key)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permissions_key_unique') THEN
        ALTER TABLE permissions ADD CONSTRAINT permissions_key_unique UNIQUE (key);
    END IF;

    -- permissions(resource, action)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permissions_resource_action_unique') THEN
        ALTER TABLE permissions ADD CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action);
    END IF;

    -- role_permissions(role_id, permission_id)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_unique') THEN
        ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id);
    END IF;
END $$;
