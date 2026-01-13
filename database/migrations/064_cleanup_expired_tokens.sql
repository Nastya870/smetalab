-- =====================================
-- МИГРАЦИЯ 064: Очистка истекших токенов
-- Дата: 2026-01-12
-- 
-- ВАЖНО: sessions имеет RLS!
-- Этот скрипт нужно запускать от роли с BYPASSRLS
-- или временно отключать RLS
-- =====================================

-- 1. Временно отключаем RLS для очистки (требует прав владельца)
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;

-- 2. Очищаем истекшие сессии
DELETE FROM sessions WHERE expires_at < NOW();

-- 3. Включаем RLS обратно
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 4. Очищаем email токены (RLS отключен)
DELETE FROM email_verification_tokens WHERE expires_at < NOW();

-- 5. Очищаем password reset токены
DELETE FROM password_resets WHERE expires_at < NOW();

-- 6. Регистрируем
INSERT INTO schema_version (id, description)
VALUES (64, 'Очистка истекших токенов и сессий')
ON CONFLICT (id) DO NOTHING;

-- Статистика
SELECT 
  (SELECT COUNT(*) FROM sessions) as sessions_remaining,
  (SELECT COUNT(*) FROM email_verification_tokens) as email_tokens_remaining,
  (SELECT COUNT(*) FROM password_resets) as password_resets_remaining;
