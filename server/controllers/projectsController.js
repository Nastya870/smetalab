/**
 * Projects Controller
 * Контроллер для управления проектами с поддержкой мультитенантности и RLS
 * 
 * CRUD операции:
 * - getAllProjects: Получение списка проектов с пагинацией, поиском, фильтрацией
 * - getProjectById: Получение детальной информации о проекте с командой
 * - createProject: Создание нового проекта (автоматически добавляет создателя в команду)
 * - updateProject: Обновление проекта
 * - deleteProject: Удаление проекта (CASCADE удаляет и команду)
 * - getProjectStats: Статистика по проектам (всего, в работе, завершено и т.д.)
 * 
 * Team Management:
 * - getProjectTeam: Получение команды проекта
 * - addTeamMember: Добавление участника в команду
 * - updateTeamMember: Обновление роли и прав участника
 * - removeTeamMember: Удаление участника из команды
 */

import { catchAsync, BadRequestError, NotFoundError, ConflictError } from '../utils/errors.js';
import projectsRepository from '../repositories/projectsRepository.js';
import dashboardRepository from '../repositories/dashboardRepository.js';


// HTTP Status Codes
const StatusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

/**
 * @swagger
 * /projects:
 *   get:
 *     tags: [Projects]
 *     summary: Получить список проектов
 *     description: Возвращает список проектов с пагинацией, поиском и фильтрацией по статусу. Поддерживает RLS - пользователи видят только проекты своей компании.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по названию, клиенту, подрядчику
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planning, active, completed, on_hold, cancelled]
 *         description: Фильтр по статусу
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 25
 *     responses:
 *       200:
 *         description: Список проектов
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
export const getAllProjects = catchAsync(async (req, res) => {
  const tenantId = req.user?.tenantId || null;
  const isSuperAdmin = req.user?.role === 'super_admin';

  // Extract query parameters
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    search: req.query.search || '',
    status: req.query.status || '',
    startDateFrom: req.query.startDateFrom || '',
    startDateTo: req.query.startDateTo || '',
    endDateFrom: req.query.endDateFrom || '',
    endDateTo: req.query.endDateTo || '',
    sortBy: req.query.sortBy || 'created_at',
    sortOrder: req.query.sortOrder || 'desc'
  };

  const { rows, totalItems } = await projectsRepository.findAll(options, tenantId, isSuperAdmin);

  res.status(StatusCodes.OK).json({
    success: true,
    data: rows,
    pagination: {
      currentPage: options.page,
      totalPages: Math.ceil(totalItems / options.limit),
      totalItems,
      itemsPerPage: options.limit,
      hasNextPage: options.page * options.limit < totalItems,
      hasPreviousPage: options.page > 1
    }
  });
});


/**
 * @swagger
 * /projects/stats:
 *   get:
 *     tags: [Projects]
 *     summary: Статистика по проектам
 *     description: Возвращает количество проектов по статусам
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика получена
 */
export const getProjectStats = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantId;
  const isSuperAdmin = req.user.role === 'super_admin';

  const stats = await projectsRepository.getStats(tenantId, isSuperAdmin);

  res.status(StatusCodes.OK).json({
    success: true,
    data: stats
  });
});


/**
 * Get total profit from all projects' estimates
 * @description Calculates total profit from all estimate items with profit percentages
 */
export const getTotalProfit = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantId || '4eded664-27ac-4d7f-a9d8-f8340751ceab';
  const isSuperAdmin = req.user.role === 'super_admin';

  const profit = await projectsRepository.getTotalProfit(tenantId, isSuperAdmin);

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      totalProfit: profit.totalProfit,
      projectsWithProfit: profit.projectsWithProfit,
      debug: {
        worksProfit: profit.worksProfit,
        materialsProfit: profit.materialsProfit,
        calculationMethod: 'works_profit + materials_profit'
      }
    }
  });
});


