-- =====================================================
-- SEED: Базовые роли и разрешения
-- Версия: 002
-- Описание: Наполнение справочников ролей и разрешений
-- =====================================================

-- =====================================================
-- РОЛИ (roles)
-- =====================================================

INSERT INTO roles (key, name, description, is_system) VALUES
    ('super_admin', 'Супер Администратор', 'Полный доступ ко всей системе, не привязан к тенанту', TRUE),
    ('admin', 'Администратор', 'Полный доступ к компании и её данным', TRUE), -- Глобальный шаблон
    ('project_manager', 'Менеджер проектов', 'Управление проектами и сметами', TRUE),
    ('estimator', 'Сметчик', 'Создание и редактирование смет', TRUE),
    ('supplier', 'Поставщик', 'Просмотр смет и добавление предложений', TRUE),
    ('viewer', 'Наблюдатель', 'Только чтение данных', TRUE)
ON CONFLICT (key) WHERE tenant_id IS NULL DO NOTHING;

-- =====================================================
-- РАЗРЕШЕНИЯ (permissions)
-- Формат: resource.action
-- =====================================================

-- Управление пользователями
INSERT INTO permissions (key, name, description, resource, action) VALUES
    ('users.create', 'Создание пользователей', 'Добавление новых пользователей', 'users', 'create'),
    ('users.read', 'Просмотр пользователей', 'Просмотр списка и профилей пользователей', 'users', 'read'),
    ('users.update', 'Редактирование пользователей', 'Изменение данных пользователей', 'users', 'update'),
    ('users.delete', 'Удаление пользователей', 'Удаление пользователей из системы', 'users', 'delete'),
    ('users.manage', 'Управление пользователями', 'Полное управление пользователями', 'users', 'manage'),
    
    -- Управление тенантами
    ('tenants.create', 'Создание компаний', 'Создание новых компаний', 'tenants', 'create'),
    ('tenants.read', 'Просмотр компаний', 'Просмотр информации о компаниях', 'tenants', 'read'),
    ('tenants.update', 'Редактирование компаний', 'Изменение настроек компании', 'tenants', 'update'),
    ('tenants.delete', 'Удаление компаний', 'Удаление компаний', 'tenants', 'delete'),
    ('tenants.manage', 'Управление компаниями', 'Полное управление компаниями', 'tenants', 'manage'),
    
    -- Управление проектами
    ('projects.create', 'Создание проектов', 'Создание новых проектов', 'projects', 'create'),
    ('projects.read', 'Просмотр проектов', 'Просмотр проектов', 'projects', 'read'),
    ('projects.update', 'Редактирование проектов', 'Изменение данных проектов', 'projects', 'update'),
    ('projects.delete', 'Удаление проектов', 'Удаление проектов', 'projects', 'delete'),
    ('projects.manage', 'Управление проектами', 'Полное управление проектами', 'projects', 'manage'),
    
    -- Управление сметами
    ('estimates.create', 'Создание смет', 'Создание новых смет', 'estimates', 'create'),
    ('estimates.read', 'Просмотр смет', 'Просмотр смет', 'estimates', 'read'),
    ('estimates.update', 'Редактирование смет', 'Изменение данных смет', 'estimates', 'update'),
    ('estimates.delete', 'Удаление смет', 'Удаление смет', 'estimates', 'delete'),
    ('estimates.manage', 'Управление сметами', 'Полное управление сметами', 'estimates', 'manage'),
    ('estimates.approve', 'Утверждение смет', 'Утверждение и финализация смет', 'estimates', 'approve'),
    
    -- Управление позициями смет
    ('estimate_items.create', 'Создание позиций', 'Добавление позиций в сметы', 'estimate_items', 'create'),
    ('estimate_items.read', 'Просмотр позиций', 'Просмотр позиций смет', 'estimate_items', 'read'),
    ('estimate_items.update', 'Редактирование позиций', 'Изменение позиций смет', 'estimate_items', 'update'),
    ('estimate_items.delete', 'Удаление позиций', 'Удаление позиций смет', 'estimate_items', 'delete'),
    
    -- Управление ролями и разрешениями
    ('roles.create', 'Создание ролей', 'Создание новых ролей', 'roles', 'create'),
    ('roles.read', 'Просмотр ролей', 'Просмотр ролей', 'roles', 'read'),
    ('roles.update', 'Редактирование ролей', 'Изменение ролей', 'roles', 'update'),
    ('roles.delete', 'Удаление ролей', 'Удаление ролей', 'roles', 'delete'),
    ('roles.assign', 'Назначение ролей', 'Назначение ролей пользователям', 'roles', 'assign'),
    
    -- Управление настройками
    ('settings.read', 'Просмотр настроек', 'Просмотр настроек системы', 'settings', 'read'),
    ('settings.update', 'Изменение настроек', 'Изменение настроек системы', 'settings', 'update'),
    
    -- Управление отчетами
    ('reports.read', 'Просмотр отчетов', 'Просмотр отчетов', 'reports', 'read'),
    ('reports.create', 'Создание отчетов', 'Создание отчетов', 'reports', 'create'),
    ('reports.export', 'Экспорт отчетов', 'Экспорт отчетов в различные форматы', 'reports', 'export'),
    
    -- Управление комментариями
    ('comments.create', 'Создание комментариев', 'Добавление комментариев', 'comments', 'create'),
    ('comments.read', 'Просмотр комментариев', 'Просмотр комментариев', 'comments', 'read'),
    ('comments.update', 'Редактирование комментариев', 'Изменение комментариев', 'comments', 'update'),
    ('comments.delete', 'Удаление комментариев', 'Удаление комментариев', 'comments', 'delete')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- НАЗНАЧЕНИЕ РАЗРЕШЕНИЙ РОЛЯМ (role_permissions)
