/**
 * Email Service для отправки писем через Resend
 * Resend идеально работает в Vercel serverless окружении
 * Документация: https://resend.com/docs
 */

import { Resend } from 'resend';
import crypto from 'crypto';
import db from '../config/database.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://smeta-lab.ru';
// Используем верифицированный домен smeta-lab.ru
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@smeta-lab.ru';
const SENDER_NAME = 'Smeta Lab'; // Жёстко задаем правильное имя

// URL логотипа для email (используем абсолютный путь из public)
const LOGO_URL = `${FRONTEND_URL}/smeta-lab-logo.png`;

// Создаем Resend клиент
let resend = null;

function getResendClient() {
  if (!resend) {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY не настроен в переменных окружения');
    }
    
    resend = new Resend(RESEND_API_KEY);
    console.log('📧 [EmailService] Resend клиент инициализирован');
  }
  
  return resend;
}

/**
 * Отправка письма через Resend API
 * @param {Object} params - Параметры письма
 * @param {string} params.to - Email получателя
 * @param {string} params.subject - Тема письма
 * @param {string} params.html - HTML-контент письма
 * @returns {Promise<Object>} - Результат отправки
 */
export async function sendEmail({ to, subject, html }) {
  try {
    console.log(`📧 [EmailService] Отправка email на ${to}`);
    console.log(`📧 [EmailService] Тема: ${subject}`);
    console.log(`📧 [EmailService] От: ${SENDER_NAME} <${SENDER_EMAIL}>`);

    const client = getResendClient();
    
    const { data, error } = await client.emails.send({
      from: `"Smeta Lab" <${SENDER_EMAIL}>`, // Кавычки для имени с пробелом
      to: [to],
      subject: subject,
      html: html
    });

    if (error) {
      console.error('❌ [EmailService] Resend вернул ошибку:', error);
      throw new Error(`Resend error: ${JSON.stringify(error)}`);
    }

    console.log('✅ [EmailService] Email успешно отправлен:', {
      id: data.id,
      to: to
    });

    return {
      success: true,
      messageId: data.id,
      provider: 'resend'
    };

  } catch (error) {
    console.error('❌ [EmailService] Ошибка отправки email:', error.message);
    console.error('❌ [EmailService] Детали:', error);

    throw new Error(`Не удалось отправить email: ${error.message}`);
  }
}

/**
 * Отправка письма с подтверждением email
 * @param {string} email - Email получателя
 * @param {string} token - Токен верификации
 * @param {string} userName - Имя пользователя
 * @returns {Promise<Object>} - Результат отправки
 */
export async function sendVerificationEmail(email, token, userName = 'Пользователь') {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Подтверждение email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                  <img src="${LOGO_URL}" alt="Smeta Lab" style="height: 60px; width: auto; max-width: 200px; margin-bottom: 10px;" />
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                    Smeta Lab
                  </h1>
                  <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">
                    Система управления сметами
                  </p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">
                    Здравствуйте, ${userName}!
                  </h2>
                  
                  <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                    Спасибо за регистрацию в Smeta Lab. Для завершения регистрации и активации вашего аккаунта, пожалуйста, подтвердите ваш email адрес.
                  </p>

                  <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                    Нажмите на кнопку ниже, чтобы подтвердить ваш email:
                  </p>

                  <!-- Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding: 0 0 30px;">
                        <a href="${verificationUrl}" 
                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                          Подтвердить Email
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                    Или скопируйте и вставьте эту ссылку в ваш браузер:
                  </p>

                  <p style="margin: 0 0 30px; padding: 15px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all; font-size: 14px; color: #667eea;">
                    ${verificationUrl}
                  </p>

                  <div style="padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 0 0 20px;">
                    <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                      ⚠️ <strong>Важно:</strong> Эта ссылка действительна в течение 24 часов. Если вы не подтвердите email в течение этого времени, вам потребуется запросить новую ссылку для подтверждения.
                    </p>
                  </div>

                  <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.6;">
                    Если вы не регистрировались в Smeta Lab, просто проигнорируйте это письмо.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0 0 10px; color: #999999; font-size: 14px;">
                    © 2025 Smeta Lab. Все права защищены.
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    Это автоматическое письмо. Пожалуйста, не отвечайте на него.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Подтвердите ваш email - Smeta Lab',
    html
  });
}

