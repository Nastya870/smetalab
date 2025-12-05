import express from 'express';
import { forgotPassword, resetPassword, validateResetToken } from '../controllers/passwordResetController.js';
import { passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/password/forgot
 * Запрос на сброс пароля (отправка email)
 * Public endpoint (не требует авторизации)
 * Rate limit: 3 запроса в час
 */
router.post('/forgot', passwordResetLimiter, forgotPassword);

/**
 * POST /api/password/reset
 * Сброс пароля по токену
 * Public endpoint (не требует авторизации)
 * Rate limit: 3 запроса в час
 */
router.post('/reset', passwordResetLimiter, resetPassword);

/**
 * POST /api/password/validate-reset-token
 * Проверка валидности токена сброса
 * Public endpoint (не требует авторизации)
 */
router.post('/validate-reset-token', validateResetToken);

export default router;