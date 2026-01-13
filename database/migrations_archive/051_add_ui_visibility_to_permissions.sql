-- Migration 051: Добавление функции скрытия UI элементов для разрешений
-- Дата: 19.11.2025
-- Описание: Добавляем поле is_hidden для контроля видимости элементов меню и функций в UI

-- Шаг 1: Добавляем новое поле is_hidden в таблицу permissions
ALTER TABLE permissions 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Шаг 2: Добавляем комментарии
COMMENT ON COLUMN permissions.is_hidden IS 'Скрыть этот элемент в UI (меню, кнопки) для роли';

-- Шаг 3: Создаем индекс для быстрого поиска скрытых разрешений
CREATE INDEX IF NOT EXISTS idx_permissions_is_hidden ON permissions(is_hidden);

-- Шаг 4: Добавляем новую таблицу для связи role_permissions с флагом is_hidden
-- Это позволит каждой роли иметь свои настройки скрытия для каждого разрешения
ALTER TABLE role_permissions 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN role_permissions.is_hidden IS 'Скрыть этот элемент в UI для данной роли';

-- Шаг 5: Создаем индекс для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_role_permissions_is_hidden ON role_permissions(role_id, is_hidden);

-- Шаг 6: Добавляем специальные разрешения для UI элементов (скрываемые пункты меню)
-- Эти разрешения будут использоваться ТОЛЬКО для контроля видимости в UI

-- Шаблоны смет
INSERT INTO permissions (key, name, description, resource, action, is_hidden)
VALUES (
  'estimate_templates.view',
  'Видеть шаблоны смет в меню',
  'Отображение пункта меню "Шаблоны смет"',
  'estimate_templates',
  'view',
  FALSE
) ON CONFLICT (key) DO NOTHING;

-- Справочники
INSERT INTO permissions (key, name, description, resource, action, is_hidden)
VALUES (
  'references.view',
  'Видеть справочники в меню',
  'Отображение раздела "Справочники"',
  'references',
  'view',
  FALSE
) ON CONFLICT (key) DO NOTHING;

-- Справочник работ
INSERT INTO permissions (key, name, description, resource, action, is_hidden)
VALUES (
  'works.view_menu',
  'Видеть справочник работ в меню',
  'Отображение пункта "Справочник работ"',
  'works',
  'view_menu',
  FALSE
) ON CONFLICT (key) DO NOTHING;

-- Справочник материалов
INSERT INTO permissions (key, name, description, resource, action, is_hidden)
VALUES (
  'materials.view_menu',
  'Видеть справочник материалов в меню',
  'Отображение пункта "Справочник материалов"',
  'materials',
  'view_menu',
  FALSE
) ON CONFLICT (key) DO NOTHING;

-- Закупки
INSERT INTO permissions (key, name, description, resource, action, is_hidden)
VALUES (
  'purchases.view_menu',
  'Видеть закупки в меню',
  'Отображение пункта "Закупки"',
  'purchases',
  'view_menu',
  FALSE
) ON CONFLICT (key) DO NOTHING;

-- Dashboard
INSERT INTO permissions (key, name, description, resource, action, is_hidden)
VALUES (
  'dashboard.view',
  'Видеть дашборд',
  'Отображение главной страницы Dashboard',
  'dashboard',
  'view',
  FALSE
) ON CONFLICT (key) DO NOTHING;

-- Администрирование
INSERT INTO permissions (key, name, description, resource, action, is_hidden)
VALUES (
  'admin.view_menu',
  'Видеть раздел администрирования',
  'Отображение раздела "Администрирование"',
  'admin',
  'view_menu',
  FALSE
) ON CONFLICT (key) DO NOTHING;

-- Шаг 7: Обновляем разрешения для существующих ролей
-- super_admin видит всё
INSERT INTO role_permissions (role_id, permission_id, is_hidden)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  FALSE as is_hidden
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'super_admin'
  AND p.action IN ('view', 'view_menu')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- admin видит всё кроме системных разделов
INSERT INTO role_permissions (role_id, permission_id, is_hidden)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  FALSE as is_hidden
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'admin'
  AND p.action IN ('view', 'view_menu')
  AND p.resource != 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- project_manager видит проекты, сметы, материалы, закупки
INSERT INTO role_permissions (role_id, permission_id, is_hidden)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  FALSE as is_hidden
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'project_manager'
  AND p.action IN ('view', 'view_menu')
  AND p.resource IN ('dashboard', 'projects', 'estimates', 'materials', 'works', 'purchases', 'references')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- estimator видит только сметы и справочники
INSERT INTO role_permissions (role_id, permission_id, is_hidden)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  CASE 
    WHEN p.resource IN ('dashboard', 'estimates', 'materials', 'works', 'references') THEN FALSE
    ELSE TRUE -- Скрываем остальное
  END as is_hidden
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'estimator'
  AND p.action IN ('view', 'view_menu')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- supplier видит только закупки и материалы
INSERT INTO role_permissions (role_id, permission_id, is_hidden)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  CASE 
    WHEN p.resource IN ('purchases', 'materials') THEN FALSE
    ELSE TRUE -- Скрываем всё остальное
  END as is_hidden
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'supplier'
  AND p.action IN ('view', 'view_menu')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- viewer видит всё в режиме только чтения, ничего не скрыто
INSERT INTO role_permissions (role_id, permission_id, is_hidden)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  FALSE as is_hidden
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'viewer'
  AND p.action IN ('view', 'view_menu')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Шаг 8: Создаем функцию для проверки видимости UI элемента
CREATE OR REPLACE FUNCTION check_ui_visibility(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT DEFAULT 'view'
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_visible BOOLEAN;
BEGIN
  -- Проверяем, есть ли у пользователя разрешение И оно НЕ скрыто
  SELECT EXISTS(
    SELECT 1
    FROM user_role_assignments ura
    JOIN role_permissions rp ON ura.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ura.user_id = p_user_id
      AND p.resource = p_resource
      AND p.action = p_action
      AND rp.is_hidden = FALSE
  ) INTO v_is_visible;
  
  RETURN v_is_visible;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_ui_visibility IS 'Проверяет, виден ли UI элемент для пользователя (с учетом is_hidden)';

-- Шаг 9: Создаем представление для удобного получения видимых пунктов меню
CREATE OR REPLACE VIEW v_user_visible_menu AS
SELECT DISTINCT
  u.id as user_id,
  u.email,
  p.resource,
  p.action,
  p.name as permission_name,
  p.description,
  rp.is_hidden,
  r.key as role_key,
  r.name as role_name
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN roles r ON ura.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.action IN ('view', 'view_menu')
  AND rp.is_hidden = FALSE
ORDER BY u.email, p.resource;

COMMENT ON VIEW v_user_visible_menu IS 'Представление для получения видимых пунктов меню пользователя';

-- Шаг 10: Логируем выполнение миграции
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 051 completed successfully';
  RAISE NOTICE '✅ Added is_hidden column to permissions and role_permissions';
  RAISE NOTICE '✅ Created UI visibility permissions for menu items';
  RAISE NOTICE '✅ Created check_ui_visibility() function';
  RAISE NOTICE '✅ Created v_user_visible_menu view';
END $$;
