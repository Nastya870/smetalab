/**
 * Routes для работы с выполненными работами (work_completions)
 * Отслеживание процента выполнения каждой позиции сметы
 */

import express from 'express';
import {
  getWorkCompletions,
  upsertWorkCompletion,
  batchUpsertWorkCompletions,
  deleteWorkCompletion
} from '../controllers/workCompletionsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Все routes требуют аутентификации
router.use(authenticateToken);

/**
 * @route   GET /api/estimates/:estimateId/work-completions
 * @desc    Получить все выполненные работы для сметы
 * @access  Private
 */
router.get('/estimates/:estimateId/work-completions', getWorkCompletions);

/**
 * @route   POST /api/estimates/:estimateId/work-completions
 * @desc    Создать или обновить выполнение работы
 * @access  Private
 */
router.post('/estimates/:estimateId/work-completions', upsertWorkCompletion);

/**
 * @route   POST /api/estimates/:estimateId/work-completions/batch
 * @desc    Массовое создание/обновление выполненных работ
 * @access  Private
 */
router.post('/estimates/:estimateId/work-completions/batch', batchUpsertWorkCompletions);

/**
 * @route   DELETE /api/estimates/:estimateId/work-completions/:estimateItemId
 * @desc    Удалить запись о выполнении работы
 * @access  Private
 */
router.delete('/estimates/:estimateId/work-completions/:estimateItemId', deleteWorkCompletion);

export default router;
