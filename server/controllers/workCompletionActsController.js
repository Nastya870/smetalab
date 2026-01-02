import { StatusCodes } from 'http-status-codes';
import * as workCompletionActsRepository from '../repositories/workCompletionActsRepository.js';
import { catchAsync, BadRequestError, NotFoundError } from '../utils/errors.js';

/**
 * @swagger
 * /work-completion-acts/generate:
 *   post:
 *     tags: [Work Completion Acts]
 *     summary: Сформировать акт выполненных работ
 *     description: |
 *       Генерирует акт(ы) выполненных работ (КС-2, КС-3) на основе сметы.
 *       Типы актов: client (для заказчика), specialist (для исполнителя), both (оба).
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
 *               - actType
 *             properties:
 *               estimateId:
 *                 type: string
 *                 format: uuid
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               actType:
 *                 type: string
 *                 enum: [client, specialist, both]
 *               periodFrom:
 *                 type: string
 *                 format: date
 *               periodTo:
 *                 type: string
 *                 format: date
 *               actDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Акт(ы) успешно сформированы
 *       400:
 *         description: Ошибка валидации или нет выполненных работ
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const generateAct = catchAsync(async (req, res) => {
  const { estimateId, projectId, actType, periodFrom, periodTo, actDate } = req.body;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  console.log('[ACT CONTROLLER] Generate request:', { estimateId, projectId, actType, tenantId, userId });

  // Валидация
  if (!estimateId) {
    throw new BadRequestError('ID сметы обязателен');
  }

  if (!projectId) {
    throw new BadRequestError('ID проекта обязателен');
  }

  if (!actType || !['client', 'specialist', 'both'].includes(actType)) {
    throw new BadRequestError('Тип акта должен быть: client, specialist или both');
  }

  const options = {
    periodFrom,
    periodTo,
    actDate: actDate || new Date(),
    status: 'draft'
  };

  let clientAct = null;
  let specialistAct = null;

  // Генерируем акт(ы) в зависимости от типа
  try {
    if (actType === 'client' || actType === 'both') {
      console.log('[ACT CONTROLLER] Generating CLIENT act...');
      clientAct = await workCompletionActsRepository.generateClientAct(
        estimateId,
        projectId,
        tenantId,
        userId,
        options
      );
    }

    if (actType === 'specialist' || actType === 'both') {
      console.log('[ACT CONTROLLER] Generating SPECIALIST act...');
      specialistAct = await workCompletionActsRepository.generateSpecialistAct(
        estimateId,
        projectId,
        tenantId,
        userId,
        options
      );
    }
  } catch (error) {
    console.error('[ACT CONTROLLER] Error generating act:', error);
    // Проверяем, если это ошибка отсутствия выполненных работ
    if (error.code === 'NO_COMPLETED_WORKS') {
      throw new BadRequestError(error.message);
    }
    throw error;
  }

  // Формируем ответ
  const response = {
    message: actType === 'both' 
      ? 'Акты успешно сформированы' 
      : 'Акт успешно сформирован'
  };

  if (clientAct) {
    response.clientAct = {
      id: clientAct.id,
      actNumber: clientAct.act_number,
      actDate: clientAct.act_date,
      totalAmount: clientAct.total_amount,
      workCount: clientAct.work_count,
      status: clientAct.status
    };
  }

  if (specialistAct) {
    response.specialistAct = {
      id: specialistAct.id,
      actNumber: specialistAct.act_number,
      actDate: specialistAct.act_date,
      totalAmount: specialistAct.total_amount,
      workCount: specialistAct.work_count,
      status: specialistAct.status
    };
  }

  res.status(StatusCodes.CREATED).json(response);
});

/**
 * @swagger
 * /work-completion-acts/estimate/{estimateId}:
 *   get:
 *     tags: [Work Completion Acts]
 *     summary: Получить акты по ID сметы
 *     description: Возвращает все акты выполненных работ для указанной сметы с возможностью фильтрации
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: actType
 *         schema:
 *           type: string
 *           enum: [client, specialist]
 *         description: Фильтр по типу акта
 *     responses:
 *       200:
 *         description: Список актов успешно получен
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getActsByEstimate = catchAsync(async (req, res) => {
  const { estimateId } = req.params;
  const { actType } = req.query;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  const acts = await workCompletionActsRepository.findByEstimateId(
    estimateId,
    tenantId,
    userId,
    actType
  );

  // ✅ Преобразуем snake_case → camelCase
  const formattedActs = acts.map(act => ({
    id: act.id,
    actType: act.act_type,
    actNumber: act.act_number,
    actDate: act.act_date,
    periodFrom: act.period_from,
    periodTo: act.period_to,
    totalAmount: act.total_amount,
    totalQuantity: act.total_quantity,
    workCount: act.work_count,
    status: act.status,
    notes: act.notes,
    createdAt: act.created_at,
    updatedAt: act.updated_at
  }));

  res.status(StatusCodes.OK).json({
    acts: formattedActs,
    count: formattedActs.length
  });
});

/**
 * @swagger
 * /work-completion-acts/{actId}:
 *   get:
 *     tags: [Work Completion Acts]
 *     summary: Получить детали акта с позициями
 *     description: Возвращает полную информацию об акте включая все позиции работ
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Детали акта успешно получены
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getActById = catchAsync(async (req, res) => {
  const { actId } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  const actWithItems = await workCompletionActsRepository.findById(actId, tenantId, userId);

  if (!actWithItems) {
    throw new NotFoundError('Акт не найден');
  }

  // ✅ Преобразуем items в camelCase
  const formattedItems = actWithItems.items.map(item => ({
    id: item.id,
    actId: item.act_id,
    estimateItemId: item.estimate_item_id,
    workId: item.work_id,
    workCode: item.work_code,
    workName: item.work_name,
    section: item.section,
    subsection: item.subsection,
    unit: item.unit,
    plannedQuantity: item.planned_quantity,
    actualQuantity: item.actual_quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    positionNumber: item.position_number,
    createdAt: item.created_at
  }));

  // Группируем позиции по разделам для удобного отображения
  const groupedItems = workCompletionActsRepository.groupItemsBySection(formattedItems);

  res.status(StatusCodes.OK).json({
    act: {
      id: actWithItems.id,
      actType: actWithItems.act_type,
      actNumber: actWithItems.act_number,
      actDate: actWithItems.act_date,
      periodFrom: actWithItems.period_from,
      periodTo: actWithItems.period_to,
      totalAmount: actWithItems.total_amount,
      totalQuantity: actWithItems.total_quantity,
      workCount: actWithItems.work_count,
      status: actWithItems.status,
      notes: actWithItems.notes,
      createdAt: actWithItems.created_at,
      updatedAt: actWithItems.updated_at
    },
    items: formattedItems,
    groupedItems: groupedItems
  });
});

/**
 * @swagger
 * /work-completion-acts/{actId}:
 *   delete:
 *     tags: [Work Completion Acts]
 *     summary: Удалить акт
 *     description: Удаляет акт выполненных работ
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Акт успешно удалён
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const deleteAct = catchAsync(async (req, res) => {
  const { actId } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  const deleted = await workCompletionActsRepository.deleteById(actId, tenantId, userId);

  if (!deleted) {
    throw new NotFoundError('Акт не найден');
  }

  res.status(StatusCodes.OK).json({
    message: 'Акт успешно удален'
  });
});

/**
 * @swagger
 * /work-completion-acts/{actId}/status:
 *   patch:
 *     tags: [Work Completion Acts]
 *     summary: Обновить статус акта
 *     description: |
 *       Изменяет статус акта выполненных работ.
 *       Доступные статусы: draft, pending, approved, paid.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, pending, approved, paid]
 *     responses:
 *       200:
 *         description: Статус успешно обновлён
 *       400:
 *         description: Недопустимый статус
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const updateActStatus = catchAsync(async (req, res) => {
  const { actId } = req.params;
  const { status } = req.body;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  // Валидация статуса
  const validStatuses = ['draft', 'pending', 'approved', 'paid'];
  if (!validStatuses.includes(status)) {
    throw new BadRequestError('Недопустимый статус');
  }

  const updatedAct = await workCompletionActsRepository.updateStatus(
    actId,
    status,
    tenantId,
    userId
  );

  if (!updatedAct) {
    throw new NotFoundError('Акт не найден');
  }

  res.status(StatusCodes.OK).json({
    message: 'Статус акта обновлен',
    act: {
      id: updatedAct.id,
      status: updatedAct.status,
      updatedAt: updatedAct.updated_at
    }
  });
});

/**
 * @swagger
 * /work-completion-acts/{actId}/forms/ks2:
 *   get:
 *     tags: [Work Completion Acts]
 *     summary: Получить данные для формы КС-2 (ОКУД 0322005)
 *     description: |
 *       Возвращает полный набор данных для формирования Акта о приёмке выполненных работ (форма КС-2).
 *       
 *       **Включает:**
 *       - Реквизиты акта (номер, дата)
 *       - Данные подрядчика (наименование, ИНН, КПП, ОГРН, адрес)
 *       - Данные заказчика (наименование, ИНН, КПП, ОГРН, адрес)
 *       - Договор подряда (номер, дата, предмет)
 *       - Объект строительства (наименование, адрес, код ОКПД2)
 *       - Период выполнения работ (дата начала, дата окончания)
 *       - Список работ (код, наименование, ед.изм., количество, цена, сумма)
 *       - Итоговые данные (общая сумма, количество работ)
 *       - Подписанты (должность, ФИО, роль)
 *       
 *       **Fallback логика:**
 *       Если данные не заполнены в акте, используются данные из проекта:
 *       - contractor_name → project.contractor
 *       - customer_name → project.client
 *       - construction_address → project.address
 *       - contract_number → project.contract_number
 *       
 *       **Использование:**
 *       Данные используются для генерации Excel файла с полным автозаполнением формы КС-2.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID акта выполненных работ
 *     responses:
 *       200:
 *         description: Данные формы КС-2 успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 okud:
 *                   type: string
 *                   example: "0322005"
 *                 formType:
 *                   type: string
 *                   example: "КС-2"
 *                 actNumber:
 *                   type: string
 *                   example: "АКТ-001/2025"
 *                 actDate:
 *                   type: string
 *                   format: date
 *                   example: "2025-11-05"
 *                 contractor:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "ООО СтройТехПром"
 *                     inn:
 *                       type: string
 *                       example: "7701234567"
 *                     kpp:
 *                       type: string
 *                       example: "770101001"
 *                     ogrn:
 *                       type: string
 *                       example: "1027700123456"
 *                     address:
 *                       type: string
 *                       example: "г. Москва, ул. Ленина, 15"
 *                 customer:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "ОАО РосСтрой"
 *                 contract:
 *                   type: object
 *                   properties:
 *                     number:
 *                       type: string
 *                       example: "ДП-2025/123"
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2025-01-15"
 *                 constructionObject:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Жилой комплекс Радуга"
 *                     address:
 *                       type: string
 *                       example: "г. Москва, ул. Новая, 25"
 *                 period:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                       format: date
 *                     to:
 *                       type: string
 *                       format: date
 *                 works:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       position:
 *                         type: integer
 *                         example: 1
 *                       code:
 *                         type: string
 *                         example: "3.1.5"
 *                       name:
 *                         type: string
 *                         example: "Монтаж трубопровода диаметром 100мм"
 *                       unit:
 *                         type: string
 *                         example: "м"
 *                       actualQuantity:
 *                         type: number
 *                         example: 150.5
 *                       price:
 *                         type: number
 *                         example: 1200.00
 *                       totalPrice:
 *                         type: number
 *                         example: 180600.00
 *                 totals:
 *                   type: object
 *                   properties:
 *                     amount:
 *                       type: number
 *                       example: 1432500.50
 *                     workCount:
 *                       type: integer
 *                       example: 15
 *                 signatories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [contractor_chief, customer_chief]
 *                       fullName:
 *                         type: string
 *                         example: "Иванов Иван Иванович"
 *                       position:
 *                         type: string
 *                         example: "Генеральный директор"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Акт не найден
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getFormKS2 = catchAsync(async (req, res) => {
  console.log('🟢 [CONTROLLER KS2] Entered getFormKS2');
  console.log('🟢 [CONTROLLER KS2] actId:', req.params.actId);
  console.log('🟢 [CONTROLLER KS2] user:', req.user);
  
  const { actId } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  console.log('🟢 [CONTROLLER KS2] Calling repository with:', { actId, tenantId, userId });

  const ks2Data = await workCompletionActsRepository.getFormKS2Data(
    actId,
    tenantId,
    userId
  );

  console.log('🟢 [CONTROLLER KS2] Success! Returning data');
  res.status(StatusCodes.OK).json(ks2Data);
});

/**
 * @swagger
 * /work-completion-acts/{actId}/forms/ks3:
 *   get:
 *     tags: [Work Completion Acts]
 *     summary: Получить данные для формы КС-3 (ОКУД 0322006)
 *     description: |
 *       Возвращает полный набор данных для формирования Справки о стоимости выполненных работ и затрат (форма КС-3).
 *       
 *       **Особенность КС-3:** Накопительный учёт работ с начала года (Year-To-Date)
 *       
 *       **Включает все данные КС-2 плюс:**
 *       - Накопительные суммы с начала года (amountYTD)
 *       - Суммы за предыдущие периоды (amountPrevPeriod)
 *       - Суммы в текущем периоде (amountCurrent)
 *       - Автоматическая проверка: YTD = PrevPeriod + Current
 *       
 *       **Оптимизация запросов:**
 *       - Использует CTE (Common Table Expressions) для накопительных итогов
 *       - Один запрос вместо N+1 подзапросов на каждую работу
 *       - Фильтрация по году: EXTRACT(YEAR FROM act_date)
 *       
 *       **Использование:**
 *       Данные используются для генерации Excel файла КС-3 с тремя колонками сумм:
 *       1. Всего с начала года
 *       2. В т.ч. за предыдущие периоды
 *       3. В текущем периоде
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID акта выполненных работ
 *     responses:
 *       200:
 *         description: Данные формы КС-3 успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 okud:
 *                   type: string
 *                   example: "0322006"
 *                 formType:
 *                   type: string
 *                   example: "КС-3"
 *                 actNumber:
 *                   type: string
 *                   example: "АКТ-001/2025"
 *                 actDate:
 *                   type: string
 *                   format: date
 *                   example: "2025-11-05"
 *                 contractor:
 *                   type: object
 *                   description: Данные подрядчика (наследуются из КС-2)
 *                 customer:
 *                   type: object
 *                   description: Данные заказчика (наследуются из КС-2)
 *                 contract:
 *                   type: object
 *                   description: Данные договора (наследуются из КС-2)
 *                 constructionObject:
 *                   type: object
 *                   description: Данные объекта (наследуются из КС-2)
 *                 works:
 *                   type: array
 *                   description: Работы с накопительными данными
 *                   items:
 *                     type: object
 *                     properties:
 *                       position:
 *                         type: integer
 *                         example: 1
 *                       code:
 *                         type: string
 *                         example: "3.1.5"
 *                       name:
 *                         type: string
 *                         example: "Монтаж трубопровода"
 *                       unit:
 *                         type: string
 *                         example: "м"
 *                       quantityYTD:
 *                         type: number
 *                         description: Количество с начала года
 *                         example: 150.5
 *                       quantityPrevPeriod:
 *                         type: number
 *                         description: Количество за предыдущие периоды
 *                         example: 100.0
 *                       quantityCurrent:
 *                         type: number
 *                         description: Количество в текущем периоде
 *                         example: 50.5
 *                       price:
 *                         type: number
 *                         example: 1200.00
 *                       totalPriceYTD:
 *                         type: number
 *                         description: Стоимость с начала года
 *                         example: 180600.00
 *                       totalPricePrevPeriod:
 *                         type: number
 *                         description: Стоимость за предыдущие периоды
 *                         example: 120000.00
 *                       totalPriceCurrent:
 *                         type: number
 *                         description: Стоимость в текущем периоде
 *                         example: 60600.00
 *                 totals:
 *                   type: object
 *                   properties:
 *                     amountYTD:
 *                       type: number
 *                       description: Всего с начала года
 *                       example: 1432500.50
 *                     amountPrevPeriod:
 *                       type: number
 *                       description: В т.ч. за предыдущие периоды
 *                       example: 950000.00
 *                     amountCurrent:
 *                       type: number
 *                       description: В текущем периоде
 *                       example: 482500.50
 *                     workCount:
 *                       type: integer
 *                       example: 15
 *                 signatories:
 *                   type: array
 *                   description: Подписанты (наследуются из КС-2)
 *               example:
 *                 okud: "0322006"
 *                 formType: "КС-3"
 *                 totals:
 *                   amountYTD: 1432500.50
 *                   amountPrevPeriod: 950000.00
 *                   amountCurrent: 482500.50
 *                 works:
 *                   - position: 1
 *                     name: "Монтаж трубопровода"
 *                     quantityYTD: 150.5
 *                     quantityPrevPeriod: 100.0
 *                     quantityCurrent: 50.5
 *                     totalPriceYTD: 180600.00
 *                     totalPricePrevPeriod: 120000.00
 *                     totalPriceCurrent: 60600.00
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Акт не найден
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getFormKS3 = catchAsync(async (req, res) => {
  const { actId } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  const ks3Data = await workCompletionActsRepository.getFormKS3Data(
    actId,
    tenantId,
    userId
  );

  res.status(StatusCodes.OK).json(ks3Data);
});

/**
 * @swagger
 * /work-completion-acts/{actId}/details:
 *   patch:
 *     tags: [Work Completion Acts]
 *     summary: Обновить детали акта
 *     description: |
 *       Обновляет дополнительную информацию об акте:
 *       контрагенты, номер договора, объект строительства.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actId
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
 *               contractorId:
 *                 type: string
 *                 format: uuid
 *                 description: ID подрядчика
 *               clientId:
 *                 type: string
 *                 format: uuid
 *                 description: ID заказчика
 *               contractNumber:
 *                 type: string
 *               objectName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Детали акта успешно обновлены
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const updateActDetails = catchAsync(async (req, res) => {
  const { actId } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  const updatedAct = await workCompletionActsRepository.updateActDetails(
    actId,
    req.body,
    tenantId,
    userId
  );

  res.status(StatusCodes.OK).json({
    message: 'Детали акта обновлены',
    act: {
      id: updatedAct.id,
      contractorId: updatedAct.contractor_id,
      customerId: updatedAct.customer_id,
      contractNumber: updatedAct.contract_number,
      contractDate: updatedAct.contract_date,
      constructionObject: updatedAct.construction_object,
      updatedAt: updatedAct.updated_at
    }
  });
});

/**
 * @swagger
 * /work-completion-acts/{actId}/signatories:
 *   post:
 *     tags: [Work Completion Acts]
 *     summary: Обновить подписантов акта
 *     description: |
 *       Обновляет список подписантов акта (представители подрядчика и заказчика).
 *       Роли: contractor_representative, customer_representative.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - signatories
 *             properties:
 *               signatories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - role
 *                     - name
 *                     - position
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [contractor_representative, customer_representative]
 *                     name:
 *                       type: string
 *                     position:
 *                       type: string
 *                     basisDocument:
 *                       type: string
 *     responses:
 *       200:
 *         description: Подписанты успешно обновлены
 *       400:
 *         description: Ошибка валидации данных
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const updateSignatories = catchAsync(async (req, res) => {
  const { actId } = req.params;
  const { signatories } = req.body;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  // Валидация
  if (!Array.isArray(signatories)) {
    throw new BadRequestError('signatories должен быть массивом');
  }

  // Валидация ролей
  const validRoles = [
    'contractor_chief',
    'contractor_accountant',
    'customer_chief',
    'customer_inspector',
    'technical_supervisor'
  ];

  for (const signatory of signatories) {
    if (!validRoles.includes(signatory.role)) {
      throw new BadRequestError(`Недопустимая роль подписанта: ${signatory.role}`);
    }

    if (!signatory.fullName) {
      throw new BadRequestError('ФИО подписанта обязательно');
    }
  }

  await workCompletionActsRepository.updateSignatories(
    actId,
    signatories,
    tenantId,
    userId
  );

  res.status(StatusCodes.OK).json({
    message: 'Подписанты обновлены',
    count: signatories.length
  });
});
