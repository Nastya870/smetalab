import express from 'express';
import * as counterpartiesController from '../controllers/counterpartiesController.js';

const router = express.Router();

/**
 * @route GET /api/counterparties
 * @desc Получить всех контрагентов
 * @access Private
 * @query entityType?: 'individual' | 'legal'
 * @query search?: string
 */
router.get('/', counterpartiesController.getAllCounterparties);

/**
 * @route GET /api/counterparties/:id
 * @desc Получить контрагента по ID
 * @access Private
 */
router.get('/:id', counterpartiesController.getCounterpartyById);

/**
 * @route POST /api/counterparties
 * @desc Создать контрагента
 * @access Private
 */
router.post('/', counterpartiesController.createCounterparty);

/**
 * @route PUT /api/counterparties/:id
 * @desc Обновить контрагента
 * @access Private
 */
router.put('/:id', counterpartiesController.updateCounterparty);

/**
 * @route DELETE /api/counterparties/:id
 * @desc Удалить контрагента
 * @access Private
 */
router.delete('/:id', counterpartiesController.deleteCounterparty);

export default router;
