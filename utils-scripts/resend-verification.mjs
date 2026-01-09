import dotenv from 'dotenv';
import db from './server/config/database.js';
import emailService from './server/services/emailService.js';

dotenv.config();

const email = process.argv[2] || 'kwazar4ik@yandex.ru';

console.log(`📧 Отправка письма верификации для: ${email}\n`);

// Получаем токен
const tokenResult = await db.query(
  'SELECT token, expires_at FROM email_verifications WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
  [email]
);

if (tokenResult.rows.length === 0) {
  console.log('❌ Токен не найден');
  process.exit(1);
}

const { token, expires_at } = tokenResult.rows[0];

// Проверяем срок действия
if (new Date(expires_at) < new Date()) {
  console.log('⚠️ Токен истёк:', expires_at);
  
  // Создаём новый токен
  const newToken = crypto.randomUUID();
  const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
  
  await db.query(
    'UPDATE email_verifications SET token = $1, expires_at = $2 WHERE email = $3',
    [newToken, newExpiresAt, email]
  );
  
  console.log('✅ Создан новый токен');
  token = newToken;
}

// Отправляем письмо
try {
  await emailService.sendVerificationEmail(email, token);
  console.log('\n✅ Письмо успешно отправлено!');
  console.log(`📬 Получатель: ${email}`);
  console.log(`🔗 Токен: ${token}`);
} catch (error) {
  console.error('\n❌ Ошибка отправки:', error.message);
  process.exit(1);
}

process.exit(0);
