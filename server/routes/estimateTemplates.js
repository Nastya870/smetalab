/**
 * Routes для работы с шаблонами смет
 * Prefix: /api/estimate-templates
 */

import express from 'express';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  applyTemplate
} from '../controllers/estimateTemplatesController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(authenticateToken);

/**
 * GET /api/estimate-templates
 * Получить все шаблоны текущего пользователя
 */
router.get('/', getTemplates);

/**
 * GET /api/estimate-templates/:id
 * Получить один шаблон с полными данными
 */
router.get('/:id', getTemplateById);

/**
 * POST /api/estimate-templates
 * Создать новый шаблон из существующей сметы
 * Body: { estimateId, name, description, category }
 */
router.post('/', createTemplate);

/**
 * PUT /api/estimate-templates/:id
 * Обновить шаблон (название, описание, категорию)
 * Body: { name, description, category }
 */
router.put('/:id', updateTemplate);

/**
 * DELETE /api/estimate-templates/:id
 * Удалить шаблон
 */
router.delete('/:id', deleteTemplate);

/**
 * POST /api/estimate-templates/:id/apply
 * Применить шаблон к смете (создать работы и материалы с актуальными ценами)
 * Body: { estimateId }
 */
router.post('/:id/apply', applyTemplate);

export default router;
