import express from 'express';
import {
  getAllMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialsStats,
  getMaterialCategories,
  getMaterialSuppliers,
  bulkImportMaterials // ✅ Добавили
} from '../controllers/materialsController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/materials/stats
 * @desc    Получить статистику по материалам
 * @access  Public
 */
router.get('/stats', getMaterialsStats);

/**
 * @route   GET /api/materials/categories
 * @desc    Получить список категорий
 * @access  Public
 */
router.get('/categories', getMaterialCategories);

/**
 * @route   GET /api/materials/suppliers
 * @desc    Получить список поставщиков
 * @access  Public
 */
router.get('/suppliers', getMaterialSuppliers);

/**
 * @route   GET /api/materials
 * @desc    Получить все материалы (с фильтрацией и поиском)
 * @access  Public (но с optional auth для tenant isolation)
 * @query   category - фильтр по категории
 * @query   supplier - фильтр по поставщику
 * @query   search - поиск по SKU или названию
 * @query   sort - поле для сортировки (sku, name, category, unit, price, supplier, weight)
 * @query   order - порядок сортировки (ASC, DESC)
 */
router.get('/', optionalAuth, getAllMaterials);

/**
 * @route   GET /api/materials/:id
 * @desc    Получить материал по ID
 * @access  Public
 */
router.get('/:id', getMaterialById);

/**
 * @route   POST /api/materials/bulk
 * @desc    Массовый импорт материалов из CSV
 * @access  Private (требуется авторизация)
 * @body    { materials: Array, mode: 'add'|'replace', isGlobal: boolean }
 */
router.post('/bulk', authenticateToken, bulkImportMaterials);

/**
 * @route   POST /api/materials
 * @desc    Создать новый материал
 * @access  Private (требуется авторизация)
 * @body    { sku, name, image, unit, price, supplier, weight, category, productUrl, showImage }
 */
router.post('/', authenticateToken, createMaterial);

/**
 * @route   PUT /api/materials/:id
 * @desc    Обновить материал
 * @access  Private (требуется авторизация)
 * @body    { sku?, name?, image?, unit?, price?, supplier?, weight?, category?, productUrl?, showImage? }
 */
router.put('/:id', authenticateToken, updateMaterial);

/**
 * @route   DELETE /api/materials/:id
 * @desc    Удалить материал
 * @access  Private (требуется авторизация)
 */
router.delete('/:id', authenticateToken, deleteMaterial);

export default router;
