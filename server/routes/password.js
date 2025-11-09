import express from 'express';
import { forgotPassword, resetPassword, validateResetToken } from '../controllers/passwordResetController.js';

const router = express.Router();

/**
 * POST /api/password/forgot
 * Запрос на сброс пароля (отправка email)
 * Public endpoint (не требует авторизации)
 */
router.post('/forgot', forgotPassword);

/**
 * POST /api/password/reset
 * Сброс пароля по токену
 * Public endpoint (не требует авторизации)
 */
router.post('/reset', resetPassword);

/**
 * POST /api/password/validate-reset-token
 * Проверка валидности токена сброса
 * Public endpoint (не требует авторизации)
 */
router.post('/validate-reset-token', validateResetToken);

export default router;