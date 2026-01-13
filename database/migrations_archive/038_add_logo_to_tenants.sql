-- Migration 038: Add logo_url to tenants table
-- Добавление поля для логотипа организации

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN tenants.logo_url IS 'URL логотипа компании (base64 или внешняя ссылка)';
