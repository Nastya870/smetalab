import express from 'express';
import {
  getAllWorks,
  getWorkById,
  createWork,
  updateWork,
  deleteWork,
  getWorksStats,
  getWorkCategories
} from '../controllers/worksController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

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
 * @route   POST /api/works
 * @desc    Создать новую работу
 * @access  Private (требуется авторизация)
 * @body    { code, name, category, unit, basePrice }
 */
router.post('/', authenticateToken, createWork);

/**
 * @route   PUT /api/works/:id
 * @desc    Обновить работу
 * @access  Private (требуется авторизация)
 * @body    { code?, name?, category?, unit?, basePrice? }
 */
router.put('/:id', authenticateToken, updateWork);

/**
 * @route   DELETE /api/works/:id
 * @desc    Удалить работу
 * @access  Private (требуется авторизация)
 */
router.delete('/:id', authenticateToken, deleteWork);

export default router;
