import express from 'express';
import { register, login, logout, refresh, getMe, verifyEmail } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Регистрация новой компании и пользователя
 * Public endpoint
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 * Вход в систему
 * Public endpoint
 */
router.post('/login', login);

/**
 * POST /api/auth/logout
 * Выход из системы (удаление сессии)
 * Public endpoint (не требует токена, только refresh token)
 */
router.post('/logout', logout);

/**
 * POST /api/auth/refresh
 * Обновление access token
 * Public endpoint (требует refresh token в body)
 */
router.post('/refresh', refresh);

/**
 * GET /api/auth/me
 * Получение информации о текущем пользователе
 * Protected endpoint (требует access token)
 */
router.get('/me', authenticateToken, getMe);

/**
 * POST /api/auth/verify-email
 * Подтверждение email по токену
 * Public endpoint
 */
router.post('/verify-email', verifyEmail);

export default router;
