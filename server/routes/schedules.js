import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as schedulesController from '../controllers/schedulesController.js';
import {
    exportToCSV,
    importFromCSV
} from '../controllers/schedulesImportExportController.js';
import { bulkImportSchedules } from '../controllers/schedulesBulkController.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


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
 * @route GET /api/schedules/estimate/:estimateId/export
 * @desc Экспорт графика в CSV
 * @access Private
 */
router.get('/estimate/:estimateId/export', exportToCSV);

router.post('/estimate/:estimateId/import', upload.single('file'), importFromCSV);

/**
 * @route POST /api/schedules/estimate/:estimateId/bulk
 * @desc Высокопроизводительный импорт графика (JSON)
 * @access Private
 */
router.post('/estimate/:estimateId/bulk', bulkImportSchedules);


/**
 * @route DELETE /api/schedules/estimate/:estimateId
 * @desc Удалить график
 * @access Private
 */
router.delete('/estimate/:estimateId', schedulesController.deleteSchedule);

export default router;
