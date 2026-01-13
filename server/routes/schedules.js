import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as schedulesController from '../controllers/schedulesController.js';

const router = express.Router();

// Все роуты требуют авторизации
router.use(authenticateToken);

/**
 * @route POST /api/schedules/generate
 * @desc Сформировать график на основе сметы
 * @access Private
 */
router.post('/generate', schedulesController.generateSchedule);

/**
 * @route GET /api/schedules/estimate/:estimateId
 * @desc Получить график по ID сметы
 * @access Private
 */
router.get('/estimate/:estimateId', schedulesController.getScheduleByEstimate);

/**
 * @route DELETE /api/schedules/estimate/:estimateId
 * @desc Удалить график
 * @access Private
 */
router.delete('/estimate/:estimateId', schedulesController.deleteSchedule);

export default router;
