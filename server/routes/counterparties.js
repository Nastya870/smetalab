import express from 'express';
import * as counterpartiesController from '../controllers/counterpartiesController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkPermission, checkAnyPermission } from '../middleware/checkPermission.js';

const router = express.Router();

/**
 * @route GET /api/counterparties
 * @desc Получить всех контрагентов
 * @access Private (требуется counterparties.read)
 * @query entityType?: 'individual' | 'legal'
 * @query search?: string
 */
router.get('/', authenticateToken, checkPermission('counterparties', 'read'), counterpartiesController.getAllCounterparties);

/**
 * @route GET /api/counterparties/:id
 * @desc Получить контрагента по ID
 * @access Private (требуется counterparties.read)
 */
router.get('/:id', authenticateToken, checkPermission('counterparties', 'read'), counterpartiesController.getCounterpartyById);

/**
 * @route POST /api/counterparties
 * @desc Создать контрагента
 * @access Private (требуется counterparties.create)
 */
router.post('/', authenticateToken, checkPermission('counterparties', 'create'), counterpartiesController.createCounterparty);

/**
 * @route PUT /api/counterparties/:id
 * @desc Обновить контрагента
 * @access Private (требуется counterparties.update ИЛИ counterparties.manage)
 */
router.put('/:id', authenticateToken, checkAnyPermission(['counterparties', 'update'], ['counterparties', 'manage']), counterpartiesController.updateCounterparty);

/**
 * @route DELETE /api/counterparties/:id
 * @desc Удалить контрагента (КРИТИЧНО!)
 * @access Private (требуется counterparties.delete ИЛИ counterparties.manage)
 */
router.delete('/:id', authenticateToken, checkAnyPermission(['counterparties', 'delete'], ['counterparties', 'manage']), counterpartiesController.deleteCounterparty);

export default router;
