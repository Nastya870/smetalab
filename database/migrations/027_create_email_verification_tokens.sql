-- Migration: 027_create_email_verification_tokens.sql
-- Description: Создание таблицы для токенов подтверждения email

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Один активный токен на пользователя
  CONSTRAINT unique_user_email_verification 
    UNIQUE (user_id)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token 
  ON email_verification_tokens(token);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id 
  ON email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at 
  ON email_verification_tokens(expires_at);

-- Комментарии
COMMENT ON TABLE email_verification_tokens IS 'Токены для подтверждения email адресов';
COMMENT ON COLUMN email_verification_tokens.user_id IS 'ID пользователя';
COMMENT ON COLUMN email_verification_tokens.token IS 'Токен подтверждения (хэш)';
COMMENT ON COLUMN email_verification_tokens.expires_at IS 'Время истечения токена';
COMMENT ON COLUMN email_verification_tokens.created_at IS 'Время создания токена';
