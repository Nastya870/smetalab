import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as usersController from '../controllers/usersController.js';

const router = express.Router();

// Получить все роли (требуется аутентификация)
router.get('/', authenticateToken, usersController.getAllRoles);

export default router;
