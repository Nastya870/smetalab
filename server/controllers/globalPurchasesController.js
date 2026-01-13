import * as globalPurchasesRepository from '../repositories/globalPurchasesRepository.js';
import { catchAsync, BadRequestError, NotFoundError } from '../utils/errors.js';

/**
 * @swagger
 * /global-purchases:
 *   post:
 *     tags: [Global Purchases]
 *     summary: Создать фактическую закупку
 *     description: Создает запись о фактической закупке материала в рамках проекта и сметы. Поддерживает связь с планируемыми закупками и О/Ч материалами.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - estimateId
 *               - materialId
 *               - quantity
 *               - purchasePrice
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: ID проекта
 *               estimateId:
 *                 type: string
 *                 format: uuid
 *                 description: ID сметы
 *               materialId:
 *                 type: string
 *                 format: uuid
 *                 description: ID материала
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *                 description: Количество закупленного материала (должно быть больше 0)
 *                 example: 50.5
 *               purchasePrice:
 *                 type: number
 *                 minimum: 0
 *                 description: Цена закупки за единицу
 *                 example: 1250.00
 *               purchaseDate:
 *                 type: string
 *                 format: date
 *                 description: Дата закупки (по умолчанию - текущая дата)
 *                 example: "2024-02-15"
 *               sourcePurchaseId:
 *                 type: string
 *                 format: uuid
 *                 description: ID планируемой закупки (из модуля Purchases), на основе которой создана эта фактическая
 *               isExtraCharge:
 *                 type: boolean
 *                 description: Флаг, указывающий что это О/Ч материал (с наценкой)
 *                 default: false
 *     responses:
 *       201:
 *         description: Фактическая закупка успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 purchase:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     project_id:
 *                       type: string
 *                       format: uuid
 *                     estimate_id:
 *                       type: string
 *                       format: uuid
 *                     material_id:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: number
 *                     purchase_price:
 *                       type: number
 *                     purchase_date:
 *                       type: string
 *                       format: date
 *                     source_purchase_id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     is_extra_charge:
 *                       type: boolean
 *                     tenant_id:
 *                       type: string
 *                       format: uuid
 *                     created_by:
 *                       type: string
 *                       format: uuid
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Ошибка валидации данных
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "projectId, estimateId и materialId обязательны"
 *       401:
 *         description: Не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */
export const createGlobalPurchase = catchAsync(async (req, res) => {
  const {
    projectId,
    estimateId,
    materialId,
    quantity,
    purchasePrice,
    purchaseDate,
    sourcePurchaseId,
    isExtraCharge
  } = req.body;

  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  // Отладочный вывод
  console.log('[GLOBAL PURCHASES] Создание закупки, body:', req.body);

  // Валидация
  if (!projectId || !estimateId || !materialId) {
    console.error('[GLOBAL PURCHASES] Отсутствуют обязательные поля:', { projectId, estimateId, materialId });
    throw new BadRequestError('projectId, estimateId и materialId обязательны');
  }

  const parsedQuantity = parseFloat(quantity);
  if (!quantity || isNaN(parsedQuantity) || parsedQuantity <= 0) {
    console.error('[GLOBAL PURCHASES] Некорректное количество:', quantity);
    throw new BadRequestError('Количество должно быть больше 0');
  }

  const parsedPrice = parseFloat(purchasePrice);
  if (purchasePrice === undefined || purchasePrice === null || purchasePrice === '' || isNaN(parsedPrice) || parsedPrice < 0) {
    console.error('[GLOBAL PURCHASES] Некорректная цена:', purchasePrice);
    throw new BadRequestError('Цена закупки не может быть отрицательной или пустой');
  }

  const purchaseData = {
    projectId,
    estimateId,
    materialId,
    quantity: parsedQuantity,
    purchasePrice: parsedPrice,
    purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
    sourcePurchaseId,
    isExtraCharge: isExtraCharge || false
  };

  console.log('[GLOBAL PURCHASES] Валидированные данные для создания:', purchaseData);

  const purchase = await globalPurchasesRepository.createGlobalPurchase(
    tenantId,
    userId,
    purchaseData
  );

  res.status(201).json({
    success: true,
    purchase
  });
});

