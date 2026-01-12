import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { checkPermission, checkAnyPermission } from '../middleware/checkPermission.js';
import * as usersController from '../controllers/usersController.js';
import * as rolesController from '../controllers/rolesController.js';

const router = express.Router();

// Все маршруты требуют аутентификации + права админа
// Дополнительная защита на уровне middleware + проверка разрешений

// ВАЖНО: /roles должен быть ВЫШЕ /:id чтобы не перехватывался как id='roles'
// Получить все доступные роли (требует roles.read)
router.get('/roles', authenticateToken, requireAdmin, checkPermission('roles', 'read'), rolesController.getAllRoles);

// Получить всех пользователей компании (требует users.read)
router.get('/', authenticateToken, requireAdmin, checkPermission('users', 'read'), usersController.getAllUsers);

// Получить пользователя по ID (требует users.read)
router.get('/:id', authenticateToken, requireAdmin, checkPermission('users', 'read'), usersController.getUserById);

// Создать нового пользователя (требует users.create)
router.post('/', authenticateToken, requireAdmin, checkPermission('users', 'create'), usersController.createUser);

// Обновить пользователя (требует users.update ИЛИ users.manage)
router.put('/:id', authenticateToken, requireAdmin, checkAnyPermission(['users', 'update'], ['users', 'manage']), usersController.updateUser);

// Удалить пользователя (КРИТИЧНО! Требует users.delete ИЛИ users.manage)
router.delete('/:id', authenticateToken, requireAdmin, checkAnyPermission(['users', 'delete'], ['users', 'manage']), usersController.deleteUser);

// Назначить роли пользователю (КРИТИЧЕСКАЯ ОПЕРАЦИЯ - требует roles.assign)
router.post('/:id/roles', authenticateToken, requireAdmin, checkPermission('roles', 'assign'), usersController.assignRoles);

// Деактивировать пользователя (требует users.update ИЛИ users.manage)
router.patch('/:id/deactivate', authenticateToken, requireAdmin, checkAnyPermission(['users', 'update'], ['users', 'manage']), usersController.deactivateUser);

// Активировать пользователя (требует users.update ИЛИ users.manage)
router.patch('/:id/activate', authenticateToken, requireAdmin, checkAnyPermission(['users', 'update'], ['users', 'manage']), usersController.activateUser);

export default router;