/**
 * @swagger
 * /projects/total-income-works:
 *   get:
 *     tags: [Projects]
 *     summary: Получить общий доход от работ (акты заказчика)
 *     description: Возвращает общую сумму доходов от всех актов выполненных работ типа 'client'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Общий доход получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalIncomeWorks:
 *                       type: number
 *                       description: Общий доход от работ
 *                       example: 939157.50
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
export const getTotalIncomeWorks = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantId;
  const isSuperAdmin = req.user.role === 'super_admin';

  const totalIncomeWorks = await projectsRepository.getTotalIncomeWorks(tenantId, isSuperAdmin);

  res.status(StatusCodes.OK).json({
    success: true,
    data: { totalIncomeWorks }
  });
});


/**
 * @swagger
 * /projects/total-income-materials:
 *   get:
 *     tags: [Projects]
 *     summary: Получить общий доход от материалов (планируемые закупки)
 *     description: Возвращает общую сумму доходов от всех планируемых закупок материалов в сметах
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Общий доход от материалов получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalIncomeMaterials:
 *                       type: number
 *                       description: Общий доход от материалов
 *                       example: 2485623.45
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
export const getTotalIncomeMaterials = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantId;
  const isSuperAdmin = req.user.role === 'super_admin';

  const totalIncomeMaterials = await projectsRepository.getTotalIncomeMaterials(tenantId, isSuperAdmin);

  res.status(StatusCodes.OK).json({
    success: true,
    data: { totalIncomeMaterials }
  });
});


/**
 * @swagger
 * /projects/profit-data:
 *   get:
 *     tags: [Projects]
 *     summary: Получить данные прибыльности проектов
 *     description: Возвращает список проектов с расчетами прибыли/убытков для карточки "Прибыльность проектов"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Количество проектов для возврата
 *     responses:
 *       200:
 *         description: Данные прибыльности получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: ID проекта
 *                       name:
 *                         type: string
 *                         description: Название проекта
 *                       status:
 *                         type: string
 *                         description: Статус проекта
 *                       totalProfit:
 *                         type: number
 *                         description: Общая прибыль
 *                       worksProfit:
 *                         type: number
 *                         description: Прибыль от работ
 *                       materialsProfit:
 *                         type: number
 *                         description: Прибыль от материалов
 *                       totalIncome:
 *                         type: number
 *                         description: Общий доход
 *                       totalExpense:
 *                         type: number
 *                         description: Общий расход
 *                       profitPercentage:
 *                         type: number
 *                         description: Процент прибыльности
 *                       isProfit:
 *                         type: boolean
 *                         description: Является ли проект прибыльным
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
export const getProjectsProfitData = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantId;
  const isSuperAdmin = req.user.role === 'super_admin';
  const limit = parseInt(req.query.limit) || 5;

  const projects = await projectsRepository.getProjectsProfitData(limit, tenantId, isSuperAdmin);

  res.status(StatusCodes.OK).json({
    success: true,
    data: projects
  });
});


/**
 * @swagger
 * /projects/monthly-growth-data:
 *   get:
 *     tags: [Projects]
 *     summary: Получить данные месячного роста для графика
 *     description: Возвращает данные по доходам и расходам по месяцам за последние 12 месяцев для графика "Общий рост"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные месячного роста получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     months:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Русские названия месяцев
 *                       example: ["Дек", "Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя"]
 *                     series:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             description: Название серии данных
 *                           data:
 *                             type: array
 *                             items:
 *                               type: number
 *                             description: Значения по месяцам (в тысячах рублей)
 *                       description: Серии данных для графика
 *                       example:
 *                         - name: "Доход (Акты заказчика)"
 *                           data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 787.03, 152.13]
 *                         - name: "Доход (Итого по смете)"
 *                           data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2485.62, 458.32]
 *                         - name: "Расход (Акты специалиста)"
 *                           data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 524.69, 152.13]
 *                         - name: "Расход (Итого закупленно)"
 *                           data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
export const getMonthlyGrowthData = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantId;
  const isSuperAdmin = req.user.role === 'super_admin';

  const data = await projectsRepository.getMonthlyGrowthData(tenantId, isSuperAdmin);

  res.status(StatusCodes.OK).json({
    success: true,
    data
  });
});


/**
 * @swagger
 * /projects/chart-data:
 *   get:
 *     tags: [Projects]
 *     summary: Получить данные для графика "Проекты в работе"
 *     description: |
 *       Возвращает статистику по проектам с группировкой по всем статусам за выбранный период.
 *       Используется для отображения графика с 5 линиями (по одной на каждый статус).
 *       
 *       Статусы проектов:
 *       - planning - Планирование
 *       - approval - Согласование
 *       - in_progress - В работе
 *       - rejected - Отказ
 *       - completed - Завершён
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, year]
 *           default: year
 *         description: |
 *           Период для анализа:
 *           - month: последние 30 дней (по дням)
 *           - year: последние 12 месяцев (по месяцам)
 *     responses:
 *       200:
 *         description: Данные графика получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: string
 *                       enum: [month, year]
 *                       description: Период анализа
 *                       example: "year"
 *                     chartData:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                             description: Период (YYYY-MM для года или YYYY-MM-DD для месяца)
 *                             example: "2025-10"
 *                           monthName:
 *                             type: string
 *                             description: Русское название месяца
 *                             example: "Окт"
 *                           planningProjects:
 *                             type: integer
 *                             description: Количество проектов в статусе "Планирование"
 *                             example: 0
 *                           approvalProjects:
 *                             type: integer
 *                             description: Количество проектов в статусе "Согласование"
 *                             example: 0
 *                           inProgressProjects:
 *                             type: integer
 *                             description: Количество проектов в статусе "В работе"
 *                             example: 1
 *                           rejectedProjects:
 *                             type: integer
 *                             description: Количество проектов в статусе "Отказ"
 *                             example: 0
 *                           completedProjects:
 *                             type: integer
 *                             description: Количество проектов в статусе "Завершён"
 *                             example: 0
 *                           totalProjects:
 *                             type: integer
 *                             description: Общее количество проектов
 *                             example: 1
 *                     months:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Массив русских названий месяцев для оси X графика
 *                       example: ["Дек", "Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя"]
 *             example:
 *               success: true
 *               data:
 *                 period: "year"
 *                 chartData:
 *                   - period: "2024-12"
 *                     monthName: "Дек"
 *                     planningProjects: 0
 *                     approvalProjects: 0
 *                     inProgressProjects: 0
 *                     rejectedProjects: 0
 *                     completedProjects: 0
 *                     totalProjects: 0
 *                   - period: "2025-10"
 *                     monthName: "Окт"
 *                     planningProjects: 0
 *                     approvalProjects: 0
 *                     inProgressProjects: 1
 *                     rejectedProjects: 0
 *                     completedProjects: 0
 *                     totalProjects: 1
 *                   - period: "2025-11"
 *                     monthName: "Ноя"
 *                     planningProjects: 1
 *                     approvalProjects: 0
 *                     inProgressProjects: 2
 *                     rejectedProjects: 0
 *                     completedProjects: 0
 *                     totalProjects: 3
 *                 months: ["Дек", "Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя"]
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
export const getProjectsChartData = catchAsync(async (req, res) => {
  const userId = req.user.userId;
  const tenantId = req.user.tenantId;
  const isSuperAdmin = req.user.role === 'super_admin';
  const { period = 'year' } = req.query; // 'month' or 'year'

  // Get data from repository
  const rows = await projectsRepository.getProjectsChartData(period, tenantId, isSuperAdmin);

  // Format data for frontend (ApexCharts/UI)
  // Logic copied from previous implementation to maintain compatibility
  const chartData = rows.map(row => ({
    period: row.period,
    monthName: row.month_name || row.period,
    planningProjects: parseInt(row.planning_count || 0),
    approvalProjects: parseInt(row.approval_count || 0),
    inProgressProjects: parseInt(row.in_progress_count || 0),
    rejectedProjects: parseInt(row.rejected_count || 0),
    completedProjects: parseInt(row.completed_count || 0),
    totalProjects: parseInt(row.total_count),
    // Fields for backward compatibility
    activeProjects: parseInt(row.in_progress_count || 0),
    inactiveProjects: parseInt(row.total_count) - parseInt(row.in_progress_count || 0)
  }));

  const monthNames = rows.map(row => row.month_name || row.period);

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      period: period,
      chartData: chartData,
      months: monthNames
    }
  });
});

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: Получить проект по ID
 *     description: Возвращает детальную информацию о проекте с командой
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
 *         description: Проект найден
 *       404:
 *         description: Проект не найден
 */
