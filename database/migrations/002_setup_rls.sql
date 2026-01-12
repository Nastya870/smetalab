-- =====================================================
-- МИГРАЦИЯ: Row Level Security (RLS)
-- Версия: 003
-- Описание: Настройка политик безопасности на уровне строк
-- =====================================================

-- =====================================================
-- СОЗДАНИЕ РОЛИ app_super_admin
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_super_admin') THEN
        BEGIN
            CREATE ROLE app_super_admin WITH BYPASSRLS;
            RAISE NOTICE 'Роль app_super_admin создана';
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE WARNING 'Нет прав на создание роли app_super_admin. Пропускаем.';
        END;
    ELSE
        RAISE NOTICE 'Роль app_super_admin уже существует';
    END IF;
END
$$;

-- =====================================================
-- ВКЛЮЧЕНИЕ RLS НА ТАБЛИЦАХ С TENANT_ID
-- =====================================================

-- Таблицы, которые будут защищены RLS (содержат tenant_id)
-- Пока включаем RLS, но не создаем политики - это будет позже
-- когда появятся бизнес-данные

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE sessions IS 'RLS включен: сессии фильтруются по tenant_id';

-- =====================================================
-- ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ТЕКУЩЕГО TENANT_ID ИЗ СЕССИИ
-- =====================================================

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.tenant_id', TRUE), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION current_tenant_id() IS 'Возвращает текущий tenant_id из переменной сессии';

-- =====================================================
-- ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ТЕКУЩЕГО USER_ID ИЗ СЕССИИ
-- =====================================================

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.user_id', TRUE), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION current_user_id() IS 'Возвращает текущий user_id из переменной сессии';

