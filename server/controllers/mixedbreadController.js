/**
 * Mixedbread Export Controller
 * 
 * API endpoints для выгрузки данных в формате Mixedbread documents
 */

import { catchAsync } from '../utils/errors.js';
import {
  exportMaterialsForTenant,
  exportWorksForTenant,
  exportAllForTenant,
  getDeletedDocumentIds
} from '../services/mixedbreadExportService.js';
import {
  syncDocumentsToStore,
  deleteDocumentsFromStore
} from '../services/mixedbreadStoreService.js';

/**
 * @swagger
 * /mixedbread/export/materials:
 *   get:
 *     tags: [Mixedbread]
 *     summary: Экспорт материалов для Mixedbread
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 500
 *         description: Количество документов за запрос
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Смещение для пагинации
 *     responses:
 *       200:
 *         description: Массив документов в формате Mixedbread
 */
export const exportMaterials = catchAsync(async (req, res) => {
  const { tenantId } = req.user;
  const limit = parseInt(req.query.limit) || 500;
  const offset = parseInt(req.query.offset) || 0;
  
  const documents = await exportMaterialsForTenant(tenantId, limit, offset);
  
  res.status(200).json({
    success: true,
    count: documents.length,
    limit,
    offset,
    documents
  });
});

/**
 * @swagger
 * /mixedbread/export/works:
 *   get:
 *     tags: [Mixedbread]
 *     summary: Экспорт работ для Mixedbread
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 500
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Массив документов в формате Mixedbread
 */
export const exportWorks = catchAsync(async (req, res) => {
  const { tenantId } = req.user;
  const limit = parseInt(req.query.limit) || 500;
  const offset = parseInt(req.query.offset) || 0;
  
  const documents = await exportWorksForTenant(tenantId, limit, offset);
  
  res.status(200).json({
    success: true,
    count: documents.length,
    limit,
    offset,
    documents
  });
});

/**
 * @swagger
 * /mixedbread/export/all:
 *   get:
 *     tags: [Mixedbread]
 *     summary: Полный экспорт материалов и работ
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: batchSize
 *         schema:
 *           type: integer
 *           default: 500
 *     responses:
 *       200:
 *         description: Все документы (материалы + работы)
 */
export const exportAll = catchAsync(async (req, res) => {
  const { tenantId } = req.user;
  const batchSize = parseInt(req.query.batchSize) || 500;
  
  const result = await exportAllForTenant(tenantId, batchSize);
  
  res.status(200).json({
    success: true,
    total: result.total,
    materialsCount: result.materials.length,
    worksCount: result.works.length,
    documents: [...result.materials, ...result.works]
  });
});

/**
 * @swagger
 * /mixedbread/export/deleted:
 *   post:
 *     tags: [Mixedbread]
 *     summary: Проверка удалённых документов
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["material-123", "work-456"]
 *     responses:
 *       200:
 *         description: Список ID удалённых документов
 */
export const checkDeleted = catchAsync(async (req, res) => {
  const { tenantId } = req.user;
  const { documentIds } = req.body;
  
  if (!Array.isArray(documentIds)) {
    return res.status(400).json({
      success: false,
      message: 'documentIds должен быть массивом'
    });
  }
  
  const deletedIds = await getDeletedDocumentIds(tenantId, documentIds);
  
  res.status(200).json({
    success: true,
    checked: documentIds.length,
    deleted: deletedIds.length,
    deletedIds
  });
});

/**
 * @swagger
 * /mixedbread/sync:
 *   post:
 *     tags: [Mixedbread]
 *     summary: Синхронизация данных в Mixedbread Store
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeId:
 *                 type: string
 *                 description: ID хранилища в Mixedbread
 *                 example: "my-store-id"
 *               batchSize:
 *                 type: integer
 *                 default: 100
 *                 description: Размер батча для отправки
 *     responses:
 *       200:
 *         description: Результат синхронизации
 */
export const syncToStore = catchAsync(async (req, res) => {
  const { tenantId } = req.user;
  const { storeId, batchSize = 100 } = req.body;
  
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Требуется параметр storeId'
    });
  }
  
  console.log(`🔄 [Mixedbread Sync] Начало синхронизации для tenant: ${tenantId}, store: ${storeId}`);
  
  // Экспортируем все документы
  const { materials, works, total } = await exportAllForTenant(tenantId, 500);
  const allDocuments = [...materials, ...works];
  
  console.log(`📦 [Mixedbread Sync] Подготовлено документов: ${total} (${materials.length} материалов, ${works.length} работ)`);
  
  // Отправляем в Mixedbread Store
  const result = await syncDocumentsToStore(storeId, allDocuments, batchSize);
  
  res.status(200).json({
    success: result.success,
    storeId,
    total: result.total,
    uploaded: result.uploaded,
    failed: result.failed,
    materialsCount: materials.length,
    worksCount: works.length,
    errors: result.errors
  });
});

export default {
  exportMaterials,
  exportWorks,
  exportAll,
  checkDeleted,
  syncToStore
};
