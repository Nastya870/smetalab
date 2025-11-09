import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Загружаем .env из корня проекта
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// Создаем пул соединений к БД
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Настройки для локальной разработки и production
  max: process.env.NODE_ENV === 'production' ? 1 : 10, // 10 соединений локально, 1 на serverless
  idleTimeoutMillis: 30000, // 30 секунд idle timeout
  connectionTimeoutMillis: 10000, // 10 секунд на подключение
  allowExitOnIdle: process.env.NODE_ENV === 'production' // Только для serverless
});

// Обработка ошибок пула (логируем, но не завершаем процесс в serverless)
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Не вызываем process.exit в serverless окружении
});

/**
 * Выполнить SQL запрос с повторными попытками
 */
export const query = async (text, params, retries = 3) => {
  const start = Date.now();
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (attempt > 1) {
        console.log(`Query succeeded on attempt ${attempt}`, { text: text.substring(0, 50), duration, rows: res.rowCount });
      }
      return res;
    } catch (error) {
      lastError = error;
      console.error(`Database query error (attempt ${attempt}/${retries}):`, error.message);
      
      // Если это последняя попытка или ошибка не связана с подключением
      if (attempt === retries || !isConnectionError(error)) {
        throw error;
      }
      
      // Ждем перед повторной попыткой (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Проверка, является ли ошибка проблемой подключения
 */
const isConnectionError = (error) => {
  const connectionErrors = [
    'Connection terminated',
    'Connection timeout',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND'
  ];
  return connectionErrors.some(msg => error.message?.includes(msg));
};

/**
 * Получить клиент для транзакций
 */
export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Обернем release для логирования
  client.release = () => {
    client.release = release;
    return release();
  };

  return client;
};

/**
 * Выполнить запросы в транзакции
 */
export const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Установить контекст RLS для текущего соединения
 */
export const setSessionContext = async (client, userId, tenantId = null) => {
  await client.query('SELECT set_session_context($1, $2)', [userId, tenantId]);
};

/**
 * Очистить контекст RLS
 */
export const clearSessionContext = async (client) => {
  await client.query('SELECT clear_session_context()');
};

export default {
  query,
  getClient,
  transaction,
  setSessionContext,
  clearSessionContext,
  pool
};
