import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { checkPermission } from '../middleware/checkPermission.js';
import * as rolesController from '../controllers/rolesController.js';

const router = express.Router();

// Получить все роли (требуется roles.read - критично для безопасности!)
router.get('/', authenticateToken, checkPermission('roles', 'read'), rolesController.getAllRoles);

export default router;
