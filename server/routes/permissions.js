import express from 'express';
import {
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions,
  checkUIVisibility
} from '../controllers/permissionsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin, requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

/**
 * @route   GET /api/permissions
 * @desc    Получить все разрешения (группированные по ресурсам)
 * @access  Требуется: admin или super_admin
 */
router.get('/', authenticateToken, requireAdmin, getAllPermissions);

/**
 * @route   GET /api/permissions/roles/:roleId
 * @desc    Получить разрешения конкретной роли с флагами is_hidden
 * @access  Требуется: admin или super_admin
 */
router.get('/roles/:roleId', authenticateToken, requireAdmin, getRolePermissions);

/**
 * @route   PUT /api/permissions/roles/:roleId
 * @desc    Обновить разрешения роли (включая is_hidden флаги)
 * @access  Требуется: admin (для подчинённых ролей) или super_admin (для всех ролей)
 * @body    { permissions: [{permissionId: 'uuid', isHidden: boolean}, ...] }
 */
router.put('/roles/:roleId', authenticateToken, requireAdmin, updateRolePermissions);

/**
 * @route   GET /api/permissions/users/:userId
 * @desc    Получить все разрешения пользователя (через его роли)
 * @access  Требуется: авторизация (свои разрешения) или super_admin (любые)
 */
router.get('/users/:userId', authenticateToken, getUserPermissions);

/**
 * @route   GET /api/permissions/check-visibility
 * @desc    Проверить видимость UI элемента для текущего пользователя
 * @access  Требуется: авторизация
 * @query   { resource: string, action?: string }
 */
router.get('/check-visibility', authenticateToken, checkUIVisibility);

export default router;
