import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import emailService from '../services/emailService.js';

/**
 * @swagger
 * /email/send-verification:
 *   post:
 *     tags: [Email Verification]
 *     summary: Отправка письма с подтверждением email
 *     description: Создает токен верификации (UUID, срок 24 часа) и отправляет письмо через Resend API на noreply@smeta-lab.ru. Требует авторизации. Удаляет старые неиспользованные токены.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Письмо успешно отправлено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Письмо с подтверждением отправлено"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Email получателя
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: Срок истечения токена (24 часа)
 *                     token:
 *                       type: string
 *                       description: Токен верификации (только в development)
 *       400:
 *         description: Email уже подтвержден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Email уже подтвержден"
 *       401:
 *         description: Не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Пользователь не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Ошибка при отправке письма (проблема с Resend API)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const sendVerificationEmail = async (req, res) => {
  try {
    const { userId } = req.user; // Из JWT токена (middleware)
    
    // Получаем данные пользователя
    const userResult = await query(
      'SELECT id, email, email_verified, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email уже подтвержден'
      });
    }

    // Удаляем старые неиспользованные токены
    await query(
      'DELETE FROM email_verifications WHERE user_id = $1 AND verified_at IS NULL',
      [userId]
    );

    // Создаем токен подтверждения
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

    await query(
      `INSERT INTO email_verifications (user_id, email, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [userId, user.email, token, expiresAt]
    );

    // Получаем имя пользователя для персонализации письма
    const userName = user.full_name || user.email.split('@')[0];

    // Отправка email через UniSender
    try {
      await emailService.sendVerificationEmail(user.email, token, userName);
      
      console.log(`✅ [EmailController] Письмо подтверждения отправлено на ${user.email}`);
      
      res.json({
        success: true,
        message: 'Письмо с подтверждением отправлено',
        data: {
          email: user.email,
          expiresAt,
          // В dev-режиме возвращаем токен для тестирования
          ...(process.env.NODE_ENV === 'development' && { token })
        }
      });
    } catch (emailError) {
      console.error('❌ [EmailController] Ошибка отправки email:', emailError.message);
      
      // Email не отправлен, но токен создан - пользователь может попробовать позже
      res.status(500).json({
        success: false,
        message: 'Ошибка при отправке письма. Попробуйте позже',
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }

  } catch (error) {
    console.error('Send verification email error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при отправке письма'
    });
  }
};

/**
 * @swagger
 * /email/verify:
 *   post:
 *     tags: [Email Verification]
 *     summary: Подтверждение email по токену
 *     description: Проверяет токен из письма, устанавливает email_verified=true в таблице users, отмечает токен как использованный. Токен действителен 24 часа. Не требует авторизации (публичный эндпоинт).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 format: uuid
 *                 description: Токен из письма (UUID)
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Email успешно подтвержден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Email успешно подтвержден"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Подтвержденный email
 *       400:
 *         description: Ошибка валидации токена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               noToken:
 *                 value:
 *                   success: false
 *                   message: "Токен не предоставлен"
 *               invalidToken:
 *                 value:
 *                   success: false
 *                   message: "Недействительный или уже использованный токен"
 *               expiredToken:
 *                 value:
 *                   success: false
 *                   message: "Токен истек. Запросите новое письмо подтверждения"
 *               alreadyVerified:
 *                 value:
 *                   success: false
 *                   message: "Email уже подтвержден"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Токен не предоставлен'
      });
    }

    // Находим токен
    const tokenResult = await query(
      `SELECT ev.*, u.email_verified
       FROM email_verifications ev
       JOIN users u ON u.id = ev.user_id
       WHERE ev.token = $1 AND ev.verified_at IS NULL`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Недействительный или уже использованный токен'
      });
    }

    const verification = tokenResult.rows[0];

    // Проверяем истечение токена
    if (new Date(verification.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Токен истек. Запросите новое письмо подтверждения'
      });
    }

    // Если email уже подтвержден
    if (verification.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email уже подтвержден'
      });
    }

    // Подтверждаем email
    await query(
      'UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1',
      [verification.user_id]
    );

    // Отмечаем токен как использованный
    await query(
      'UPDATE email_verifications SET verified_at = NOW() WHERE id = $1',
      [verification.id]
    );

    res.json({
      success: true,
      message: 'Email успешно подтвержден',
      data: {
        email: verification.email
      }
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при подтверждении email'
    });
  }
};

/**
 * @swagger
 * /email/verification-status:
 *   get:
 *     tags: [Email Verification]
 *     summary: Проверка статуса подтверждения email
 *     description: Возвращает текущий статус email (подтвержден/не подтвержден) и информацию о незавершенной верификации (если есть активный токен). Требует авторизации.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статус успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Email пользователя
 *                     emailVerified:
 *                       type: boolean
 *                       description: Email подтвержден?
 *                     hasPendingVerification:
 *                       type: boolean
 *                       description: Есть активный токен верификации?
 *                     pendingVerification:
 *                       type: object
 *                       description: Информация об активном токене (если есть)
 *                       properties:
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                           description: Когда истечет токен
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: Когда создан токен
 *             examples:
 *               verified:
 *                 value:
 *                   success: true
 *                   data:
 *                     email: "user@example.com"
 *                     emailVerified: true
 *                     hasPendingVerification: false
 *               notVerifiedWithToken:
 *                 value:
 *                   success: true
 *                   data:
 *                     email: "user@example.com"
 *                     emailVerified: false
 *                     hasPendingVerification: true
 *                     pendingVerification:
 *                       expiresAt: "2025-11-01T12:00:00.000Z"
 *                       createdAt: "2025-10-31T12:00:00.000Z"
 *       401:
 *         description: Не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Пользователь не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getVerificationStatus = async (req, res) => {
  try {
    const { userId } = req.user; // Из JWT токена

    const userResult = await query(
      'SELECT email, email_verified FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    const user = userResult.rows[0];

    // Проверяем наличие активного токена
    const tokenResult = await query(
      `SELECT token, expires_at, created_at
       FROM email_verifications
       WHERE user_id = $1 
         AND verified_at IS NULL 
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        email: user.email,
        emailVerified: user.email_verified,
        hasPendingVerification: tokenResult.rows.length > 0,
        ...(tokenResult.rows.length > 0 && {
          pendingVerification: {
            expiresAt: tokenResult.rows[0].expires_at,
            createdAt: tokenResult.rows[0].created_at
          }
        })
      }
    });

  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статуса'
    });
  }
};
