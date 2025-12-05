import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { checkPermission } from '../middleware/checkPermission.js';
import * as usersController from '../controllers/usersController.js';

const router = express.Router();

// Получить все роли (требуется roles.read - критично для безопасности!)
router.get('/', authenticateToken, checkPermission('roles', 'read'), usersController.getAllRoles);

export default router;
