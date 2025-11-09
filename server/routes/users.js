import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import * as usersController from '../controllers/usersController.js';

const router = express.Router();

// Все маршруты требуют аутентификации + права админа
// Дополнительная защита на уровне middleware

// Получить всех пользователей компании
router.get('/', authenticateToken, requireAdmin, usersController.getAllUsers);

// Получить пользователя по ID  
router.get('/:id', authenticateToken, requireAdmin, usersController.getUserById);

// Создать нового пользователя
router.post('/', authenticateToken, requireAdmin, usersController.createUser);

// Обновить пользователя
router.put('/:id', authenticateToken, requireAdmin, usersController.updateUser);

// Удалить пользователя  
router.delete('/:id', authenticateToken, requireAdmin, usersController.deleteUser);

// Назначить роли пользователю (КРИТИЧЕСКАЯ ОПЕРАЦИЯ)
router.post('/:id/roles', authenticateToken, requireAdmin, usersController.assignRoles);

// Деактивировать пользователя
router.patch('/:id/deactivate', authenticateToken, requireAdmin, usersController.deactivateUser);

// Активировать пользователя
router.patch('/:id/activate', authenticateToken, requireAdmin, usersController.activateUser);

// Получить все доступные роли (с ограничениями по уровню доступа)
router.get('/roles', authenticateToken, requireAdmin, usersController.getAllRoles);

export default router;
