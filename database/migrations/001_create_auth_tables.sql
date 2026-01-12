-- =====================================================
-- МИГРАЦИЯ: Создание базовой структуры БД
-- Версия: 001
-- Описание: Мульти-тенантная система аутентификации
-- =====================================================

-- Включаем расширения PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =====================================================
-- ТАБЛИЦА: tenants (компании/организации)
-- =====================================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'free', -- free, basic, premium, enterprise
    status TEXT DEFAULT 'active', -- active, suspended, deleted
    
    -- Реквизиты организации
    company_full_name TEXT,
    inn VARCHAR(12),
    ogrn VARCHAR(15),
    kpp VARCHAR(9),
    legal_address TEXT,
    actual_address TEXT,
    
    -- Банковские реквизиты
    bank_account VARCHAR(20),
    correspondent_account VARCHAR(20),
    bank_bik VARCHAR(9),
    bank_name TEXT,
    
    -- Должностные лица
    director_name TEXT,
    accountant_name TEXT,
    
    -- Логотип
    logo_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT tenants_name_unique UNIQUE (name),
    CONSTRAINT tenants_plan_check CHECK (plan IN ('free', 'basic', 'premium', 'enterprise')),
    CONSTRAINT tenants_status_check CHECK (status IN ('active', 'suspended', 'deleted'))
);

COMMENT ON TABLE tenants IS 'Таблица компаний (тенантов) - мульти-тенантность';
COMMENT ON COLUMN tenants.name IS 'Уникальное название компании';
COMMENT ON COLUMN tenants.plan IS 'Тарифный план компании';
COMMENT ON COLUMN tenants.status IS 'Статус компании';
COMMENT ON COLUMN tenants.company_full_name IS 'Полное наименование организации';
COMMENT ON COLUMN tenants.inn IS 'ИНН организации (10 или 12 цифр)';
COMMENT ON COLUMN tenants.ogrn IS 'ОГРН/ОГРНИП (13 или 15 цифр)';
COMMENT ON COLUMN tenants.kpp IS 'КПП организации (9 цифр)';
COMMENT ON COLUMN tenants.legal_address IS 'Юридический адрес';
COMMENT ON COLUMN tenants.actual_address IS 'Фактический адрес';
COMMENT ON COLUMN tenants.bank_account IS 'Расчетный счет (20 цифр)';
COMMENT ON COLUMN tenants.correspondent_account IS 'Корреспондентский счет';
COMMENT ON COLUMN tenants.bank_bik IS 'БИК банка (9 цифр)';
COMMENT ON COLUMN tenants.bank_name IS 'Наименование банка';
COMMENT ON COLUMN tenants.director_name IS 'ФИО генерального директора';
COMMENT ON COLUMN tenants.accountant_name IS 'ФИО главного бухгалтера';
COMMENT ON COLUMN tenants.logo_url IS 'URL логотипа компании';

-- Индексы для tenants
CREATE INDEX IF NOT EXISTS idx_tenants_inn ON tenants(inn) WHERE inn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_ogrn ON tenants(ogrn) WHERE ogrn IS NOT NULL;

-- =====================================================
-- ТАБЛИЦА: users (пользователи)
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT NOT NULL,
    phone TEXT,
    pass_hash TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'active', -- active, inactive, suspended, deleted
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_phone_unique UNIQUE (phone),
    CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive', 'suspended', 'deleted'))
);

COMMENT ON TABLE users IS 'Таблица пользователей системы';
COMMENT ON COLUMN users.email IS 'Email (основной логин, уникальный)';
COMMENT ON COLUMN users.phone IS 'Телефон (опционально, уникальный)';
COMMENT ON COLUMN users.pass_hash IS 'Хэш пароля (argon2/bcrypt)';
COMMENT ON COLUMN users.email_verified IS 'Подтвержден ли email';

-- =====================================================
-- ТАБЛИЦА: user_tenants (членство в компании)
-- =====================================================
CREATE TABLE user_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT user_tenants_unique UNIQUE (tenant_id, user_id)
);

COMMENT ON TABLE user_tenants IS 'Связь пользователей с компаниями (членство)';
COMMENT ON COLUMN user_tenants.is_default IS 'Компания по умолчанию для пользователя';

-- =====================================================
-- ТАБЛИЦА: roles (роли)
-- =====================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT roles_key_unique UNIQUE (key)
);

