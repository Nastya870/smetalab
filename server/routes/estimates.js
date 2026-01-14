/**
 * Routes для работы со сметами и их позициями
 */

import express from 'express';
import {
  getEstimatesByProject,
  getEstimateById,
  createEstimate,
  updateEstimate,
  deleteEstimate,
  getEstimateStatistics,
  getEstimateFullDetails,
  createEstimateWithDetails
} from '../controllers/estimatesController.js';
import {
  getEstimateItems,
  getEstimateItemById,
  createEstimateItem,
  updateEstimateItem,
  deleteEstimateItem,
  bulkAddFromWorks,
  reorderEstimateItems,
  bulkCreateItems,
  deleteAllEstimateItems,
  replaceAllEstimateItems
} from '../controllers/estimateItemsController.js';
import { bulkImportEstimateItems } from '../controllers/estimateItemsBulkController.js';
import { exportEstimateToExcel } from '../controllers/exportEstimateController.js';
import {
  exportToCSV,
  importFromCSV
} from '../controllers/estimatesImportExportController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkPermission, checkAnyPermission } from '../middleware/checkPermission.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


// Все routes требуют аутентификации
router.use(authenticateToken);

/**
 * @route   GET /api/projects/:projectId/estimates
 * @desc    Получить все сметы проекта
 * @access  Private (требуется estimates.read)
 */
router.get('/projects/:projectId/estimates', checkPermission('estimates', 'read'), getEstimatesByProject);

/**
 * @route   POST /api/projects/:projectId/estimates
 * @desc    Создать новую смету для проекта
 * @access  Private (требуется estimates.create)
 */
router.post('/projects/:projectId/estimates', checkPermission('estimates', 'create'), createEstimate);

// ============================================================================
// ESTIMATE ITEMS ROUTES (позиции смет)
// ============================================================================
// КРИТИЧНО: Все специфичные роуты ПЕРЕД общими с параметрами!
// /estimates/:estimateId/items/... должны быть ПЕРЕД /estimates/:id

/**
 * @route   POST /api/estimates/:estimateId/items/bulk-from-works
 * @desc    Массовое добавление работ из справочника
 * @access  Private (требуется estimates.update ИЛИ estimates.manage)
 */
router.post('/estimates/:estimateId/items/bulk-from-works', checkAnyPermission(['estimates', 'update'], ['estimates', 'manage']), bulkAddFromWorks);

/**
 * @route   POST /api/estimates/:estimateId/items/bulk
 * @desc    Массовое создание позиций с материалами (bulk insert в транзакции)
 * @access  Private (требуется estimates.update ИЛИ estimates.manage)
 */
router.post('/estimates/:estimateId/items/bulk', checkAnyPermission(['estimates', 'update'], ['estimates', 'manage']), bulkCreateItems);

/**
 * @route   DELETE /api/estimates/:estimateId/items/all
 * @desc    Удалить все позиции сметы (КРИТИЧНО!)
 * @access  Private (требуется estimates.delete ИЛИ estimates.manage)
 */
router.delete('/estimates/:estimateId/items/all', checkAnyPermission(['estimates', 'delete'], ['estimates', 'manage']), deleteAllEstimateItems);

/**
 * @route   PUT /api/estimates/:estimateId/items/replace
 * @desc    Заменить все позиции сметы (удалить старые + создать новые в одной транзакции)
 * @access  Private (требуется estimates.update ИЛИ estimates.manage)
 */
router.put('/estimates/:estimateId/items/replace', checkAnyPermission(['estimates', 'update'], ['estimates', 'manage']), (req, res, next) => {
  console.log('🎯 HIT: PUT /estimates/:estimateId/items/replace', req.params.estimateId);
  replaceAllEstimateItems(req, res, next);
});

/**
 * @route   PUT /api/estimates/:estimateId/items/reorder
 * @desc    Изменить порядок позиций
 * @access  Private (требуется estimates.update ИЛИ estimates.manage)
 */
router.put('/estimates/:estimateId/items/reorder', checkAnyPermission(['estimates', 'update'], ['estimates', 'manage']), reorderEstimateItems);

/**
 * @route   GET /api/estimates/:estimateId/items
 * @desc    Получить все позиции сметы
 * @access  Private (требуется estimates.read)
 */
