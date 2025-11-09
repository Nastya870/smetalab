import * as purchasesRepository from '../repositories/purchasesRepository.js';

/**
 * @swagger
 * /purchases/generate:
 *   post:
 *     tags: [Purchases]
 *     summary: Сформировать план закупок
 *     description: Генерирует план закупок материалов на основе сметы (группирует материалы)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estimateId
 *               - projectId
 *             properties:
 *               estimateId:
 *                 type: string
 *                 format: uuid
 *               projectId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: План закупок успешно сформирован
 *       400:
 *         description: Отсутствуют обязательные параметры
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const generatePurchases = async (req, res) => {
  try {
    const { estimateId, projectId } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    console.log('[PURCHASES] Generate request:', { estimateId, projectId, tenantId, userId });

    if (!estimateId || !projectId) {
      return res.status(400).json({ 
        error: 'estimateId и projectId обязательны' 
      });
    }

    // Генерируем закупки (группируем материалы)
    console.log('[PURCHASES] Calling generatePurchases...');
    const purchases = await purchasesRepository.generatePurchases(
      tenantId,
      projectId,
      estimateId,
      userId
    );
    console.log('[PURCHASES] Generated materials:', purchases.length);

    res.status(200).json({
      success: true,
      totalMaterials: purchases.length,
      purchases
    });

  } catch (error) {
    console.error('[PURCHASES] Ошибка при формировании закупок:', error);
    console.error('[PURCHASES] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Ошибка сервера при формировании закупок',
      details: error.message 
    });
  }
};

/**
 * @swagger
 * /purchases/estimate/{estimateId}:
 *   get:
 *     tags: [Purchases]
 *     summary: Получить план закупок по смете
 *     description: Возвращает список материалов для закупки по указанной смете
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: План закупок успешно получен
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getPurchasesByEstimate = async (req, res) => {
  try {
    const { estimateId } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    const purchases = await purchasesRepository.getPurchasesByEstimate(
      tenantId, 
      estimateId,
      userId
    );

    if (purchases.length === 0) {
      return res.status(404).json({
        error: 'Закупки не найдены',
        message: 'Закупки для данной сметы еще не сформированы'
      });
    }

    res.status(200).json({
      success: true,
      totalMaterials: purchases.length,
      purchases
    });

  } catch (error) {
    console.error('[PURCHASES] Ошибка при получении закупок:', error);
    res.status(500).json({ 
      error: 'Ошибка сервера при получении закупок',
      details: error.message 
    });
  }
};

/**
 * @swagger
 * /purchases/estimate/{estimateId}:
 *   delete:
 *     tags: [Purchases]
 *     summary: Удалить план закупок
 *     description: Удаляет план закупок для указанной сметы
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: План закупок успешно удалён
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const deletePurchases = async (req, res) => {
  try {
    const { estimateId } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    await purchasesRepository.deletePurchases(tenantId, estimateId, userId);

    res.status(200).json({
      success: true,
      message: 'Закупки успешно удалены'
    });

  } catch (error) {
    console.error('[PURCHASES] Ошибка при удалении закупок:', error);
    res.status(500).json({ 
      error: 'Ошибка сервера при удалении закупок',
      details: error.message 
    });
  }
};

/**
 * @swagger
 * /purchases/extra-charge:
 *   post:
 *     tags: [Purchases]
 *     summary: Добавить материал О/Ч
 *     description: Создаёт запись о материале общехозяйственного назначения в закупках проекта
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estimateId
 *               - projectId
 *               - materialId
 *               - quantity
 *               - price
 *             properties:
 *               estimateId:
 *                 type: string
 *                 format: uuid
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               materialId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: number
 *               price:
 *                 type: number
 *               isExtraCharge:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Материал О/Ч успешно добавлен
 *       400:
 *         description: Отсутствуют обязательные параметры
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const createExtraCharge = async (req, res) => {
  try {
    const { estimateId, projectId, materialId, quantity, price, isExtraCharge } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    console.log('[PURCHASES] Create Extra Charge request:', { 
      estimateId, projectId, materialId, quantity, price, isExtraCharge, tenantId, userId 
    });

    if (!estimateId || !projectId || !materialId || !quantity || !price) {
      return res.status(400).json({ 
        error: 'estimateId, projectId, materialId, quantity и price обязательны' 
      });
    }

    // Создаем запись О/Ч в таблице purchases
    const purchase = await purchasesRepository.createExtraCharge(
      tenantId,
      projectId,
      estimateId,
      materialId,
      parseFloat(quantity),
      parseFloat(price),
      userId
    );

    console.log('[PURCHASES] Extra Charge created:', purchase);

    res.status(201).json({
      success: true,
      message: 'Материал О/Ч успешно добавлен в закупки проекта',
      purchase
    });

  } catch (error) {
    console.error('[PURCHASES] Ошибка при создании О/Ч:', error);
    console.error('[PURCHASES] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Ошибка сервера при создании О/Ч',
      details: error.message 
    });
  }
};