-- =====================================================
-- ФУНКЦИЯ ДЛЯ ПРОВЕРКИ, ЯВЛЯЕТСЯ ЛИ ПОЛЬЗОВАТЕЛЬ SUPER_ADMIN
-- =====================================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_is_super BOOLEAN;
BEGIN
    v_user_id := current_user_id();
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN roles r ON r.id = ura.role_id
        WHERE ura.user_id = v_user_id
          AND r.key = 'super_admin'
    ) INTO v_is_super;
    
    RETURN COALESCE(v_is_super, FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_super_admin() IS 'Проверяет, является ли текущий пользователь супер-админом';

-- =====================================================
-- ФУНКЦИЯ ДЛЯ ПРОВЕРКИ ЧЛЕНСТВА В ТЕНАНТЕ
-- =====================================================

CREATE OR REPLACE FUNCTION is_member_of_tenant(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_is_member BOOLEAN;
BEGIN
    v_user_id := current_user_id();
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Супер-админ имеет доступ ко всем тенантам
    IF is_super_admin() THEN
        RETURN TRUE;
    END IF;
    
    SELECT EXISTS (
        SELECT 1
        FROM user_tenants ut
        WHERE ut.user_id = v_user_id
          AND ut.tenant_id = p_tenant_id
    ) INTO v_is_member;
    
    RETURN COALESCE(v_is_member, FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_member_of_tenant(UUID) IS 'Проверяет, является ли пользователь членом указанного тенанта';

-- =====================================================
-- ПОЛИТИКИ RLS ДЛЯ SESSIONS
-- =====================================================

-- Политика SELECT: пользователь видит только свои сессии или все (если супер-админ)
CREATE POLICY sessions_select_policy ON sessions
    FOR SELECT
    USING (
        is_super_admin() OR
        user_id = current_user_id()
    );

-- Политика INSERT: пользователь может создавать только свои сессии
CREATE POLICY sessions_insert_policy ON sessions
    FOR INSERT
    WITH CHECK (
        user_id = current_user_id()
    );

-- Политика UPDATE: пользователь может обновлять только свои сессии
CREATE POLICY sessions_update_policy ON sessions
    FOR UPDATE
    USING (
        is_super_admin() OR
        user_id = current_user_id()
    );

-- Политика DELETE: пользователь может удалять только свои сессии
CREATE POLICY sessions_delete_policy ON sessions
    FOR DELETE
    USING (
        is_super_admin() OR
        user_id = current_user_id()
    );

-- =====================================================
-- ПОДГОТОВКА RLS ДЛЯ БУДУЩИХ БИЗНЕС-ТАБЛИЦ
-- =====================================================

-- Создаем шаблонную функцию для проверки доступа к данным тенанта
CREATE OR REPLACE FUNCTION can_access_tenant_data(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Супер-админ имеет доступ ко всем данным
    IF is_super_admin() THEN
        RETURN TRUE;
    END IF;
    
    -- Проверяем, что пользователь член тенанта
    -- И что текущий tenant_id сессии совпадает с tenant_id записи
    RETURN is_member_of_tenant(p_tenant_id) AND 
           (current_tenant_id() = p_tenant_id OR current_tenant_id() IS NULL);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION can_access_tenant_data(UUID) IS 'Проверяет, может ли пользователь получить доступ к данным тенанта';

-- =====================================================
-- HELPER ФУНКЦИЯ: Установка контекста сессии
-- =====================================================

CREATE OR REPLACE FUNCTION set_session_context(p_user_id UUID, p_tenant_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.user_id', p_user_id::TEXT, FALSE);
    
    IF p_tenant_id IS NOT NULL THEN
        PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, FALSE);
    ELSE
        PERFORM set_config('app.tenant_id', '', FALSE);
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_session_context(UUID, UUID) IS 'Устанавливает контекст пользователя и тенанта для текущей сессии';

-- =====================================================
-- HELPER ФУНКЦИЯ: Очистка контекста сессии
-- =====================================================

CREATE OR REPLACE FUNCTION clear_session_context()
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.user_id', '', FALSE);
    PERFORM set_config('app.tenant_id', '', FALSE);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clear_session_context() IS 'Очищает контекст сессии';

-- =====================================================
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ RLS
-- =====================================================

-- Пример 1: Установка контекста для обычного пользователя
-- SELECT set_session_context('user-uuid-here'::uuid, 'tenant-uuid-here'::uuid);

-- Пример 2: Установка контекста для супер-админа (без tenant_id)
-- SELECT set_session_context('super-admin-uuid-here'::uuid);

-- Пример 3: Проверка текущего контекста
-- SELECT current_user_id(), current_tenant_id(), is_super_admin();

-- Пример 4: Очистка контекста
-- SELECT clear_session_context();

-- =====================================================
-- СОЗДАНИЕ ПРЕДСТАВЛЕНИЙ (VIEWS) ДЛЯ УДОБСТВА
-- =====================================================

-- View: Активные пользователи с их тенантами
CREATE OR REPLACE VIEW v_active_users_with_tenants AS
SELECT 
    u.id AS user_id,
    u.email,
    u.full_name,
    u.status AS user_status,
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.status AS tenant_status,
    ut.is_default,
    ut.joined_at
FROM users u
JOIN user_tenants ut ON u.id = ut.user_id
JOIN tenants t ON t.id = ut.tenant_id
WHERE u.status = 'active'
  AND t.status = 'active';

COMMENT ON VIEW v_active_users_with_tenants IS 'Активные пользователи с их компаниями';

-- View: Пользователи с их ролями и разрешениями
CREATE OR REPLACE VIEW v_user_permissions AS
SELECT 
    u.id AS user_id,
    u.email,
    t.id AS tenant_id,
    t.name AS tenant_name,
    r.id AS role_id,
    r.key AS role_key,
    r.name AS role_name,
    p.id AS permission_id,
    p.key AS permission_key,
    p.name AS permission_name,
    p.resource,
    p.action
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN roles r ON r.id = ura.role_id
LEFT JOIN tenants t ON t.id = ura.tenant_id
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE u.status = 'active';

COMMENT ON VIEW v_user_permissions IS 'Пользователи с полным списком их разрешений';

-- =====================================================
-- СТАТИСТИКА И ЗАВЕРШЕНИЕ
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'RLS миграция успешно применена!';
    RAISE NOTICE 'Создана роль: app_super_admin (BYPASSRLS)';
    RAISE NOTICE 'Включен RLS на таблицах: sessions';
    RAISE NOTICE 'Созданы helper функции для работы с RLS';
    RAISE NOTICE 'Созданы представления: v_active_users_with_tenants, v_user_permissions';
    RAISE NOTICE '';
    RAISE NOTICE 'Использование:';
    RAISE NOTICE '1. Установка контекста: SELECT set_session_context(user_id, tenant_id);';
    RAISE NOTICE '2. Проверка контекста: SELECT current_user_id(), current_tenant_id();';
    RAISE NOTICE '3. Очистка контекста: SELECT clear_session_context();';
END $$;
