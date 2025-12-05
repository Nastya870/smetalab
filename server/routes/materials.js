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
import { checkPermission, checkAnyPermission } from '../middleware/checkPermission.js';

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
 * @access  Private (требуется авторизация + materials.create)
 * @body    { materials: Array, mode: 'add'|'replace', isGlobal: boolean }
 */
router.post('/bulk', authenticateToken, checkPermission('materials', 'create'), bulkImportMaterials);

/**
 * @route   POST /api/materials
 * @desc    Создать новый материал
 * @access  Private (требуется materials.create)
 * @body    { sku, name, image, unit, price, supplier, weight, category, productUrl, showImage }
 */
router.post('/', authenticateToken, checkPermission('materials', 'create'), createMaterial);

/**
 * @route   PUT /api/materials/:id
 * @desc    Обновить материал
 * @access  Private (требуется materials.update ИЛИ materials.manage)
 * @body    { sku?, name?, image?, unit?, price?, supplier?, weight?, category?, productUrl?, showImage? }
 */
router.put('/:id', authenticateToken, checkAnyPermission(['materials', 'update'], ['materials', 'manage']), updateMaterial);

/**
 * @route   DELETE /api/materials/:id
 * @desc    Удалить материал (КРИТИЧНО!)
 * @access  Private (требуется materials.delete ИЛИ materials.manage)
 */
router.delete('/:id', authenticateToken, checkAnyPermission(['materials', 'delete'], ['materials', 'manage']), deleteMaterial);

export default router;