-- =====================================================

-- Супер Администратор: ВСЕ разрешения
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Администратор: полный доступ к тенанту (все кроме управления тенантами)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'admin'
  AND p.resource != 'tenants'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Добавляем админу чтение тенантов
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'admin'
  AND p.key = 'tenants.read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Менеджер проектов: управление проектами, сметами, чтение пользователей
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'project_manager'
  AND p.resource IN ('projects', 'estimates', 'estimate_items', 'reports', 'comments')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'project_manager'
  AND p.key IN ('users.read', 'settings.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Сметчик: создание и редактирование смет
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'estimator'
  AND p.resource IN ('estimates', 'estimate_items', 'comments')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'estimator'
  AND p.key IN ('projects.read', 'reports.read', 'users.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Поставщик: просмотр смет, добавление комментариев
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'supplier'
  AND p.action = 'read'
  AND p.resource IN ('projects', 'estimates', 'estimate_items')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'supplier'
  AND p.resource = 'comments'
  AND p.action IN ('create', 'read', 'update')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Наблюдатель: только чтение
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'viewer'
  AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================
-- СОЗДАНИЕ СИСТЕМНОГО ТЕНАНТА ДЛЯ СУПЕР-АДМИНОВ
-- =====================================================

INSERT INTO tenants (id, name, plan, status)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'SYSTEM',
    'enterprise',
    'active'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- СОЗДАНИЕ ТЕСТОВОГО СУПЕР-АДМИНА
-- =====================================================
-- Пароль: Admin123!
-- Хэш сгенерирован через bcrypt (10 раундов)

INSERT INTO users (id, email, pass_hash, full_name, status, email_verified)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'admin@smetka.ru',
    '$2b$10$EIXvXQ5pJxK3JhVZpJJ7vu8LJL6WqKxG4kZxFQYJZJQYJZ4JZJZJZe', -- Temporary: Admin123!
    'Супер Администратор',
    'active',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Связываем супер-админа с системным тенантом
INSERT INTO user_tenants (tenant_id, user_id, is_default)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    TRUE
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Назначаем супер-админу глобальную роль
INSERT INTO user_role_assignments (tenant_id, user_id, role_id)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid, -- Системный тенант
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    r.id
FROM roles r
WHERE r.key = 'super_admin'
ON CONFLICT (tenant_id, user_id, role_id) DO NOTHING;

-- =====================================================
-- ВЫВОД СТАТИСТИКИ
-- =====================================================

DO $$
DECLARE
    roles_count INT;
    permissions_count INT;
    role_permissions_count INT;
BEGIN
    SELECT COUNT(*) INTO roles_count FROM roles;
    SELECT COUNT(*) INTO permissions_count FROM permissions;
    SELECT COUNT(*) INTO role_permissions_count FROM role_permissions;
    
    RAISE NOTICE 'Seed-скрипт успешно применен!';
    RAISE NOTICE 'Создано ролей: %', roles_count;
    RAISE NOTICE 'Создано разрешений: %', permissions_count;
    RAISE NOTICE 'Создано связей роль-разрешение: %', role_permissions_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Тестовый супер-админ:';
    RAISE NOTICE 'Email: admin@smetka.ru';
    RAISE NOTICE 'Пароль: Admin123! (ОБЯЗАТЕЛЬНО СМЕНИТЕ!)';
END $$;
