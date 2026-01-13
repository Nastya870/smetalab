import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, validatePassword } from '../utils/password.js';
import emailService from '../services/emailService.js';
import { catchAsync, BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors.js';

/**
 * @swagger
 * /password/forgot:
 *   post:
 *     tags: [Password Reset]
 *     summary: Запрос на сброс пароля
 *     description: Отправляет письмо со ссылкой для сброса пароля. Создает токен сброса (UUID, срок 1 час) и отправляет письмо через Resend API. Не требует авторизации.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email пользователя для сброса пароля
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Письмо отправлено (всегда возвращается, даже если email не найден)
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
 *                   example: "Если указанный email существует, на него отправлена ссылка для сброса пароля"
 *       400:
 *         description: Неверный формат email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Укажите корректный email адрес"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  // Валидация email
  if (!email) {
    throw new BadRequestError('Email обязателен');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new BadRequestError('Укажите корректный email адрес');
  }

    console.log(`🔐 [PasswordReset] Запрос сброса пароля для ${email}`);

    // Ищем пользователя (не сообщаем клиенту, найден ли он - защита от enumeration attacks)
    const userResult = await query(
      'SELECT id, email, full_name, status FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      // Проверяем статус пользователя
      if (user.status === 'active') {
        // Удаляем старые неиспользованные токены
        await query(
          'DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL',
          [user.id]
        );

        // Создаем новый токен
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

        await query(
          `INSERT INTO password_resets (user_id, email, token, expires_at)
           VALUES ($1, $2, $3, $4)`,
          [user.id, user.email, token, expiresAt]
        );

        console.log(`📧 [PasswordReset] Создан токен сброса для ${email}: ${token.substring(0, 8)}...`);

        // Отправляем email
        try {
          await emailService.sendPasswordResetEmail(
            user.email,
            token,
            user.full_name || 'Пользователь'
          );
          
          console.log(`✅ [PasswordReset] Письмо отправлено на ${email}`);
        } catch (emailError) {
          console.error('❌ [PasswordReset] Ошибка отправки email:', emailError.message);
          
          // Удаляем созданный токен, если письмо не отправилось
          await query(
            'DELETE FROM password_resets WHERE token = $1',
            [token]
          );
          
          return res.status(500).json({
            success: false,
            message: 'Ошибка при отправке письма. Попробуйте позже'
          });
        }
      } else {
        console.log(`⚠️ [PasswordReset] Пользователь ${email} неактивен, письмо не отправлено`);
      }
    } else {
      console.log(`⚠️ [PasswordReset] Пользователь ${email} не найден`);
    }

    // Всегда возвращаем успех (не раскрываем существование пользователя)
    res.json({
      success: true,
      message: 'Если указанный email существует, на него отправлена ссылка для сброса пароля'
    });
});

/**
 * @swagger
 * /password/reset:
 *   post:
 *     tags: [Password Reset]
 *     summary: Сброс пароля по токену
 *     description: Устанавливает новый пароль по токену из письма. Проверяет валидность токена, хэширует пароль и сохраняет его. Отмечает токен как использованный. Не требует авторизации.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 format: uuid
 *                 description: Токен из письма (UUID)
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: Новый пароль (мин. 8 символов, должен содержать буквы и цифры)
 *                 example: "NewSecurePass123"
 *     responses:
 *       200:
 *         description: Пароль успешно изменен
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
 *                   example: "Пароль успешно изменен"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Email пользователя
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               noToken:
 *                 value:
 *                   success: false
 *                   message: "Токен и пароль обязательны"
 *               invalidToken:
 *                 value:
 *                   success: false
 *                   message: "Недействительный или просроченный токен"
 *               weakPassword:
 *                 value:
 *                   success: false
 *                   message: "Пароль должен содержать минимум 8 символов"
 *               usedToken:
 *                 value:
 *                   success: false
 *                   message: "Токен уже был использован"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw new BadRequestError('Токен и пароль обязательны');
  }

  // Валидация пароля
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new BadRequestError(passwordValidation.message);
  }

    console.log(`🔐 [PasswordReset] Сброс пароля по токену: ${token.substring(0, 8)}...`);

    // Находим токен
    const tokenResult = await query(
      `SELECT pr.*, u.status 
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.token = $1 AND pr.used_at IS NULL`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      console.log(`❌ [PasswordReset] Токен не найден или уже использован`);
      throw new BadRequestError('Недействительный или уже использованный токен');
    }

    const resetData = tokenResult.rows[0];

    // Проверяем срок действия
    if (new Date(resetData.expires_at) < new Date()) {
      console.log(`❌ [PasswordReset] Токен просрочен`);
      
      // Удаляем просроченный токен
      await query(
        'DELETE FROM password_resets WHERE id = $1',
        [resetData.id]
      );

      throw new BadRequestError('Токен просрочен. Запросите новую ссылку для сброса пароля');
    }

    // Проверяем статус пользователя
    if (resetData.status !== 'active') {
      console.log(`❌ [PasswordReset] Пользователь неактивен`);
      throw new BadRequestError('Пользователь деактивирован');
    }

    console.log(`✅ [PasswordReset] Токен валиден, обновляем пароль для ${resetData.email}`);

    // Хэшируем новый пароль
    const passHash = await hashPassword(password);

    // Обновляем пароль пользователя
    await query(
      'UPDATE users SET pass_hash = $1, updated_at = NOW() WHERE id = $2',
      [passHash, resetData.user_id]
    );

    // Отмечаем токен как использованный
    await query(
      'UPDATE password_resets SET used_at = NOW() WHERE id = $1',
      [resetData.id]
    );

    // Удаляем все сессии пользователя (принудительный logout)
    await query(
      'DELETE FROM sessions WHERE user_id = $1',
      [resetData.user_id]
    );

    console.log(`✅ [PasswordReset] Пароль обновлен для ${resetData.email}, все сессии удалены`);

    res.json({
      success: true,
      message: 'Пароль успешно изменен',
      data: {
        email: resetData.email
      }
    });
});

/**
 * @swagger
 * /password/validate-reset-token:
 *   post:
 *     tags: [Password Reset]
 *     summary: Проверка токена сброса пароля
 *     description: Проверяет валидность токена сброса пароля без его использования. Используется на frontend для показа формы смены пароля. Не требует авторизации.
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
 *         description: Токен валиден
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
 *                   example: "Токен действителен"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: Email пользователя (замаскированный)
 *                       example: "u***@example.com"
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: Время истечения токена
 *       400:
 *         description: Токен недействителен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               noToken:
 *                 value:
 *                   success: false
 *                   message: "Токен обязателен"
 *               invalidToken:
 *                 value:
 *                   success: false
 *                   message: "Недействительный или просроченный токен"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const validateResetToken = catchAsync(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new BadRequestError('Токен обязателен');
  }

    console.log(`🔍 [PasswordReset] Проверка токена: ${token.substring(0, 8)}...`);

    // Находим токен
    const tokenResult = await query(
      `SELECT pr.email, pr.expires_at, u.status
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.token = $1 AND pr.used_at IS NULL`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      console.log(`❌ [PasswordReset] Токен не найден или уже использован`);
      throw new BadRequestError('Недействительный или уже использованный токен');
    }

    const resetData = tokenResult.rows[0];

    // Проверяем срок действия
    if (new Date(resetData.expires_at) < new Date()) {
      console.log(`❌ [PasswordReset] Токен просрочен`);
      throw new BadRequestError('Токен просрочен. Запросите новую ссылку для сброса пароля');
    }

    // Проверяем статус пользователя
    if (resetData.status !== 'active') {
      console.log(`❌ [PasswordReset] Пользователь неактивен`);
      throw new BadRequestError('Пользователь деактивирован');
    }

    // Маскируем email для безопасности
    const email = resetData.email;
    const [localPart, domain] = email.split('@');
    const maskedEmail = localPart.length > 3 
      ? localPart.substring(0, 1) + '***' + localPart.substring(localPart.length - 1) + '@' + domain
      : '***@' + domain;

    console.log(`✅ [PasswordReset] Токен валиден для ${maskedEmail}`);

    res.json({
      success: true,
      message: 'Токен действителен',
      data: {
        email: maskedEmail,
        expiresAt: resetData.expires_at
      }
    });
});

export default {
  forgotPassword,
  resetPassword,
  validateResetToken
};