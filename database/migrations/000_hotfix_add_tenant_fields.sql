-- Добавление полей tenant organization и roles.tenant_id в существующую БД
-- Запустить ТОЛЬКО ОДИН РАЗ для обновления существующей базы

-- 1. Добавление tenant_id в roles (если таблица существует)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'tenant_id') THEN
            ALTER TABLE roles ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
            COMMENT ON COLUMN roles.tenant_id IS 'ID компании (NULL = глобальная роль)';
        END IF;
    END IF;
END $$;

-- 2. Добавление полей организации в tenants (если таблица существует)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        -- Реквизиты
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'company_full_name') THEN
            ALTER TABLE tenants ADD COLUMN company_full_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'inn') THEN
            ALTER TABLE tenants ADD COLUMN inn VARCHAR(12);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'ogrn') THEN
            ALTER TABLE tenants ADD COLUMN ogrn VARCHAR(15);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'kpp') THEN
            ALTER TABLE tenants ADD COLUMN kpp VARCHAR(9);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'legal_address') THEN
            ALTER TABLE tenants ADD COLUMN legal_address TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'actual_address') THEN
            ALTER TABLE tenants ADD COLUMN actual_address TEXT;
        END IF;
        
        -- Банковские реквизиты
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'bank_account') THEN
            ALTER TABLE tenants ADD COLUMN bank_account VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'correspondent_account') THEN
            ALTER TABLE tenants ADD COLUMN correspondent_account VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'bank_bik') THEN
            ALTER TABLE tenants ADD COLUMN bank_bik VARCHAR(9);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'bank_name') THEN
            ALTER TABLE tenants ADD COLUMN bank_name TEXT;
        END IF;
        
        -- Должностные лица
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'director_name') THEN
            ALTER TABLE tenants ADD COLUMN director_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'accountant_name') THEN
            ALTER TABLE tenants ADD COLUMN accountant_name TEXT;
        END IF;
        
        -- Логотип
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'logo_url') THEN
            ALTER TABLE tenants ADD COLUMN logo_url TEXT;
        END IF;
    END IF;
END $$;

-- 3. Индексы (если таблицы существуют)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenants_inn') THEN
            CREATE INDEX idx_tenants_inn ON tenants(inn) WHERE inn IS NOT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenants_ogrn') THEN
            CREATE INDEX idx_tenants_ogrn ON tenants(ogrn) WHERE ogrn IS NOT NULL;
        END IF;
    END IF;
END $$;

-- 4. Комментарии (если таблицы существуют)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
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
    END IF;
END $$;

-- 5. Добавление полей UI видимости (is_hidden)
DO $$
BEGIN
    -- permissions.is_hidden
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'is_hidden') THEN
            ALTER TABLE permissions ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;
            COMMENT ON COLUMN permissions.is_hidden IS 'Скрыть этот элемент в UI (меню, кнопки) для роли';
        END IF;
    END IF;

    -- role_permissions.is_hidden
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_permissions' AND column_name = 'is_hidden') THEN
            ALTER TABLE role_permissions ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;
            COMMENT ON COLUMN role_permissions.is_hidden IS 'Скрыть этот элемент в UI для данной роли';
        END IF;
    END IF;
END $$;
