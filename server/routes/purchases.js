import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as purchasesController from '../controllers/purchasesController.js';

const router = express.Router();

// Все роуты требуют авторизации
router.use(authenticateToken);

/**
 * Сформировать закупки из сметы
 * @route POST /api/purchases/generate
 * @body { estimateId, projectId }
 */
router.post('/generate', purchasesController.generatePurchases);

/**
 * Получить закупки по ID сметы
 * @route GET /api/purchases/estimate/:estimateId
 */
router.get('/estimate/:estimateId', purchasesController.getPurchasesByEstimate);

/**
 * Удалить закупки
 * @route DELETE /api/purchases/estimate/:estimateId
 */
router.delete('/estimate/:estimateId', purchasesController.deletePurchases);

/**
 * Добавить материал О/Ч в закупки проекта
 * @route POST /api/purchases/extra-charge
 * @body { estimateId, projectId, materialId, quantity, price, isExtraCharge }
 */
router.post('/extra-charge', purchasesController.createExtraCharge);

export default router;