/**
 * @swagger
 * /global-purchases:
 *   get:
 *     tags: [Global Purchases]
 *     summary: Получить все фактические закупки
 *     description: Возвращает список фактических закупок с возможностью фильтрации по проекту, смете, материалу и датам
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: estimateId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: materialId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Список закупок успешно получен
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getAllGlobalPurchases = catchAsync(async (req, res) => {
  const { projectId, estimateId, materialId, dateFrom, dateTo } = req.query;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  console.log('📊 [CONTROLLER] Получение закупок');
  console.log('   Query params:', req.query);
  console.log('   projectId:', projectId, '(type:', typeof projectId, ')');
  console.log('   tenantId:', tenantId);
  console.log('   userId:', userId);

  const filters = {};
  if (projectId) filters.projectId = projectId;
  if (estimateId) filters.estimateId = estimateId;
  if (materialId) filters.materialId = parseInt(materialId);
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  console.log('   Filters для repository:', filters);

  const purchases = await globalPurchasesRepository.findAllGlobalPurchases(
    tenantId,
    userId,
    filters
  );

  console.log('✅ Найдено закупок:', purchases.length);

  res.status(200).json({
    success: true,
    count: purchases.length,
    purchases
  });
});

/**
 * @swagger
 * /global-purchases/{id}:
 *   get:
 *     tags: [Global Purchases]
 *     summary: Получить закупку по ID
 *     description: Возвращает детальную информацию о фактической закупке
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Закупка найдена
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getGlobalPurchaseById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  const purchase = await globalPurchasesRepository.findGlobalPurchaseById(
    tenantId,
    userId,
    id
  );

  if (!purchase) {
    throw new NotFoundError('Закупка не найдена');
  }

  res.status(200).json({
    success: true,
    purchase
  });
});

/**
 * @swagger
 * /global-purchases/{id}:
 *   put:
 *     tags: [Global Purchases]
 *     summary: Обновить фактическую закупку
 *     description: Обновляет данные закупки (количество, цену, дату)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *               purchasePrice:
 *                 type: number
 *               purchaseDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Закупка успешно обновлена
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const updateGlobalPurchase = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { quantity, purchasePrice, purchaseDate } = req.body;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  // Валидация
  if (quantity !== undefined && quantity <= 0) {
    throw new BadRequestError('Количество должно быть больше 0');
  }

  if (purchasePrice !== undefined && purchasePrice < 0) {
    throw new BadRequestError('Цена закупки не может быть отрицательной');
  }

  const updateData = {};
  if (quantity !== undefined) updateData.quantity = parseFloat(quantity);
  if (purchasePrice !== undefined) updateData.purchasePrice = parseFloat(purchasePrice);
  if (purchaseDate !== undefined) updateData.purchaseDate = purchaseDate;

  if (Object.keys(updateData).length === 0) {
    throw new BadRequestError('Нет данных для обновления');
  }

  const purchase = await globalPurchasesRepository.updateGlobalPurchase(
    tenantId,
    userId,
    id,
    updateData
  );

  res.status(200).json({
    success: true,
    purchase
  });
});

/**
 * @swagger
 * /global-purchases/{id}:
 *   delete:
 *     tags: [Global Purchases]
 *     summary: Удалить фактическую закупку
 *     description: Удаляет запись о фактической закупке
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Закупка успешно удалена
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const deleteGlobalPurchase = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  await globalPurchasesRepository.deleteGlobalPurchase(
    tenantId,
    userId,
    id
  );

  res.status(200).json({
    success: true,
    message: 'Закупка успешно удалена'
  });
});

/**
 * @swagger
 * /global-purchases/calendar:
 *   get:
 *     tags: [Global Purchases]
 *     summary: Получить даты с закупками для календаря
 *     description: Возвращает список дат, в которые были сделаны закупки (для отображения в календаре)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Даты успешно получены
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getCalendarDates = catchAsync(async (req, res) => {
  const { year, month } = req.query;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  if (!year || !month) {
    throw new BadRequestError('year и month обязательны');
  }

  const dates = await globalPurchasesRepository.getCalendarDates(
    tenantId,
    userId,
    parseInt(year),
    parseInt(month)
  );

  res.status(200).json({
    success: true,
    dates
  });
});

/**
 * @swagger
 * /global-purchases/statistics:
 *   get:
 *     tags: [Global Purchases]
 *     summary: Получить статистику по закупкам
 *     description: Возвращает статистику по фактическим закупкам (общая сумма, количество и т.д.)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Статистика успешно получена
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getStatistics = catchAsync(async (req, res) => {
  const { projectId, dateFrom, dateTo } = req.query;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  const filters = {};
  if (projectId) filters.projectId = projectId;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  const statistics = await globalPurchasesRepository.getStatistics(
    tenantId,
    userId,
    filters
  );

  res.status(200).json({
    success: true,
    statistics
  });
});