router.get('/estimates/:estimateId/items', checkPermission('estimates', 'read'), getEstimateItems);

/**
 * @route   GET /api/estimates/:estimateId/export
 * @desc    Экспорт позиций сметы в CSV
 * @access  Private
 */
router.get('/estimates/:estimateId/export', checkPermission('estimates', 'read'), exportToCSV);

router.post('/estimates/:estimateId/import', checkAnyPermission(['estimates', 'update'], ['estimates', 'manage']), upload.single('file'), importFromCSV);

/**
 * @route   POST /api/estimates/:estimateId/bulk
 * @desc    Высокопроизводительный импорт позиций в смету (JSON)
 * @access  Private
 */
router.post('/estimates/:estimateId/bulk', checkAnyPermission(['estimates', 'update'], ['estimates', 'manage']), bulkImportEstimateItems);


/**
 * @route   POST /api/estimates/:estimateId/items
 * @desc    Создать новую позицию в смете
 * @access  Private (требуется estimates.update ИЛИ estimates.manage)
 */
router.post('/estimates/:estimateId/items', checkAnyPermission(['estimates', 'update'], ['estimates', 'manage']), createEstimateItem);

/**
 * @route   GET /api/estimates/items/:id
 * @desc    Получить позицию по ID
 * @access  Private (требуется estimates.read)
 */
router.get('/estimates/items/:id', checkPermission('estimates', 'read'), getEstimateItemById);

/**
 * @route   PUT /api/estimates/items/:id
 * @desc    Обновить позицию
 * @access  Private (требуется estimates.update ИЛИ estimates.manage)
 */
router.put('/estimates/items/:id', checkAnyPermission(['estimates', 'update'], ['estimates', 'manage']), updateEstimateItem);

/**
 * @route   DELETE /api/estimates/items/:id
 * @desc    Удалить позицию (КРИТИЧНО!)
 * @access  Private (требуется estimates.delete ИЛИ estimates.manage)
 */
router.delete('/estimates/items/:id', checkAnyPermission(['estimates', 'delete'], ['estimates', 'manage']), deleteEstimateItem);

// ============================================================================
// ESTIMATES ROUTES (основные операции со сметами)
// ============================================================================
// ВАЖНО: Эти роуты идут ПОСЛЕ /estimates/:estimateId/items/...

/**
 * @route   GET /api/estimates/:id/statistics
 * @desc    Получить статистику по смете
 * @access  Private (требуется estimates.read)
 */
router.get('/estimates/:id/statistics', checkPermission('estimates', 'read'), getEstimateStatistics);

/**
 * @route   GET /api/estimates/:id/full
 * @desc    Получить полную смету с позициями и материалами
 * @access  Private (требуется estimates.read)
 */
router.get('/estimates/:id/full', checkPermission('estimates', 'read'), getEstimateFullDetails);

/**
 * @route   POST /api/estimates/full
 * @desc    Создать смету с позициями и материалами
 * @access  Private (требуется estimates.create)
 */
router.post('/estimates/full', checkPermission('estimates', 'create'), createEstimateWithDetails);

/**
 * @route   GET /api/estimates/:id
 * @desc    Получить смету по ID
 * @access  Private (требуется estimates.read)
 */
router.get('/estimates/:id', checkPermission('estimates', 'read'), getEstimateById);

/**
 * @route   PUT /api/estimates/:id
 * @desc    Обновить смету
 * @access  Private (требуется estimates.update ИЛИ estimates.manage)
 */
router.put('/estimates/:id', checkAnyPermission(['estimates', 'update'], ['estimates', 'manage']), updateEstimate);

/**
 * @route   DELETE /api/estimates/:id
 * @desc    Удалить смету (КРИТИЧНО! Финансовые данные)
 * @access  Private (требуется estimates.delete ИЛИ estimates.manage)
 */
router.delete('/estimates/:id', checkAnyPermission(['estimates', 'delete'], ['estimates', 'manage']), deleteEstimate);

/**
 * @route   POST /api/export-estimate-excel
 * @desc    Экспорт сметы в Excel
 * @access  Private (требуется estimates.read)
 */
router.post('/export-estimate-excel', checkPermission('estimates', 'read'), exportEstimateToExcel);

export default router;