export const getProjectById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId || null;
  const isSuperAdmin = req.user?.role === 'super_admin';

  const project = await projectsRepository.findById(id, tenantId, isSuperAdmin);

  if (!project) {
    throw new NotFoundError('Проект не найден');
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: project
  });
});


/**
 * @swagger
 * /projects:
 *   post:
 *     tags: [Projects]
 *     summary: Создать новый проект
 *     description: Создает проект и автоматически добавляет создателя в команду
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
 *               - client
 *               - contractor
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               client:
 *                 type: string
 *               contractor:
 *                 type: string
 *               address:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Проект создан
 */
export const createProject = catchAsync(async (req, res) => {
  const userId = req.user.userId;
  const tenantId = req.user.tenantId;

  const project = await projectsRepository.create(req.body, tenantId, userId);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Проект успешно создан',
    data: project
  });
});


/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     tags: [Projects]
 *     summary: Обновить проект
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       200:
 *         description: Проект обновлен
 */


/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     tags: [Projects]
 *     summary: Обновить проект
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Проект обновлен
 */
export const updateProject = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  const project = await projectsRepository.update(id, req.body, tenantId);

  if (!project) {
    throw new NotFoundError('Проект не найден или нет прав на редактирование');
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Проект успешно обновлен',
    data: project
  });
});


