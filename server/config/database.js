import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Загружаем .env из корня проекта
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const connectionString = process.env.DATABASE_URL;
const isLocalhost = connectionString && (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'));

// Создаем пул соединений к БД
const pool = new Pool({
  connectionString,
  ssl: isLocalhost ? false : {
    rejectUnauthorized: false
  },
  // Настройки для локальной разработки и production
  max: process.env.NODE_ENV === 'production' ? 3 : 10, // 3 соединения в production, 10 локально
  idleTimeoutMillis: 60000, // 60 секунд idle timeout (Render может быть медленным)
  connectionTimeoutMillis: 15000, // 15 секунд на подключение
  allowExitOnIdle: false, // Не закрывать соединения
  keepAlive: true, // Поддерживать соединение активным
  keepAliveInitialDelayMillis: 10000 // Проверка keepalive каждые 10 секунд
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
    // Удаляем слушатель ошибок при возврате в пул, чтобы не дублировать их
    client.removeAllListeners('error');
    return release();
  };

  // Добавляем слушатель ошибок для предотвращения падения процесса при разрыве соединения
  client.on('error', (err) => {
    console.error('❌ Database client connection error:', err.message);
    // Не выбрасываем ошибку здесь, так как она будет выброшена в активном запросе
  });

  return client;
};

/**
 * Выполнить запросы в транзакции с retry-логикой
 */
export const transaction = async (callback, retries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      if (attempt > 1) {
        console.log(`Transaction succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Игнорируем ошибки при роллбеке, если соединение уже потеряно
        console.error('⚠️ Rollback failed (likely due to connection loss):', rollbackError.message);
      }

      console.error(`Transaction error (attempt ${attempt}/${retries}):`, error.message);

      // Если это последняя попытка или ошибка не связана с подключением
      if (attempt === retries || !isConnectionError(error)) {
        throw error;
      }

      // Ждем перед повторной попыткой (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`Retrying transaction in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    } finally {
      client.release();
    }
  }

  throw lastError;
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
