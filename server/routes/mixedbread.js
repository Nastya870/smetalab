/**
 * Mixedbread Export Routes
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  exportMaterials,
  exportWorks,
  exportAll,
  checkDeleted
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

export default router;