/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     tags: [Projects]
 *     summary: Удалить проект
 *     description: Удаляет проект (CASCADE удаляет команду)
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
 *         description: Проект удален
 */
export const deleteProject = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  const success = await projectsRepository.remove(id, tenantId);

  if (!success) {
    throw new NotFoundError('Проект не найден или нет прав на удаление');
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Проект успешно удален'
  });
});


/**
 * @swagger
 * /projects/{id}/status:
 *   patch:
 *     tags: [Projects]
 *     summary: Обновить статус проекта
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [planning, active, completed, on_hold, cancelled]
 *     responses:
 *       200:
 *         description: Статус обновлен
 */
export const updateProjectStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const tenantId = req.user.tenantId;

  const project = await projectsRepository.update(id, { status }, tenantId);

  if (!project) {
    throw new NotFoundError('Проект не найден или нет прав на редактирование');
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Статус проекта успешно обновлен',
    data: project
  });
});


/**
 * @swagger
 * /projects/{id}/team:
 *   get:
 *     tags: [Projects]
 *     summary: Получить команду проекта
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
 *         description: Команда получена
 */
export const getProjectTeam = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const isSuperAdmin = req.user.role === 'super_admin';

  const project = await projectsRepository.findById(id, tenantId, isSuperAdmin);

  if (!project) {
    throw new NotFoundError('Проект не найден');
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: project.team
  });
});


/**
 * @swagger
 * /projects/{id}/team:
 *   post:
 *     tags: [Projects]
 *     summary: Добавить участника в команду
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Участник добавлен
 */
export const addTeamMember = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const tenantId = req.user.tenantId;
  const isSuperAdmin = req.user.role === 'super_admin';

  // Проверяем доступ к проекту
  const project = await projectsRepository.findById(id, tenantId, isSuperAdmin);
  if (!project) {
    throw new NotFoundError('Проект не найден');
  }

  // Добавляем участника
  const member = await projectsRepository.addTeamMember(id, req.body, userId, tenantId);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Участник успешно добавлен в команду',
    data: member
  });
});


/**
 * @swagger
 * /projects/{projectId}/team/{userId}:
 *   put:
 *     tags: [Projects]
 *     summary: Обновить роль участника
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Роль обновлена
 */
