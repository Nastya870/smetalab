import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as globalPurchasesController from '../controllers/globalPurchasesController.js';
import {
    exportToCSV,
    importFromCSV
} from '../controllers/globalPurchasesImportExportController.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


// Все роуты требуют авторизации
router.use(authenticateToken);

/**
 * Создать фактическую закупку
 * @route POST /api/global-purchases
 * @body { projectId, estimateId, materialId, quantity, purchasePrice, purchaseDate?, sourcePurchaseId? }
 */
router.post('/', globalPurchasesController.createGlobalPurchase);

/**
 * Получить все фактические закупки с фильтрацией
 * @route GET /api/global-purchases
 * @query { projectId?, estimateId?, materialId?, dateFrom?, dateTo? }
 */
router.get('/', globalPurchasesController.getAllGlobalPurchases);

/**
 * @route GET /api/global-purchases/export
 * @desc Экспорт всех закупок в CSV
 * @access Private
 */
router.get('/export', exportToCSV);

/**
 * @route POST /api/global-purchases/import
 * @desc Импорт закупок из CSV
 * @access Private
 */
router.post('/import', upload.single('file'), importFromCSV);


/**
 * Получить даты с закупками для календаря
 * @route GET /api/global-purchases/calendar
 * @query { year, month }
 */
router.get('/calendar', globalPurchasesController.getCalendarDates);

/**
 * Получить статистику по закупкам
 * @route GET /api/global-purchases/statistics
 * @query { projectId?, dateFrom?, dateTo? }
 */
router.get('/statistics', globalPurchasesController.getStatistics);

/**
 * Получить закупку по ID
 * @route GET /api/global-purchases/:id
 */
router.get('/:id', globalPurchasesController.getGlobalPurchaseById);

/**
 * Обновить фактическую закупку
 * @route PUT /api/global-purchases/:id
 * @body { quantity?, purchasePrice?, purchaseDate? }
 */
router.put('/:id', globalPurchasesController.updateGlobalPurchase);

/**
 * Удалить фактическую закупку
 * @route DELETE /api/global-purchases/:id
 */
router.delete('/:id', globalPurchasesController.deleteGlobalPurchase);

export default router;
