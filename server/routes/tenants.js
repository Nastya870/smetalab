import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as tenantsController from '../controllers/tenantsController.js';

const router = express.Router();

/**
 * @route GET /api/tenants/:id
 * @desc Получить информацию о тенанте
 * @access Private
 */
router.get('/:id', authenticateToken, tenantsController.getTenant);

/**
 * @route PUT /api/tenants/:id
 * @desc Обновить данные тенанта
 * @access Private
 */
router.put('/:id', authenticateToken, tenantsController.updateTenant);

/**
 * @route POST /api/tenants/:id/logo
 * @desc Загрузить логотип компании
 * @access Private
 */
router.post('/:id/logo', authenticateToken, tenantsController.uploadLogo);

export default router;