export const updateTeamMember = catchAsync(async (req, res) => {
  const { id, memberId } = req.params;
  const tenantId = req.user.tenantId;
  const isSuperAdmin = req.user.role === 'super_admin';

  // Проверяем доступ к проекту
  const project = await projectsRepository.findById(id, tenantId, isSuperAdmin);
  if (!project) {
    throw new NotFoundError('Проект не найден');
  }

  const member = await projectsRepository.updateTeamMember(memberId, id, req.body);

  if (!member) {
    throw new NotFoundError('Участник команды не найден');
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Данные участника команды обновлены',
    data: member
  });
});


/**
 * @swagger
 * /projects/{projectId}/team/{userId}:
 *   delete:
 *     tags: [Projects]
 *     summary: Удалить участника из команды
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Участник удален
 */
export const removeTeamMember = catchAsync(async (req, res) => {
  const { id, memberId } = req.params;
  const tenantId = req.user.tenantId;
  const isSuperAdmin = req.user.role === 'super_admin';

  // Проверяем доступ к проекту
  const project = await projectsRepository.findById(id, tenantId, isSuperAdmin);
  if (!project) {
    throw new NotFoundError('Проект не найден');
  }

  const success = await projectsRepository.removeTeamMember(memberId, id);

  if (!success) {
    throw new NotFoundError('Участник команды не найден или уже удален');
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Участник удален из команды проекта'
  });
});

/**
 * @swagger
 * /projects/{id}/calculate-progress:
 *   post:
 *     tags: [Projects]
 *     summary: Автоматический расчет прогресса выполнения проекта
 *     description: Рассчитывает прогресс на основе выполненных работ (completed = true) в таблице work_completions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID проекта
 *     responses:
 *       200:
 *         description: Прогресс успешно рассчитан и обновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 progress:
 *                   type: number
 *                   description: Процент выполнения (0-100)
 *                   example: 5.33
 *                 completedWorks:
 *                   type: integer
 *                   description: Количество выполненных работ
 *                   example: 8
 *                 totalWorks:
 *                   type: integer
 *                   description: Общее количество работ
 *                   example: 200
 *       404:
 *         description: Проект не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
/**
 * @swagger
 * /projects/{id}/calculate-progress:
 *   post:
 *     tags: [Projects]
 *     summary: Рассчитать прогресс выполнения проекта
 *     description: Автоматически рассчитывает процент выполнения проекта на основе завершённых работ во всех сметах проекта
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID проекта
 *     responses:
 *       200:
 *         description: Прогресс успешно рассчитан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 progress:
 *                   type: integer
 *                   description: Процент выполнения (0-100)
 *                   example: 67
 *                 completedWorks:
 *                   type: integer
 *                   description: Количество выполненных работ
 *                   example: 2
 *                 totalWorks:
 *                   type: integer
 *                   description: Общее количество работ
 *                   example: 3
 *                 message:
 *                   type: string
 *                   example: "Прогресс обновлен: 2 из 3 работ выполнено"
 *       404:
 *         description: Проект не найден
 *       500:
 *         description: Ошибка сервера
 */
export const calculateProjectProgress = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const isSuperAdmin = req.user.role === 'super_admin';

  // Проверяем доступ к проекту
  const project = await projectsRepository.findById(id, tenantId, isSuperAdmin);
  if (!project) {
    throw new NotFoundError('Проект не найден');
  }

  const stats = await projectsRepository.calculateProgress(id, tenantId);

  res.status(StatusCodes.OK).json({
    success: true,
    message: `Прогресс обновлен: ${stats.completedWorks} из ${stats.totalWorks} работ выполнено`,
    data: stats
  });
});

