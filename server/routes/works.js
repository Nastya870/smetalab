import express from 'express';
import {
  getAllWorks,
  getWorkById,
  createWork,
  updateWork,
  updateWorkPrice,
  deleteWork,
  getWorksStats,
  getWorkCategories
} from '../controllers/worksController.js';
import { bulkCreateWorks } from '../controllers/worksBulkController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { checkPermission, checkAnyPermission } from '../middleware/checkPermission.js';

const router = express.Router();

/**
 * @route   GET /api/works/stats
 * @desc    Получить статистику по работам
 * @access  Public
 */
router.get('/stats', getWorksStats);

/**
 * @route   GET /api/works/categories
 * @desc    Получить список категорий
 * @access  Public
 */
router.get('/categories', getWorkCategories);

/**
 * @route   GET /api/works
 * @desc    Получить все работы (с фильтрацией и поиском)
 * @access  Public (но с optional auth для tenant isolation)
 * @query   category - фильтр по категории
 * @query   search - поиск по коду или названию
 * @query   sort - поле для сортировки (code, name, category, unit, base_price)
 * @query   order - порядок сортировки (ASC, DESC)
 */
router.get('/', optionalAuth, getAllWorks);

/**
 * @route   GET /api/works/:id
 * @desc    Получить работу по ID
 * @access  Public
 */
router.get('/:id', getWorkById);

/**
 * @route   POST /api/works/bulk
 * @desc    Массовое создание работ (импорт)
 * @access  Private (требуется works.create)
 * @body    { works: Array, mode: 'add' | 'replace', isGlobal: boolean }
 */
router.post('/bulk', authenticateToken, checkPermission('works', 'create'), bulkCreateWorks);

/**
 * @route   POST /api/works
 * @desc    Создать новую работу
 * @access  Private (требуется works.create)
 * @body    { code, name, category, unit, basePrice }
 */
router.post('/', authenticateToken, checkPermission('works', 'create'), createWork);

/**
 * @route   PUT /api/works/:id
 * @desc    Обновить работу
 * @access  Private (требуется works.update ИЛИ works.manage)
 * @body    { code?, name?, category?, unit?, basePrice? }
 */
router.put('/:id', authenticateToken, checkAnyPermission(['works', 'update'], ['works', 'manage']), updateWork);

/**
 * @route   PATCH /api/works/:id/price
 * @desc    Обновить только базовую цену работы
 * @access  Private (требуется works.update ИЛИ works.manage)
 * @body    { basePrice: number }
 */
router.patch('/:id/price', authenticateToken, checkAnyPermission(['works', 'update'], ['works', 'manage']), updateWorkPrice);

/**
 * @route   DELETE /api/works/:id
 * @desc    Удалить работу (КРИТИЧНО!)
 * @access  Private (требуется works.delete ИЛИ works.manage)
 */
router.delete('/:id', authenticateToken, checkAnyPermission(['works', 'delete'], ['works', 'manage']), deleteWork);

export default router;
