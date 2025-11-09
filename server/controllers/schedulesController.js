import { StatusCodes } from 'http-status-codes';
import * as schedulesRepository from '../repositories/schedulesRepository.js';

/**
 * @swagger
 * /schedules/generate:
 *   post:
 *     tags: [Schedules]
 *     summary: Сформировать график работ
 *     description: |
 *       Генерирует календарный график выполнения работ на основе сметы.
 *       Автоматически создает записи графика с распределением по фазам (подготовительные, основные, отделочные работы).
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
 *                 description: ID сметы для формирования графика
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: ID проекта
 *     responses:
 *       201:
 *         description: График успешно сформирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "График успешно сформирован"
 *                 schedule:
 *                   type: array
 *                   description: График работ, сгруппированный по фазам
 *                   items:
 *                     type: object
 *                 totalWorks:
 *                   type: integer
 *                   example: 45
 *       400:
 *         description: Отсутствуют обязательные параметры
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function generateSchedule(req, res) {
  try {
    const { estimateId, projectId } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    console.log('[SCHEDULES] Generate request:', { estimateId, projectId, tenantId, userId });

    if (!estimateId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'ID сметы обязателен'
      });
    }

    if (!projectId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'ID проекта обязателен'
      });
    }

    // Генерируем график из сметы
    console.log('[SCHEDULES] Calling generateFromEstimate...');
    const scheduleWorks = await schedulesRepository.generateFromEstimate(
      estimateId,
      projectId,
      tenantId,
      userId
    );
    console.log('[SCHEDULES] Generated works:', scheduleWorks.length);

    // Группируем по фазам для ответа
    const groupedSchedule = schedulesRepository.groupByPhases(scheduleWorks);
    console.log('[SCHEDULES] Grouped into phases:', groupedSchedule.length);

    res.status(StatusCodes.CREATED).json({
      message: 'График успешно сформирован',
      schedule: groupedSchedule,
      totalWorks: scheduleWorks.length
    });

  } catch (error) {
    console.error('[SCHEDULES] Error generating schedule:', error);
    console.error('[SCHEDULES] Error stack:', error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Ошибка при формировании графика',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * @swagger
 * /schedules/estimate/{estimateId}:
 *   get:
 *     tags: [Schedules]
 *     summary: Получить график по ID сметы
 *     description: |
 *       Возвращает календарный график работ для указанной сметы.
 *       График группируется по фазам выполнения работ.
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
 *         description: График успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 schedule:
 *                   type: array
 *                   description: График работ по фазам
 *                   items:
 *                     type: object
 *                     properties:
 *                       phase:
 *                         type: string
 *                         example: "Подготовительные работы"
 *                       works:
 *                         type: array
 *                         items:
 *                           type: object
 *                 totalWorks:
 *                   type: integer
 *                   example: 45
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: График не найден (не был сформирован)
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function getScheduleByEstimate(req, res) {
  try {
    const { estimateId } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    const scheduleWorks = await schedulesRepository.findByEstimateId(estimateId, tenantId, userId);

    if (scheduleWorks.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'График не найден',
        message: 'График для данной сметы еще не сформирован'
      });
    }

    // Группируем по фазам
    const groupedSchedule = schedulesRepository.groupByPhases(scheduleWorks);

    res.status(StatusCodes.OK).json({
      schedule: groupedSchedule,
      totalWorks: scheduleWorks.length
    });

  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Ошибка при получении графика',
      message: error.message
    });
  }
}

/**
 * @swagger
 * /schedules/estimate/{estimateId}:
 *   delete:
 *     tags: [Schedules]
 *     summary: Удалить график работ
 *     description: Удаляет календарный график для указанной сметы
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
 *         description: График успешно удалён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "График успешно удален"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function deleteSchedule(req, res) {
  try {
    const { estimateId } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    const deleted = await schedulesRepository.deleteByEstimateId(estimateId, tenantId, userId);

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'График не найден'
      });
    }

    res.status(StatusCodes.OK).json({
      message: 'График успешно удален'
    });

  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Ошибка при удалении графика',
      message: error.message
    });
  }
}

export default {
  generateSchedule,
  getScheduleByEstimate,
  deleteSchedule
};