COMMENT ON TABLE roles IS 'Справочник ролей пользователей';
COMMENT ON COLUMN roles.key IS 'Системный ключ роли (например, admin)';
COMMENT ON COLUMN roles.name IS 'Отображаемое название роли';
COMMENT ON COLUMN roles.is_system IS 'Системная роль (нельзя удалить)';

-- =====================================================
-- ТАБЛИЦА: permissions (разрешения)
-- =====================================================
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    resource TEXT NOT NULL, -- users, estimates, projects, etc
    action TEXT NOT NULL, -- create, read, update, delete, manage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT permissions_key_unique UNIQUE (key),
    CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action)
);

COMMENT ON TABLE permissions IS 'Справочник разрешений (permissions)';
COMMENT ON COLUMN permissions.key IS 'Уникальный ключ разрешения';
COMMENT ON COLUMN permissions.resource IS 'Ресурс (сущность): users, estimates, projects';
COMMENT ON COLUMN permissions.action IS 'Действие: create, read, update, delete, manage';

-- =====================================================
-- ТАБЛИЦА: role_permissions (связь ролей и разрешений)
-- =====================================================
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

COMMENT ON TABLE role_permissions IS 'Связь ролей с разрешениями (M2M)';

-- =====================================================
-- ТАБЛИЦА: user_role_assignments (назначение ролей пользователям)
-- =====================================================
CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    CONSTRAINT user_role_assignments_unique UNIQUE (tenant_id, user_id, role_id)
);

COMMENT ON TABLE user_role_assignments IS 'Назначение ролей пользователям в рамках тенанта';
COMMENT ON COLUMN user_role_assignments.assigned_by IS 'Кто назначил роль';

-- =====================================================
-- ТАБЛИЦА: sessions (сессии и refresh-токены)
-- =====================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    device_info TEXT, -- User-Agent, IP, Device name
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT sessions_refresh_token_unique UNIQUE (refresh_token)
);

COMMENT ON TABLE sessions IS 'Таблица сессий и refresh-токенов';
COMMENT ON COLUMN sessions.tenant_id IS 'Активный тенант в этой сессии (может быть NULL для глобальных операций)';
COMMENT ON COLUMN sessions.device_info IS 'Информация об устройстве';
COMMENT ON COLUMN sessions.expires_at IS 'Время истечения токена';

-- =====================================================
-- ТАБЛИЦА: email_verifications (токены подтверждения email)
-- =====================================================
CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email CITEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT email_verifications_token_unique UNIQUE (token)
);

COMMENT ON TABLE email_verifications IS 'Токены для подтверждения email адреса';
COMMENT ON COLUMN email_verifications.verified_at IS 'Время подтверждения (NULL если не подтвержден)';

-- =====================================================
-- ТАБЛИЦА: password_resets (токены восстановления пароля)
-- =====================================================
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email CITEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT password_resets_token_unique UNIQUE (token)
);

COMMENT ON TABLE password_resets IS 'Токены для восстановления пароля';
COMMENT ON COLUMN password_resets.used_at IS 'Время использования токена (NULL если не использован)';

-- =====================================================
-- ИНДЕКСЫ для оптимизации запросов
-- =====================================================

-- Индексы для users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Индексы для user_tenants
CREATE INDEX idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant_id ON user_tenants(tenant_id);
CREATE INDEX idx_user_tenants_default ON user_tenants(user_id, is_default) WHERE is_default = TRUE;

-- Индексы для user_role_assignments
CREATE INDEX idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_tenant_user ON user_role_assignments(tenant_id, user_id);
CREATE INDEX idx_user_role_assignments_role_id ON user_role_assignments(role_id);

-- Индексы для sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_tenant_id ON sessions(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);

-- Индексы для email_verifications
CREATE INDEX idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_email ON email_verifications(email);
CREATE INDEX idx_email_verifications_token ON email_verifications(token);
CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);

-- Индексы для password_resets
CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX idx_password_resets_email ON password_resets(email);
CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_password_resets_expires_at ON password_resets(expires_at);

-- Индексы для role_permissions
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- =====================================================
-- ФУНКЦИИ для автоматического обновления updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- КОММЕНТАРИИ
-- =====================================================

COMMENT ON DATABASE neondb IS 'База данных сметного приложения с мульти-тенантностью';

-- =====================================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- =====================================================

-- Вывод информации о созданных таблицах
DO $$
BEGIN
    RAISE NOTICE 'Миграция 001 успешно применена!';
    RAISE NOTICE 'Созданы таблицы: tenants, users, user_tenants, roles, permissions, role_permissions, user_role_assignments, sessions, email_verifications, password_resets';
END $$;
