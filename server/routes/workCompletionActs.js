import express from 'express';
import * as workCompletionActsController from '../controllers/workCompletionActsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Тестовый endpoint БЕЗ аутентификации для диагностики
router.get('/test-ks2-route', (req, res) => {
  res.json({ 
    success: true, 
    message: 'КС-2 routes работают! Middleware подключен.',
    timestamp: new Date().toISOString()
  });
});

// Применяем middleware аутентификации ко всем маршрутам
router.use(authenticateToken);

/**
 * @route POST /api/work-completion-acts/generate
 * @desc Сформировать акт выполненных работ
 * @access Private
 * @body {
 *   estimateId: string,
 *   projectId: string,
 *   actType: 'client' | 'specialist' | 'both',
 *   periodFrom?: date,
 *   periodTo?: date,
 *   actDate?: date
 * }
 */
router.post('/generate', workCompletionActsController.generateAct);

/**
 * @route GET /api/work-completion-acts/estimate/:estimateId
 * @desc Получить все акты по смете
 * @access Private
 * @query actType?: 'client' | 'specialist'
 */
router.get('/estimate/:estimateId', workCompletionActsController.getActsByEstimate);

// ============================================================================
// СПЕЦИФИЧНЫЕ МАРШРУТЫ (должны быть ВЫШЕ общего /:actId)
// ============================================================================

/**
 * @route GET /api/work-completion-acts/:actId/ks2
 * @desc Получить данные для формы КС-2
 * @access Private
 */
router.get('/:actId/ks2', (req, res, next) => {
  console.log('🔵 [ROUTE KS2] Hit! actId:', req.params.actId);
  console.log('🔵 [ROUTE KS2] Controller function exists?', typeof workCompletionActsController.getFormKS2);
  next();
}, workCompletionActsController.getFormKS2);

/**
 * @route GET /api/work-completion-acts/:actId/ks3
 * @desc Получить данные для формы КС-3
 * @access Private
 */
router.get('/:actId/ks3', workCompletionActsController.getFormKS3);

/**
 * @route PATCH /api/work-completion-acts/:actId/status
 * @desc Обновить статус акта
 * @access Private
 * @body { status: 'draft' | 'pending' | 'approved' | 'paid' }
 */
router.patch('/:actId/status', workCompletionActsController.updateActStatus);

/**
 * @route PATCH /api/work-completion-acts/:actId/details
 * @desc Обновить детали акта (контрагенты, договор, объект)
 * @access Private
 * @body {
 *   contractorId?: string,
 *   customerId?: string,
 *   contractNumber?: string,
 *   contractDate?: date,
 *   contractSubject?: string,
 *   constructionObject?: string,
 *   constructionAddress?: string,
 *   constructionOkpd?: string,
 *   formType?: 'ks2-ks3' | 'custom' | 'simplified'
 * }
 */
router.patch('/:actId/details', workCompletionActsController.updateActDetails);

/**
 * @route POST /api/work-completion-acts/:actId/signatories
 * @desc Обновить подписантов акта
 * @access Private
 * @body {
 *   signatories: Array<{
 *     role: 'contractor_chief' | 'contractor_accountant' | 'customer_chief' | 'customer_inspector' | 'technical_supervisor',
 *     fullName: string,
 *     position: string,
 *     signedAt?: date
 *   }>
 * }
 */
router.post('/:actId/signatories', workCompletionActsController.updateSignatories);

// ============================================================================
// ОБЩИЕ МАРШРУТЫ (должны быть ПОСЛЕ специфичных)
// ============================================================================

/**
 * @route GET /api/work-completion-acts/:actId
 * @desc Получить детали акта с позициями
 * @access Private
 */
router.get('/:actId', workCompletionActsController.getActById);

/**
 * @route DELETE /api/work-completion-acts/:actId
 * @desc Удалить акт
 * @access Private
 */
router.delete('/:actId', workCompletionActsController.deleteAct);

export default router;
