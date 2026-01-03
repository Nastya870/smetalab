import * as purchasesRepository from '../repositories/purchasesRepository.js';
import db from '../config/database.js';
import { catchAsync, BadRequestError, NotFoundError } from '../utils/errors.js';
import { analyzeReceipt, matchMaterialsWithDatabase } from '../services/ocrService.js';

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
export const generatePurchases = catchAsync(async (req, res) => {
  const { estimateId, projectId } = req.body;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  console.log('[PURCHASES] Generate request:', { estimateId, projectId, tenantId, userId });

  if (!estimateId || !projectId) {
    throw new BadRequestError('estimateId и projectId обязательны');
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
});

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
export const getPurchasesByEstimate = catchAsync(async (req, res) => {
  const { estimateId } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  const purchases = await purchasesRepository.getPurchasesByEstimate(
    tenantId, 
    estimateId,
    userId
  );

  if (purchases.length === 0) {
    throw new NotFoundError('Закупки не найдены');
  }

  res.status(200).json({
    success: true,
    totalMaterials: purchases.length,
    purchases
  });
});

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
export const deletePurchases = catchAsync(async (req, res) => {
  const { estimateId } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  await purchasesRepository.deletePurchases(tenantId, estimateId, userId);

  res.status(200).json({
    success: true,
    message: 'Закупки успешно удалены'
  });
});

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
export const createExtraCharge = catchAsync(async (req, res) => {
  const { estimateId, projectId, materialId, quantity, price, isExtraCharge } = req.body;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  console.log('[PURCHASES] Create Extra Charge request:', { 
    estimateId, projectId, materialId, quantity, price, isExtraCharge, tenantId, userId 
  });

  if (!estimateId || !projectId || !materialId || !quantity || !price) {
    throw new BadRequestError('estimateId, projectId, materialId, quantity и price обязательны');
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
});

/**
 * @swagger
 * /purchases/analyze-receipt:
 *   post:
 *     tags: [Purchases]
 *     summary: Распознать накладную с помощью OCR
 *     description: Анализирует изображение накладной и извлекает материалы, количество, цены
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Изображение накладной (JPG, PNG, WebP) или PDF (скоро)
 *     responses:
 *       200:
 *         description: Накладная успешно распознана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 documentType:
 *                   type: string
 *                   enum: [printed, handwritten]
 *                 supplier:
 *                   type: string
 *                 materials:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                       unit:
 *                         type: string
 *                       price:
 *                         type: number
 *                       total:
 *                         type: number
 *                       material_id:
 *                         type: integer
 *                         nullable: true
 *                       matched_name:
 *                         type: string
 *                         nullable: true
 *                       confidence:
 *                         type: number
 *       400:
 *         description: Файл не загружен или неверный формат
 *       500:
 *         description: Ошибка распознавания
 */
export const analyzeReceiptOCR = catchAsync(async (req, res) => {
  console.log('🤖 [OCR] Запрос на распознавание накладной');
  
  // Проверяем наличие файла
  if (!req.file) {
    throw new BadRequestError('Файл изображения не загружен');
  }

  const { buffer, mimetype, originalname, size } = req.file;
  const tenantId = req.user.tenantId;
  const isSuperAdmin = req.user.isSuperAdmin;

  console.log(`📄 [OCR] Файл: ${originalname}, размер: ${(size / 1024).toFixed(1)}KB, тип: ${mimetype}`);

  // Проверяем MIME тип
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(mimetype)) {
    throw new BadRequestError('Неподдерживаемый формат. Используйте JPG, PNG, WebP или PDF');
  }

  // Для PDF требуется конвертация в изображение
  if (mimetype === 'application/pdf') {
    throw new BadRequestError('PDF пока не поддерживается. Пожалуйста, сделайте скриншот или фото накладной и загрузите как изображение (JPG/PNG)');
  }

  // Проверяем размер (макс 10MB)
  if (size > 10 * 1024 * 1024) {
    throw new BadRequestError('Размер файла не должен превышать 10MB');
  }

  try {
    // Шаг 1: Распознаём накладную через OpenAI
    const ocrResult = await analyzeReceipt(buffer, mimetype);

    // Шаг 2: Загружаем материалы из БД для сопоставления
    console.log(`🔍 [OCR] Загрузка материалов из БД для tenant: ${tenantId}`);
    
    // Загружаем материалы: глобальные + материалы тенанта
    const materialsQuery = `
      SELECT id, sku, name, unit, price, category, supplier
      FROM materials
      WHERE (is_global = TRUE OR tenant_id = $1)
      ORDER BY name ASC
      LIMIT 10000
    `;
    const materialsResult = await db.query(materialsQuery, [tenantId]);
    const dbMaterials = materialsResult.rows;

    // Шаг 3: Сопоставляем распознанные материалы с БД
    const matchedMaterials = matchMaterialsWithDatabase(ocrResult.materials || [], dbMaterials);

    // Статистика
    const stats = {
      total: matchedMaterials.length,
      matched: matchedMaterials.filter(m => m.material_id !== null).length,
      notMatched: matchedMaterials.filter(m => m.material_id === null).length,
      lowConfidence: matchedMaterials.filter(m => m.confidence < 0.7).length
    };

    console.log(`✅ [OCR] Распознавание завершено:`, stats);

    res.status(200).json({
      success: true,
      documentType: ocrResult.documentType,
      supplier: ocrResult.supplier,
      documentNumber: ocrResult.documentNumber,
      materials: matchedMaterials,
      stats
    });
  } catch (error) {
    console.error('❌ [OCR] Ошибка обработки:', error);
    throw new Error(`Не удалось обработать накладную: ${error.message}`);
  }
});
