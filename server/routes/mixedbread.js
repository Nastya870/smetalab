/**
 * Mixedbread Export Routes
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  exportMaterials,
  exportWorks,
  exportAll,
  checkDeleted,
  syncToStore
} from '../controllers/mixedbreadController.js';

const router = express.Router();

// Все эндпоинты требуют аутентификации
router.use(authenticateToken);

/**
 * GET /api/mixedbread/export/materials - Экспорт материалов
 * Query: limit, offset
 */
router.get('/export/materials', exportMaterials);

/**
 * GET /api/mixedbread/export/works - Экспорт работ
 * Query: limit, offset
 */
router.get('/export/works', exportWorks);

/**
 * GET /api/mixedbread/export/all - Полный экспорт
 * Query: batchSize
 */
router.get('/export/all', exportAll);

/**
 * POST /api/mixedbread/export/deleted - Проверка удалённых документов
 * Body: { documentIds: [...] }
 */
router.post('/export/deleted', checkDeleted);

/**
 * POST /api/mixedbread/sync - Синхронизация с Mixedbread Store
 * Body: { storeId: "...", batchSize: 100 }
 */
router.post('/sync', syncToStore);

export default router;
