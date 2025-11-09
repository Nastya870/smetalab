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
import { authenticateToken } from '../middleware/auth.js';
import exportEstimateHandler from '../../api/export-estimate-excel.js';

const router = express.Router();

// Все routes требуют аутентификации
router.use(authenticateToken);

/**
 * @route   GET /api/projects/:projectId/estimates
 * @desc    Получить все сметы проекта
 * @access  Private
 */
router.get('/projects/:projectId/estimates', getEstimatesByProject);

/**
 * @route   POST /api/projects/:projectId/estimates
 * @desc    Создать новую смету для проекта
 * @access  Private
 */
router.post('/projects/:projectId/estimates', createEstimate);

// ============================================================================
// ESTIMATE ITEMS ROUTES (позиции смет)
// ============================================================================
// КРИТИЧНО: Все специфичные роуты ПЕРЕД общими с параметрами!
// /estimates/:estimateId/items/... должны быть ПЕРЕД /estimates/:id

/**
 * @route   POST /api/estimates/:estimateId/items/bulk-from-works
 * @desc    Массовое добавление работ из справочника
 * @access  Private
 */
router.post('/estimates/:estimateId/items/bulk-from-works', bulkAddFromWorks);

/**
 * @route   POST /api/estimates/:estimateId/items/bulk
 * @desc    Массовое создание позиций с материалами (bulk insert в транзакции)
 * @access  Private
 */
router.post('/estimates/:estimateId/items/bulk', bulkCreateItems);

/**
 * @route   DELETE /api/estimates/:estimateId/items/all
 * @desc    Удалить все позиции сметы
 * @access  Private
 */
router.delete('/estimates/:estimateId/items/all', deleteAllEstimateItems);

/**
 * @route   PUT /api/estimates/:estimateId/items/replace
 * @desc    Заменить все позиции сметы (удалить старые + создать новые в одной транзакции)
 * @access  Private
 */
router.put('/estimates/:estimateId/items/replace', (req, res, next) => {
  console.log('🎯 HIT: PUT /estimates/:estimateId/items/replace', req.params.estimateId);
  replaceAllEstimateItems(req, res, next);
});

/**
 * @route   PUT /api/estimates/:estimateId/items/reorder
 * @desc    Изменить порядок позиций
 * @access  Private
 */
router.put('/estimates/:estimateId/items/reorder', reorderEstimateItems);

/**
 * @route   GET /api/estimates/:estimateId/items
 * @desc    Получить все позиции сметы
 * @access  Private
 */
router.get('/estimates/:estimateId/items', getEstimateItems);

/**
 * @route   POST /api/estimates/:estimateId/items
 * @desc    Создать новую позицию в смете
 * @access  Private
 */
router.post('/estimates/:estimateId/items', createEstimateItem);

/**
 * @route   GET /api/estimates/items/:id
 * @desc    Получить позицию по ID
 * @access  Private
 */
router.get('/estimates/items/:id', getEstimateItemById);

/**
 * @route   PUT /api/estimates/items/:id
 * @desc    Обновить позицию
 * @access  Private
 */
router.put('/estimates/items/:id', updateEstimateItem);

/**
 * @route   DELETE /api/estimates/items/:id
 * @desc    Удалить позицию
 * @access  Private
 */
router.delete('/estimates/items/:id', deleteEstimateItem);

// ============================================================================
// ESTIMATES ROUTES (основные операции со сметами)
// ============================================================================
// ВАЖНО: Эти роуты идут ПОСЛЕ /estimates/:estimateId/items/...

/**
 * @route   GET /api/estimates/:id/statistics
 * @desc    Получить статистику по смете
 * @access  Private
 */
router.get('/estimates/:id/statistics', getEstimateStatistics);

/**
 * @route   GET /api/estimates/:id/full
 * @desc    Получить полную смету с позициями и материалами
 * @access  Private
 */
router.get('/estimates/:id/full', getEstimateFullDetails);

/**
 * @route   POST /api/estimates/full
 * @desc    Создать смету с позициями и материалами
 * @access  Private
 */
router.post('/estimates/full', createEstimateWithDetails);

/**
 * @route   GET /api/estimates/:id
 * @desc    Получить смету по ID
 * @access  Private
 */
router.get('/estimates/:id', getEstimateById);

/**
 * @route   PUT /api/estimates/:id
 * @desc    Обновить смету
 * @access  Private
 */
router.put('/estimates/:id', updateEstimate);

/**
 * @route   DELETE /api/estimates/:id
 * @desc    Удалить смету
 * @access  Private
 */
router.delete('/estimates/:id', deleteEstimate);

/**
 * @route   POST /api/export-estimate-excel
 * @desc    Экспорт сметы в Excel
 * @access  Private
 */
router.post('/export-estimate-excel', async (req, res) => {
  console.log('🔐 Export route - User:', req.user);
  console.log('📦 Export route - Has estimate:', !!req.body?.estimate);
  await exportEstimateHandler(req, res);
});

export default router;
