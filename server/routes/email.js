import express from 'express';
import { sendVerificationEmail, verifyEmail, getVerificationStatus } from '../controllers/emailController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/email/send-verification - Отправить письмо подтверждения (требует авторизации)
router.post('/send-verification', authenticateToken, sendVerificationEmail);

// POST /api/email/verify - Подтвердить email по токену (не требует авторизации)
router.post('/verify', verifyEmail);

// GET /api/email/verification-status - Получить статус подтверждения (требует авторизации)
router.get('/verification-status', authenticateToken, getVerificationStatus);

export default router;
