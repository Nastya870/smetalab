/**
 * Controller для управления параметрами объектов
 */

import objectParametersRepository from '../repositories/objectParametersRepository.js';
import { StatusCodes } from 'http-status-codes';
import { catchAsync, BadRequestError, NotFoundError } from '../utils/errors.js';

/**
 * @swagger
 * /estimates/{estimateId}/parameters:
 *   get:
 *     tags: [Object Parameters]
 *     summary: Получить параметры помещений для сметы
 *     description: Возвращает все параметры (площадь, объём, периметр, высота потолков) для указанной сметы
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID сметы
 *     responses:
 *       200:
 *         description: Список параметров помещений успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   estimate_id:
 *                     type: string
 *                     format: uuid
 *                   room_name:
 *                     type: string
 *                   area:
 *                     type: number
 *                   volume:
 *                     type: number
 *                   perimeter:
 *                     type: number
 *                   ceiling_height:
 *                     type: number
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getParametersByEstimate = catchAsync(async (req, res) => {
  const { estimateId } = req.params;
  const tenantId = req.user.tenantId;

  const parameters = await objectParametersRepository.findByEstimateId(estimateId, tenantId);

  res.status(StatusCodes.OK).json(parameters);
});

/**
 * @swagger
 * /parameters/{id}:
 *   get:
 *     tags: [Object Parameters]
 *     summary: Получить параметр помещения по ID
 *     description: Возвращает детальную информацию о конкретном параметре помещения
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID параметра помещения
 *     responses:
 *       200:
 *         description: Параметр помещения успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 estimate_id:
 *                   type: string
 *                   format: uuid
 *                 room_name:
 *                   type: string
 *                 area:
 *                   type: number
 *                 volume:
 *                   type: number
 *                 perimeter:
 *                   type: number
 *                 ceiling_height:
 *                   type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getParameterById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  const parameter = await objectParametersRepository.findById(id, tenantId);

  res.status(StatusCodes.OK).json(parameter);
});

/**
 * @swagger
 * /estimates/{estimateId}/parameters:
 *   post:
 *     tags: [Object Parameters]
 *     summary: Сохранить параметры помещений (bulk)
 *     description: |
 *       Массовое сохранение параметров помещений для сметы.
 *       Обновляет существующие и создаёт новые параметры за один запрос.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID сметы
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parameters
 *             properties:
 *               parameters:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - room_name
 *                   properties:
 *                     room_name:
 *                       type: string
 *                       example: "Кухня"
 *                     area:
 *                       type: number
 *                       example: 12.5
 *                     volume:
 *                       type: number
 *                       example: 31.25
 *                     perimeter:
 *                       type: number
 *                       example: 14.2
 *                     ceiling_height:
 *                       type: number
 *                       example: 2.5
 *     responses:
 *       200:
 *         description: Параметры успешно сохранены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 parameters:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Ошибка валидации данных
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const saveParameters = catchAsync(async (req, res) => {
  const { estimateId } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;
  const { parameters } = req.body;

  console.log('📊 saveParameters called:', {
    estimateId,
    tenantId,
    userId,
    parametersCount: parameters?.length
  });

  // Валидация
  if (!Array.isArray(parameters)) {
    throw new BadRequestError('Параметры должны быть массивом');
  }

  console.log('📝 Parameters data:', JSON.stringify(parameters, null, 2));

  // Сохранение всех параметров
  try {
    const saved = await objectParametersRepository.saveAll(estimateId, parameters, tenantId, userId);

    console.log('✅ Parameters saved successfully:', saved.length);

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Сохранено ${saved.length} параметров`,
      parameters: saved
    });
  } catch (error) {
    console.error('❌ Error saving parameters:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    
    // Обработка ошибок foreign key constraint
    if (error.code === '23503') {
      throw new BadRequestError('Смета не найдена или нет доступа');
    }
    throw error;
  }
});

/**
 * @swagger
 * /parameters/{id}:
 *   put:
 *     tags: [Object Parameters]
 *     summary: Обновить параметр помещения
 *     description: Обновляет данные конкретного параметра помещения
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID параметра помещения
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               room_name:
 *                 type: string
 *                 example: "Спальня"
 *               area:
 *                 type: number
 *                 example: 18.0
 *               volume:
 *                 type: number
 *                 example: 45.0
 *               perimeter:
 *                 type: number
 *                 example: 17.0
 *               ceiling_height:
 *                 type: number
 *                 example: 2.5
 *     responses:
 *       200:
 *         description: Параметр успешно обновлён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 room_name:
 *                   type: string
 *                 area:
 *                   type: number
 *                 volume:
 *                   type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const updateParameter = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  const updated = await objectParametersRepository.update(id, req.body, tenantId, userId);

  res.status(StatusCodes.OK).json(updated);
});

/**
 * @swagger
 * /parameters/{id}:
 *   delete:
 *     tags: [Object Parameters]
 *     summary: Удалить параметр помещения
 *     description: Удаляет параметр помещения из сметы
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID параметра помещения
 *     responses:
 *       200:
 *         description: Параметр успешно удалён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Параметр помещения удален"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const deleteParameter = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  await objectParametersRepository.deleteParameter(id, tenantId);

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Параметр помещения удален'
  });
});

/**
 * @swagger
 * /estimates/{estimateId}/parameters/statistics:
 *   get:
 *     tags: [Object Parameters]
 *     summary: Получить статистику по параметрам
 *     description: |
 *       Возвращает суммарные показатели по всем помещениям сметы:
 *       - Общая площадь (м²)
 *       - Общий объём (м³)
 *       - Общий периметр (м)
 *       - Средняя высота потолков (м)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID сметы
 *     responses:
 *       200:
 *         description: Статистика успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_area:
 *                   type: number
 *                   example: 125.5
 *                   description: Общая площадь всех помещений (м²)
 *                 total_volume:
 *                   type: number
 *                   example: 313.75
 *                   description: Общий объём всех помещений (м³)
 *                 total_perimeter:
 *                   type: number
 *                   example: 142.8
 *                   description: Общий периметр всех помещений (м)
 *                 avg_ceiling_height:
 *                   type: number
 *                   example: 2.5
 *                   description: Средняя высота потолков (м)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getStatistics = catchAsync(async (req, res) => {
  const { estimateId } = req.params;
  const tenantId = req.user.tenantId;

  const stats = await objectParametersRepository.getStatistics(estimateId, tenantId);

  res.status(StatusCodes.OK).json(stats);
});
