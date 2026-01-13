import express from 'express';
import { register, login, logout, refresh, getMe, verifyEmail } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  loginLimiter, 
  registerLimiter, 
  emailVerificationLimiter 
} from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Регистрация новой компании и пользователя
 * Public endpoint
 * Rate limit: 3 регистрации в час
 */
router.post('/register', registerLimiter, register);

/**
 * POST /api/auth/login
 * Вход в систему
 * Public endpoint
 * Rate limit: 5 попыток за 15 минут
 */
router.post('/login', loginLimiter, login);

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
 * Rate limit: 5 запросов в час
 */
router.post('/verify-email', emailVerificationLimiter, verifyEmail);

export default router;
