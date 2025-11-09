/**
 * Миграция: Создание таблицы для токенов подтверждения email
 * Дата: 2025-01-27
 * Описание: Добавляет таблицу email_verification_tokens для хранения токенов подтверждения email
 */

export const up = async (client) => {
  await client.query(`
    -- Создаем таблицу для токенов подтверждения email
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      token VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      -- Внешний ключ на пользователя
      CONSTRAINT fk_email_verification_tokens_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      
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
  `);

  console.log('✅ Создана таблица email_verification_tokens');
};

export const down = async (client) => {
  await client.query(`
    -- Удаляем индексы
    DROP INDEX IF EXISTS idx_email_verification_tokens_expires_at;
    DROP INDEX IF EXISTS idx_email_verification_tokens_user_id;
    DROP INDEX IF EXISTS idx_email_verification_tokens_token;
    
    -- Удаляем таблицу
    DROP TABLE IF EXISTS email_verification_tokens;
  `);

  console.log('✅ Удалена таблица email_verification_tokens');
};

export default { up, down };