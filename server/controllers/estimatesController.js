/**
 * Controller для управления сметами
 */

import estimatesRepository from '../repositories/estimatesRepository.js';
import { StatusCodes } from 'http-status-codes';

/**
 * @swagger
 * /projects/{projectId}/estimates:
 *   get:
 *     tags: [Estimates]
 *     summary: Получить все сметы проекта
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список смет
 */
export async function getEstimatesByProject(req, res) {
  try {
    const { projectId } = req.params;
    const tenantId = req.user.tenantId;

    const estimates = await estimatesRepository.findByProjectId(projectId, tenantId);

    res.status(StatusCodes.OK).json(estimates);
  } catch (error) {
    console.error('Error fetching estimates:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Ошибка при получении смет',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/{id}:
 *   get:
 *     tags: [Estimates]
 *     summary: Получить смету по ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Смета найдена
 *       404:
 *         description: Смета не найдена
 */
export async function getEstimateById(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const estimate = await estimatesRepository.findById(id, tenantId);

    if (!estimate) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Смета не найдена'
      });
    }

    // ✅ Логируем данные проекта для отладки
    console.log('📊 Estimate controller - returning data:', {
      estimate_id: estimate.id,
      project_id: estimate.project_id,
      client_name: estimate.client_name,
      contractor_name: estimate.contractor_name,
      object_address: estimate.object_address,
      contract_number: estimate.contract_number,
    });

    res.status(StatusCodes.OK).json(estimate);
  } catch (error) {
    console.error('Error fetching estimate:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Ошибка при получении сметы',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /projects/{projectId}/estimates:
 *   post:
 *     tags: [Estimates]
 *     summary: Создать новую смету
 *     description: |
 *       Создает новую смету в проекте. Автоматически генерируется номер сметы и дата создания.
 *       
 *       **Типы смет:**
 *       - строительство
 *       - реконструкция
 *       - капремонт
 *       - проектные работы
 *       - другое
 *       
 *       **Статусы сметы:**
 *       - draft (черновик) - по умолчанию
 *       - approved (утверждена)
 *       - in_progress (в работе)
 *       - completed (завершена)
 *       - cancelled (отменена)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID проекта
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - estimateType
 *             properties:
 *               name:
 *                 type: string
 *                 description: Название сметы
 *                 example: "Смета на отделочные работы"
 *                 minLength: 1
 *               estimateType:
 *                 type: string
 *                 enum: [строительство, реконструкция, капремонт, проектные работы, другое]
 *                 description: Тип сметы
 *                 example: "строительство"
 *               description:
 *                 type: string
 *                 description: Описание сметы (опционально)
 *                 example: "Отделочные работы 1 этажа"
 *               estimateNumber:
 *                 type: string
 *                 description: Номер сметы (автогенерируется, если не указан)
 *                 example: "СМ-2025-001"
 *               estimateDate:
 *                 type: string
 *                 format: date
 *                 description: Дата составления сметы (текущая дата, если не указана)
 *                 example: "2025-10-31"
 *               status:
 *                 type: string
 *                 enum: [draft, approved, in_progress, completed, cancelled]
 *                 default: draft
 *                 description: Статус сметы
 *     responses:
 *       201:
 *         description: Смета успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Estimate'
 *                 - type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *             example:
 *               id: "550e8400-e29b-41d4-a716-446655440000"
 *               projectId: "123e4567-e89b-12d3-a456-426614174000"
 *               name: "Смета на отделочные работы"
 *               estimateType: "строительство"
 *               estimateNumber: "СМ-2025-001"
 *               estimateDate: "2025-10-31"
 *               status: "draft"
 *               totalAmount: 0
 *               createdAt: "2025-10-31T10:30:00.000Z"
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingName:
 *                 value:
 *                   error: "Название сметы обязательно"
 *               missingType:
 *                 value:
 *                   error: "Тип сметы обязателен"
 *               invalidType:
 *                 value:
 *                   error: "Недопустимый тип сметы"
 *                   validTypes: ["строительство", "реконструкция", "капремонт", "проектные работы", "другое"]
 *               projectNotFound:
 *                 value:
 *                   error: "Проект не найден или нет доступа"
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
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function createEstimate(req, res) {
  try {
    const { projectId } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    // Валидация обязательных полей
    const { name, estimateType } = req.body;

    if (!name || !name.trim()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Название сметы обязательно'
      });
    }

    if (!estimateType) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Тип сметы обязателен'
      });
    }

    // Проверяем допустимые типы смет
    const validTypes = ['строительство', 'реконструкция', 'капремонт', 'проектные работы', 'другое'];
    if (!validTypes.includes(estimateType)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Недопустимый тип сметы',
        validTypes
      });
    }

    // Создаём смету
    const estimateData = {
      projectId,
      ...req.body
    };

    const newEstimate = await estimatesRepository.create(estimateData, tenantId, userId);

    res.status(StatusCodes.CREATED).json(newEstimate);
  } catch (error) {
    console.error('Error creating estimate:', error);
    
    // Обработка ошибок foreign key constraint (несуществующий проект)
    if (error.code === '23503') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Проект не найден или нет доступа'
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Ошибка при создании сметы',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/{id}:
 *   put:
 *     tags: [Estimates]
 *     summary: Обновить смету
 *     description: |
 *       Обновляет данные существующей сметы. Можно обновить любое поле.
 *       
 *       **Валидируемые поля:**
 *       - estimateType: должен быть из списка допустимых типов
 *       - status: должен быть из списка допустимых статусов
 *       
 *       **Допустимые статусы:**
 *       - draft (черновик)
 *       - in_review (на проверке)
 *       - approved (утверждена)
 *       - rejected (отклонена)
 *       - completed (завершена)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID сметы
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Название сметы
 *                 example: "Смета на отделочные работы (обновлено)"
 *               description:
 *                 type: string
 *                 description: Описание
 *                 example: "Обновленное описание"
 *               estimateType:
 *                 type: string
 *                 enum: [строительство, реконструкция, капремонт, проектные работы, другое]
 *                 description: Тип сметы
 *               status:
 *                 type: string
 *                 enum: [draft, in_review, approved, rejected, completed]
 *                 description: Статус сметы
 *                 example: "approved"
 *               estimateNumber:
 *                 type: string
 *                 description: Номер сметы
 *               estimateDate:
 *                 type: string
 *                 format: date
 *                 description: Дата составления
 *           example:
 *             name: "Смета на отделочные работы (обновлено)"
 *             status: "approved"
 *             description: "Утверждена после проверки"
 *     responses:
 *       200:
 *         description: Смета успешно обновлена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Estimate'
 *             example:
 *               id: "550e8400-e29b-41d4-a716-446655440000"
 *               name: "Смета на отделочные работы (обновлено)"
 *               status: "approved"
 *               updatedAt: "2025-10-31T11:00:00.000Z"
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidType:
 *                 value:
 *                   error: "Недопустимый тип сметы"
 *                   validTypes: ["строительство", "реконструкция", "капремонт", "проектные работы", "другое"]
 *               invalidStatus:
 *                 value:
 *                   error: "Недопустимый статус"
 *                   validStatuses: ["draft", "in_review", "approved", "rejected", "completed"]
 *       404:
 *         description: Смета не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Смета не найдена или нет доступа"
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export async function updateEstimate(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    // Валидация типа сметы, если он передан
    if (req.body.estimateType) {
      const validTypes = ['строительство', 'реконструкция', 'капремонт', 'проектные работы', 'другое'];
      if (!validTypes.includes(req.body.estimateType)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Недопустимый тип сметы',
          validTypes
        });
      }
    }

    // Валидация статуса, если он передан
    if (req.body.status) {
      const validStatuses = ['draft', 'in_review', 'approved', 'rejected', 'completed'];
      if (!validStatuses.includes(req.body.status)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Недопустимый статус',
          validStatuses
        });
      }
    }

    const updatedEstimate = await estimatesRepository.update(id, req.body, tenantId, userId);

    res.status(StatusCodes.OK).json(updatedEstimate);
  } catch (error) {
    console.error('Error updating estimate:', error);

    if (error.message === 'Смета не найдена или нет доступа') {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: error.message
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Ошибка при обновлении сметы',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/{id}:
 *   delete:
 *     tags: [Estimates]
 *     summary: Удалить смету
 *     description: |
 *       Удаляет смету со всеми связанными данными (позиции, материалы, расчеты).
 *       
 *       **Внимание:** Операция необратима! Все данные будут удалены из базы данных.
 *       
 *       **Что удаляется:**
 *       - Смета
 *       - Все позиции сметы (estimate_items)
 *       - Связанные материалы
 *       - Расчеты параметров
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID сметы
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Смета успешно удалена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Смета успешно удалена"
 *       404:
 *         description: Смета не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Смета не найдена или нет доступа"
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export async function deleteEstimate(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    await estimatesRepository.deleteEstimate(id, tenantId);

    res.status(StatusCodes.OK).json({
      message: 'Смета успешно удалена'
    });
  } catch (error) {
    console.error('Error deleting estimate:', error);

    if (error.message === 'Смета не найдена или нет доступа') {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: error.message
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Ошибка при удалении сметы',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/{id}/statistics:
 *   get:
 *     tags: [Estimates]
 *     summary: Получить статистику по смете
 *     description: |
 *       Возвращает расширенную статистику по смете:
 *       - Общая стоимость
 *       - Количество позиций
 *       - Количество материалов
 *       - Стоимость работ
 *       - Стоимость материалов
 *       - Прогресс выполнения
 *       - Статус оплаты
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID сметы
 *     responses:
 *       200:
 *         description: Статистика получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalAmount:
 *                   type: number
 *                   format: decimal
 *                   description: Общая стоимость сметы
 *                   example: 1500000.50
 *                 itemsCount:
 *                   type: integer
 *                   description: Количество позиций в смете
 *                   example: 45
 *                 materialsCount:
 *                   type: integer
 *                   description: Количество уникальных материалов
 *                   example: 120
 *                 laborCost:
 *                   type: number
 *                   description: Стоимость работ
 *                   example: 600000
 *                 materialsCost:
 *                   type: number
 *                   description: Стоимость материалов
 *                   example: 900000.50
 *                 completionPercentage:
 *                   type: number
 *                   format: float
 *                   description: Процент выполнения (0-100)
 *                   example: 75.5
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export async function getEstimateStatistics(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const statistics = await estimatesRepository.getStatistics(id, tenantId);

    res.status(StatusCodes.OK).json(statistics);
  } catch (error) {
    console.error('Error fetching estimate statistics:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Ошибка при получении статистики',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/{id}/full:
 *   get:
 *     tags: [Estimates]
 *     summary: Получить полную смету с items и materials
 *     description: |
 *       Возвращает смету со всеми связанными данными:
 *       - Основные данные сметы
 *       - Все позиции сметы (estimate_items)
 *       - Материалы для каждой позиции
 *       - Расчеты параметров объекта
 *       - Информацию о проекте
 *       
 *       Используется для отображения полной информации о смете в одном запросе.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID сметы
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Полная смета получена
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Estimate'
 *                 - type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       description: Позиции сметы
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           workName:
 *                             type: string
 *                           quantity:
 *                             type: number
 *                           unit:
 *                             type: string
 *                           pricePerUnit:
 *                             type: number
 *                           totalPrice:
 *                             type: number
 *                           materials:
 *                             type: array
 *                             items:
 *                               type: object
 *                     project:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         client:
 *                           type: string
 *       404:
 *         description: Смета не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export async function getEstimateFullDetails(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId || '00000000-0000-0000-0000-000000000000';

    const estimate = await estimatesRepository.findByIdWithDetails(id, tenantId);

    if (!estimate) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Смета не найдена'
      });
    }

    res.status(StatusCodes.OK).json(estimate);
  } catch (error) {
    console.error('Error fetching full estimate:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Ошибка при получении полной сметы',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /estimates/full:
 *   post:
 *     tags: [Estimates]
 *     summary: Создать смету с items и materials
 *     description: |
 *       Создает смету вместе с позициями и материалами за один запрос.
 *       Используется для быстрого создания полностью заполненной сметы.
 *       
 *       **Атомарная операция:**  
 *       Все данные создаются в одной транзакции - если ошибка в любой части,
 *       вся смета не будет создана.
 *       
 *       **Структура данных:**
 *       - estimate: основные данные сметы
 *       - items: массив позиций с работами
 *       - materials: материалы для каждой позиции
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - projectId
 *               - estimateType
 *             properties:
 *               name:
 *                 type: string
 *                 description: Название сметы
 *                 example: "Комплексная смета на строительство"
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: ID проекта
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               estimateType:
 *                 type: string
 *                 enum: [строительство, реконструкция, капремонт, проектные работы, другое]
 *                 description: Тип сметы
 *               description:
 *                 type: string
 *                 description: Описание сметы
 *               items:
 *                 type: array
 *                 description: Позиции сметы
 *                 items:
 *                   type: object
 *                   required:
 *                     - workName
 *                     - quantity
 *                     - unit
 *                     - pricePerUnit
 *                   properties:
 *                     workName:
 *                       type: string
 *                       example: "Штукатурка стен"
 *                     quantity:
 *                       type: number
 *                       example: 150.5
 *                     unit:
 *                       type: string
 *                       example: "м²"
 *                     pricePerUnit:
 *                       type: number
 *                       example: 500
 *                     materials:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           quantity:
 *                             type: number
 *                           unit:
 *                             type: string
 *                           price:
 *                             type: number
 *           example:
 *             name: "Смета на отделочные работы"
 *             projectId: "123e4567-e89b-12d3-a456-426614174000"
 *             estimateType: "строительство"
 *             description: "Полная смета с материалами"
 *             items:
 *               - workName: "Штукатурка стен"
 *                 quantity: 150.5
 *                 unit: "м²"
 *                 pricePerUnit: 500
 *                 materials:
 *                   - name: "Штукатурка гипсовая"
 *                     quantity: 300
 *                     unit: "кг"
 *                     price: 15
 *               - workName: "Покраска потолка"
 *                 quantity: 80
 *                 unit: "м²"
 *                 pricePerUnit: 350
 *                 materials:
 *                   - name: "Краска акриловая"
 *                     quantity: 20
 *                     unit: "л"
 *                     price: 450
 *     responses:
 *       201:
 *         description: Смета со всеми данными успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Estimate'
 *                 - type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       description: Созданные позиции
 *                     totalAmount:
 *                       type: number
 *                       description: Автоматически рассчитанная общая сумма
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingName:
 *                 value:
 *                   error: "Название сметы обязательно"
 *               missingProject:
 *                 value:
 *                   error: "ID проекта обязателен"
 *               missingType:
 *                 value:
 *                   error: "Тип сметы обязателен"
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export async function createEstimateWithDetails(req, res) {
  try {
    const tenantId = req.user?.tenantId || '00000000-0000-0000-0000-000000000000';
    const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';

    // Валидация обязательных полей
    const { name, projectId, estimateType } = req.body;

    if (!name || !name.trim()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Название сметы обязательно'
      });
    }

    if (!projectId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'ID проекта обязателен'
      });
    }

    if (!estimateType) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Тип сметы обязателен'
      });
    }

    const newEstimate = await estimatesRepository.createWithDetails(req.body, tenantId, userId);

    res.status(StatusCodes.CREATED).json(newEstimate);
  } catch (error) {
    console.error('Error creating full estimate:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Ошибка при создании сметы',
      message: error.message
    });
  }
}

export default {
  getEstimatesByProject,
  getEstimateById,
  createEstimate,
  updateEstimate,
  deleteEstimate,
  getEstimateStatistics,
  getEstimateFullDetails,
  createEstimateWithDetails
};
