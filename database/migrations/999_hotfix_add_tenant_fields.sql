-- Добавление полей tenant organization в существующую БД
-- Запустить ТОЛЬКО ОДИН РАЗ для обновления существующей базы

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_full_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS inn VARCHAR(12);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ogrn VARCHAR(15);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kpp VARCHAR(9);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS legal_address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS actual_address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_account VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS correspondent_account VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_bik VARCHAR(9);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS director_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS accountant_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_tenants_inn ON tenants(inn) WHERE inn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_ogrn ON tenants(ogrn) WHERE ogrn IS NOT NULL;

-- Комментарии
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