/**
 * @swagger
 * /projects/dashboard-summary:
 *   get:
 *     tags: [Projects]
 *     summary: Получить все данные для дашборда за один запрос
 *     description: |
 *       Объединённый endpoint для оптимизации загрузки дашборда.
 *       Возвращает все данные, которые раньше загружались 7 отдельными запросами:
 *       - Общая прибыль (totalProfit)
 *       - Доход от работ (incomeWorks)
 *       - Доход от материалов (incomeMaterials)
 *       - График проектов по месяцам (chartData)
 *       - Данные роста по месяцам (growthData)
 *       - Топ прибыльных проектов (projectsProfitData)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные дашборда получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalProfit:
 *                       type: number
 *                     incomeWorks:
 *                       type: number
 *                     incomeMaterials:
 *                       type: number
 *                     chartDataMonth:
 *                       type: object
 *                     chartDataYear:
 *                       type: object
 *                     growthData:
 *                       type: object
 *                     projectsProfitData:
 *                       type: array
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
export const getDashboardSummary = catchAsync(async (req, res) => {
  const startTime = Date.now();

  const tenantId = req.user.tenantId;
  const isSuperAdmin = req.user.role === 'super_admin';

  // Параметры фильтрации периода
  const period = req.query.period || 'year'; // month, quarter, year, all
  const chartPeriod = req.query.chartPeriod || 'year'; // month, quarter, halfyear, year

  const summary = await dashboardRepository.getSummary(tenantId, isSuperAdmin, period, chartPeriod);

  const duration = Date.now() - startTime;
  console.log(`📊 Dashboard summary loaded in ${duration} ms (repository optimization)`);

  res.status(StatusCodes.OK).json({
    success: true,
    data: summary,
    meta: {
      loadTime: duration,
      timestamp: new Date().toISOString(),
      filters: {
        period,
        chartPeriod
      }
    }
  });
});






/**
 * @swagger
 * /projects/{id}/full-dashboard:
 *   get:
 *     tags: [Projects]
 *     summary: Получить все данные дашборда проекта за один запрос
 *     description: |
 *       Оптимизированный endpoint для страницы проекта.
 *       Возвращает: проект, команду, сметы и финансовую сводку в одном запросе.
 *       Заменяет 4+ отдельных API-запроса + N×2 запросов для каждой сметы.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID проекта
 *     responses:
 *       200:
 *         description: Все данные дашборда проекта
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     project:
 *                       type: object
 *                       description: Данные проекта
 *                     team:
 *                       type: array
 *                       description: Команда проекта
 *                     estimates:
 *                       type: array
 *                       description: Список смет проекта
 *                     financialSummary:
 *                       type: object
 *                       properties:
 *                         incomeWorks:
 *                           type: number
 *                           description: Доход по работам (акты заказчика)
 *                         expenseWorks:
 *                           type: number
 *                           description: Расходы по работам (акты специалистов)
 *                         incomeMaterials:
 *                           type: number
 *                           description: Доход по материалам (план)
 *                         expenseMaterials:
 *                           type: number
 *                           description: Расходы по материалам (факт)
 *       404:
 *         description: Проект не найден
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
export const getProjectFullDashboard = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId || null;
  const isSuperAdmin = req.user?.role === 'super_admin';

  // 1. Get Project
  const project = await projectsRepository.findById(id, tenantId, isSuperAdmin);
  if (!project) {
    throw new NotFoundError('Проект не найден');
  }

  // 2. Get Team
  const teamResult = await projectsRepository.getTeam(id);

  // 3. Get Estimates
  const estimates = await projectsRepository.getEstimates(id);

  // 4. Get Financial Summary
  const financialData = await projectsRepository.getProjectFinancials(id);

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      project,
      team: teamResult.rows,
      estimates,
      financialSummary: {
        incomeWorks: parseFloat(financialData.income_works) || 0,
        expenseWorks: parseFloat(financialData.expense_works) || 0,
        incomeMaterials: parseFloat(financialData.income_materials) || 0,
        expenseMaterials: parseFloat(financialData.expense_materials) || 0
      }
    }
  });
});

export default {
  getAllProjects,
  getProjectStats,
  getTotalProfit,
  getTotalIncomeWorks,
  getTotalIncomeMaterials,
  getProjectsProfitData,
  getMonthlyGrowthData,
  getProjectsChartData,
  getDashboardSummary,
  getProjectById,
  createProject,
  updateProject,
  updateProjectStatus,
  deleteProject,
  getProjectTeam,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  calculateProjectProgress,
  getProjectFullDashboard
};