/**
 * Отправка письма для сброса пароля
 * @param {string} email - Email получателя
 * @param {string} token - Токен сброса пароля
 * @param {string} userName - Имя пользователя
 * @returns {Promise<Object>} - Результат отправки
 */
export async function sendPasswordResetEmail(email, token, userName = 'Пользователь') {
  const resetUrl = `${FRONTEND_URL}/pages/reset-password?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Сброс пароля</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 30px; text-align: center;">
                  <img src="${LOGO_URL}" alt="Smeta Lab" style="height: 60px; width: auto; max-width: 200px; margin-bottom: 10px;" />
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                    Smeta Lab
                  </h1>
                  <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">
                    Сброс пароля
                  </p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">
                    Здравствуйте, ${userName}!
                  </h2>
                  
                  <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                    Вы запросили сброс пароля для вашего аккаунта в Smeta Lab.
                  </p>

                  <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                    Нажмите на кнопку ниже, чтобы создать новый пароль:
                  </p>

                  <!-- Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding: 0 0 30px;">
                        <a href="${resetUrl}" 
                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);">
                          Сбросить пароль
                        </a>
                      </td>
                    </tr>
                  </table>

                  <div style="padding: 20px; background-color: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px; margin: 0 0 20px;">
                    <p style="margin: 0; color: #721c24; font-size: 14px; line-height: 1.6;">
                      ⚠️ <strong>Внимание:</strong> Если вы не запрашивали сброс пароля, проигнорируйте это письмо. Ваш пароль останется без изменений.
                    </p>
                  </div>

                  <p style="margin: 0 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                    Эта ссылка действительна в течение 1 часа.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0 0 10px; color: #999999; font-size: 14px;">
                    © 2025 Smeta Lab. Все права защищены.
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    Это автоматическое письмо. Пожалуйста, не отвечайте на него.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Сброс пароля - Smeta Lab',
    html
  });
}

/**
 * Генерирует токен подтверждения email
 * @param {string} userId - ID пользователя
 * @returns {Promise<string>} Токен подтверждения
 */
export async function generateEmailVerificationToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

  console.log(`📧 [EmailService] Генерируем токен для пользователя ${userId}`);
  
  // Сохраняем токен в БД (заменяем существующий если есть)
  await db.query(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at) 
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) 
     DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()`,
    [userId, token, expiresAt]
  );

  console.log(`✅ [EmailService] Токен подтверждения сохранен в БД`);
  return token;
}

/**
 * Подтверждает email по токену
 * @param {string} token - Токен подтверждения
 * @returns {Promise<Object>} Результат подтверждения
 */
export async function verifyEmailToken(token) {
  try {
    console.log(`📧 [EmailService] Проверяем токен подтверждения: ${token.substring(0, 8)}...`);
    
    // Ищем токен в БД
    const result = await db.query(
      `SELECT evt.user_id, evt.expires_at, u.email, u.full_name
       FROM email_verification_tokens evt
       JOIN users u ON u.id = evt.user_id
       WHERE evt.token = $1 AND evt.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      console.log(`❌ [EmailService] Недействительный или просроченный токен`);
      return {
        success: false,
        message: 'Недействительный или просроченный токен'
      };
    }

    const { user_id, email, full_name } = result.rows[0];
    console.log(`✅ [EmailService] Токен действителен для пользователя: ${email}`);

    // Подтверждаем email пользователя
    await db.query(
      'UPDATE users SET email_verified = true WHERE id = $1',
      [user_id]
    );

    // Удаляем использованный токен
    await db.query(
      'DELETE FROM email_verification_tokens WHERE user_id = $1',
      [user_id]
    );

    console.log(`✅ [EmailService] Email подтвержден для пользователя: ${email}`);

    return {
      success: true,
      message: 'Email успешно подтвержден',
      user: {
        id: user_id,
        email,
        fullName: full_name
      }
    };
  } catch (error) {
    console.error('❌ [EmailService] Ошибка проверки токена:', error);
    throw error;
  }
}

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  generateEmailVerificationToken,
  verifyEmailToken
};
