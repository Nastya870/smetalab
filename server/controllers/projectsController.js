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

import pool from '../config/database.js';

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
export const getAllProjects = async (req, res) => {
  try {
    // optionalAuth: req.user может быть null если пользователь не авторизован
    const userId = req.user?.userId || null;
    const tenantId = req.user?.tenantId || null;
    const isSuperAdmin = req.user?.role === 'super_admin';

    // Параметры пагинации
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Параметры поиска
    const search = req.query.search || '';
    
    // Параметры фильтрации
    const status = req.query.status || '';
    const startDateFrom = req.query.startDateFrom || '';
    const startDateTo = req.query.startDateTo || '';
    const endDateFrom = req.query.endDateFrom || '';
    const endDateTo = req.query.endDateTo || '';

    // Сортировка
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Строим SQL запрос с использованием расширенного представления
    let query = `
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM project_team_members 
         WHERE project_id = p.id AND left_at IS NULL) as team_size,
        CASE 
          WHEN p.end_date < CURRENT_DATE THEN (CURRENT_DATE - p.end_date)
          ELSE (p.end_date - CURRENT_DATE)
        END as days_remaining,
        CASE WHEN p.end_date < CURRENT_DATE THEN true ELSE false END as is_overdue
      FROM projects p
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    // RLS: Tenant isolation (проекты всегда принадлежат тенанту, глобальных нет)
    if (isSuperAdmin) {
      // Super admin видит все проекты всех тенантов
      // Нет дополнительных фильтров
    } else if (tenantId) {
      // Авторизованный пользователь: только свои проекты
      paramCount++;
      query += ` AND p.tenant_id = $${paramCount}`;
      params.push(tenantId);
    } else {
      // Неавторизованный пользователь: не видит проектов (всегда false)
      query += ` AND FALSE`;
    }

    // Поиск по названию, объекту, клиенту, подрядчику
    if (search) {
      paramCount++;
      query += ` AND (
        p.name ILIKE $${paramCount} OR 
        p.object_name ILIKE $${paramCount} OR
        p.client ILIKE $${paramCount} OR
        p.contractor ILIKE $${paramCount} OR
        p.address ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    // Фильтр по статусу
    if (status) {
      paramCount++;
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    // Фильтр по дате начала
    if (startDateFrom) {
      paramCount++;
      query += ` AND p.start_date >= $${paramCount}`;
      params.push(startDateFrom);
    }
    if (startDateTo) {
      paramCount++;
      query += ` AND p.start_date <= $${paramCount}`;
      params.push(startDateTo);
    }

    // Фильтр по дате окончания
    if (endDateFrom) {
      paramCount++;
      query += ` AND p.end_date >= $${paramCount}`;
      params.push(endDateFrom);
    }
    if (endDateTo) {
      paramCount++;
      query += ` AND p.end_date <= $${paramCount}`;
      params.push(endDateTo);
    }

    // Подсчет общего количества
    const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0]?.count || 0);

    // Добавляем сортировку и пагинацию
    const validSortFields = [
      'name', 'object_name', 'client', 'contractor', 
      'status', 'progress', 'start_date', 'end_date', 
      'budget', 'actual_cost', 'created_at', 'updated_at'
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    
    query += ` ORDER BY p.${sortField} ${sortOrder}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(StatusCodes.OK).json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page * limit < totalItems,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error in getAllProjects:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при получении списка проектов',
      error: error.message
    });
  }
};

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
export const getProjectStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';

    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'planning') as planning,
        COUNT(*) FILTER (WHERE status = 'approval') as approval,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(SUM(actual_cost), 0) as total_actual_cost,
        COALESCE(AVG(progress), 0) as average_progress,
        COUNT(*) FILTER (WHERE end_date < CURRENT_DATE AND status NOT IN ('completed', 'rejected')) as overdue
      FROM projects
      WHERE 1=1
    `;

    const params = [];
    if (!isSuperAdmin) {
      query += ` AND tenant_id = $1`;
      params.push(tenantId);
    }

    const result = await pool.query(query, params);
    const stats = result.rows[0];

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        total: parseInt(stats.total),
        planning: parseInt(stats.planning),
        approval: parseInt(stats.approval),
        inProgress: parseInt(stats.in_progress),
        rejected: parseInt(stats.rejected),
        completed: parseInt(stats.completed),
        overdue: parseInt(stats.overdue),
        totalBudget: parseFloat(stats.total_budget),
        totalActualCost: parseFloat(stats.total_actual_cost),
        averageProgress: parseFloat(stats.average_progress).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error in getProjectStats:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при получении статистики проектов',
      error: error.message
    });
  }
};

/**
 * Get total profit from all projects' estimates
 * @description Calculates total profit from all estimate items with profit percentages
 */
export const getTotalProfit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || '4eded664-27ac-4d7f-a9d8-f8340751ceab'; // Fallback для тестирования
    const isSuperAdmin = req.user.role === 'super_admin';

    let query = `
      WITH project_profits AS (
        -- Прибыль по работам (акты заказчика - акты специалиста)
        SELECT 
          p.id as project_id,
          COALESCE(
            (SELECT SUM(wca.total_amount) FROM work_completion_acts wca WHERE wca.estimate_id = e.id AND wca.act_type = 'client'), 0
          ) - COALESCE(
            (SELECT SUM(wca.total_amount) FROM work_completion_acts wca WHERE wca.estimate_id = e.id AND wca.act_type = 'specialist'), 0
          ) as works_profit,
          
          -- Прибыль по материалам (план - факт закупок)  
          COALESCE(
            (SELECT SUM(pur.total_price) FROM purchases pur WHERE pur.estimate_id = e.id AND pur.total_price IS NOT NULL), 0
          ) - COALESCE(
            (SELECT SUM(gp.total_price) FROM global_purchases gp WHERE gp.estimate_id = e.id AND gp.total_price IS NOT NULL), 0
          ) as materials_profit
          
        FROM projects p
        JOIN estimates e ON p.id = e.project_id
        WHERE 1=1
    `;

    const params = [];
    if (!isSuperAdmin) {
      query += ` AND p.tenant_id = $${params.length + 1}`;
      params.push(tenantId);
    }

    query += `
      )
      SELECT 
        COALESCE(SUM(works_profit + materials_profit), 0) as total_profit,
        COUNT(DISTINCT project_id) as projects_with_profit,
        SUM(works_profit) as sum_works_profit,
        SUM(materials_profit) as sum_materials_profit
      FROM project_profits
    `;

    console.log('🔍 Debug getTotalProfit SQL:', query);
    console.log('🔍 Debug getTotalProfit params:', params);

    const result = await pool.query(query, params);
    const data = result.rows[0];

    console.log('🔍 Debug getTotalProfit SQL result:', data);
    console.log('📊 Calculated total profit:', parseFloat(data.total_profit) || 0);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        totalProfit: parseFloat(data.total_profit) || 0,
        projectsWithProfit: parseInt(data.projects_with_profit) || 0,
        debug: {
          worksProfit: parseFloat(data.sum_works_profit) || 0,
          materialsProfit: parseFloat(data.sum_materials_profit) || 0,
          calculationMethod: 'works_profit + materials_profit (like FinancialSummaryChart)'
        }
      }
    });
  } catch (error) {
    console.error('Error in getTotalProfit:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при получении общей прибыли',
      error: error.message
    });
  }
};

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
export const getTotalIncomeWorks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';

    let query = `
      SELECT 
        COALESCE(SUM(wca.total_amount), 0) as total_income_works
      FROM work_completion_acts wca
      JOIN estimates e ON wca.estimate_id = e.id
      JOIN projects p ON e.project_id = p.id
      WHERE wca.act_type = 'client'
    `;

    const params = [];
    if (!isSuperAdmin) {
      query += ` AND p.tenant_id = $${params.length + 1}`;
      params.push(tenantId);
    }

    console.log('🔍 Debug getTotalIncomeWorks SQL:', query);
    console.log('🔍 Debug getTotalIncomeWorks params:', params);

    const result = await pool.query(query, params);
    const data = result.rows[0];

    console.log('🔍 Debug getTotalIncomeWorks SQL result:', data);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        totalIncomeWorks: parseFloat(data.total_income_works) || 0
      }
    });
  } catch (error) {
    console.error('Error in getTotalIncomeWorks:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при получении общего дохода по работам',
      error: error.message
    });
  }
};

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
export const getTotalIncomeMaterials = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';

    let query = `
      SELECT 
        COALESCE(SUM(p.total_price), 0) as total_income_materials
      FROM purchases p
      JOIN estimates e ON p.estimate_id = e.id
      JOIN projects pr ON e.project_id = pr.id
      WHERE p.total_price IS NOT NULL
    `;

    const params = [];
    if (!isSuperAdmin) {
      query += ` AND pr.tenant_id = $${params.length + 1}`;
      params.push(tenantId);
    }

    console.log('🔍 Debug getTotalIncomeMaterials SQL:', query);
    console.log('🔍 Debug getTotalIncomeMaterials params:', params);

    const result = await pool.query(query, params);
    const data = result.rows[0];

    console.log('🔍 Debug getTotalIncomeMaterials SQL result:', data);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        totalIncomeMaterials: parseFloat(data.total_income_materials) || 0
      }
    });
  } catch (error) {
    console.error('Error in getTotalIncomeMaterials:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при получении общего дохода по материалам',
      error: error.message
    });
  }
};

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
export const getProjectsProfitData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';
    const limit = parseInt(req.query.limit) || 5; // Ограничиваем количество проектов

    let query = `
      WITH project_financials AS (
        SELECT 
          p.id,
          p.name,
          p.status,
          p.created_at,
          
          -- Доходы от работ (акты заказчика)
          COALESCE(
            (SELECT SUM(wca.total_amount) 
             FROM work_completion_acts wca 
             JOIN estimates e ON wca.estimate_id = e.id 
             WHERE e.project_id = p.id AND wca.act_type = 'client'), 0
          ) as income_works,
          
          -- Расходы на работы (акты специалистов)
          COALESCE(
            (SELECT SUM(wca.total_amount) 
             FROM work_completion_acts wca 
             JOIN estimates e ON wca.estimate_id = e.id 
             WHERE e.project_id = p.id AND wca.act_type = 'specialist'), 0
          ) as expense_works,
          
          -- Доходы от материалов (планируемые в смете)
          COALESCE(
            (SELECT SUM(pur.total_price) 
             FROM purchases pur 
             JOIN estimates e ON pur.estimate_id = e.id 
             WHERE e.project_id = p.id AND pur.total_price IS NOT NULL), 0
          ) as income_materials,
          
          -- Расходы на материалы (фактические закупки)
          COALESCE(
            (SELECT SUM(gp.total_price) 
             FROM global_purchases gp 
             JOIN estimates e ON gp.estimate_id = e.id 
             WHERE e.project_id = p.id AND gp.total_price IS NOT NULL), 0
          ) as expense_materials
          
        FROM projects p
        WHERE 1=1
    `;

    const params = [];
    if (!isSuperAdmin) {
      query += ` AND p.tenant_id = $${params.length + 1}`;
      params.push(tenantId);
    }

    query += `
      )
      SELECT 
        id,
        name,
        status,
        (income_works - expense_works) as works_profit,
        (income_materials - expense_materials) as materials_profit,
        (income_works - expense_works + income_materials - expense_materials) as total_profit,
        income_works + income_materials as total_income,
        expense_works + expense_materials as total_expense,
        
        -- Вычисляем процент прибыльности
        CASE 
          WHEN (income_works + income_materials) > 0 
          THEN ROUND(((income_works - expense_works + income_materials - expense_materials) / (income_works + income_materials) * 100)::numeric, 1)
          ELSE 0 
        END as profit_percentage
        
      FROM project_financials
      WHERE (income_works + income_materials) > 0  -- Только проекты с доходами
      ORDER BY total_profit DESC
      LIMIT $${params.length + 1}
    `;

    params.push(limit);

    console.log('🔍 Debug getProjectsProfitData SQL:', query);
    console.log('🔍 Debug getProjectsProfitData params:', params);

    const result = await pool.query(query, params);
    const projects = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      totalProfit: parseFloat(row.total_profit) || 0,
      worksProfit: parseFloat(row.works_profit) || 0,
      materialsProfit: parseFloat(row.materials_profit) || 0,
      totalIncome: parseFloat(row.total_income) || 0,
      totalExpense: parseFloat(row.total_expense) || 0,
      profitPercentage: parseFloat(row.profit_percentage) || 0,
      isProfit: parseFloat(row.total_profit) > 0
    }));

    console.log('🔍 Debug getProjectsProfitData result:', projects);

    res.status(StatusCodes.OK).json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Error in getProjectsProfitData:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при получении данных прибыли проектов',
      error: error.message
    });
  }
};

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
export const getMonthlyGrowthData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';

    let query = `
      WITH month_series AS (
        -- Генерируем серию месяцев: 11 предыдущих + текущий месяц = 12 месяцев
        SELECT 
          generate_series(
            DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
            DATE_TRUNC('month', CURRENT_DATE),
            INTERVAL '1 month'
          )::date AS month_date
      ),
      monthly_data AS (
        -- Добавляем русские названия месяцев
        SELECT 
          ms.month_date,
          CASE TO_CHAR(ms.month_date, 'Mon')
            WHEN 'Jan' THEN 'Янв'
            WHEN 'Feb' THEN 'Фев'
            WHEN 'Mar' THEN 'Мар'
            WHEN 'Apr' THEN 'Апр'
            WHEN 'May' THEN 'Май'
            WHEN 'Jun' THEN 'Июн'
            WHEN 'Jul' THEN 'Июл'
            WHEN 'Aug' THEN 'Авг'
            WHEN 'Sep' THEN 'Сен'
            WHEN 'Oct' THEN 'Окт'
            WHEN 'Nov' THEN 'Ноя'
            WHEN 'Dec' THEN 'Дек'
          END AS month_name
        FROM month_series ms
      ),
      acts_client AS (
        -- Доход (Акты заказчика) по месяцам
        SELECT 
          DATE_TRUNC('month', wca.act_date) AS month_date,
          COALESCE(SUM(wca.total_amount), 0) AS amount
        FROM work_completion_acts wca
        JOIN estimates e ON wca.estimate_id = e.id
        JOIN projects p ON e.project_id = p.id
        WHERE wca.act_type = 'client' 
        AND wca.act_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
        GROUP BY DATE_TRUNC('month', wca.act_date)
      ),

      acts_specialist AS (
        -- Расход (Акты специалиста) по месяцам
        SELECT 
          DATE_TRUNC('month', wca.act_date) AS month_date,
          COALESCE(SUM(wca.total_amount), 0) AS amount
        FROM work_completion_acts wca
        JOIN estimates e ON wca.estimate_id = e.id
        JOIN projects p ON e.project_id = p.id
        WHERE wca.act_type = 'specialist'
        AND wca.act_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
        GROUP BY DATE_TRUNC('month', wca.act_date)
      ),
      estimates_total AS (
        -- Доход (Итого по смете) по месяцам
        SELECT 
          DATE_TRUNC('month', pur.created_at) AS month_date,
          COALESCE(SUM(pur.total_price), 0) AS amount
        FROM purchases pur
        JOIN estimates e ON pur.estimate_id = e.id
        JOIN projects p ON e.project_id = p.id
        WHERE pur.total_price IS NOT NULL
        AND pur.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
        GROUP BY DATE_TRUNC('month', pur.created_at)
      ),
      global_purchases AS (
        -- Расход (Итого закупленно) по месяцам
        SELECT 
          DATE_TRUNC('month', gp.created_at) AS month_date,
          COALESCE(SUM(gp.total_price), 0) AS amount
        FROM global_purchases gp
        JOIN estimates e ON gp.estimate_id = e.id
        JOIN projects p ON e.project_id = p.id
        WHERE gp.total_price IS NOT NULL
        AND gp.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
        GROUP BY DATE_TRUNC('month', gp.created_at)
      )
      SELECT 
        md.month_date,
        md.month_name,
        COALESCE(ac.amount, 0) as client_acts,
        COALESCE(et.amount, 0) as estimates_total,
        COALESCE(asp.amount, 0) as specialist_acts,
        COALESCE(gp.amount, 0) as global_purchases
      FROM monthly_data md
      LEFT JOIN acts_client ac ON md.month_date = ac.month_date
      LEFT JOIN estimates_total et ON md.month_date = et.month_date
      LEFT JOIN acts_specialist asp ON md.month_date = asp.month_date
      LEFT JOIN global_purchases gp ON md.month_date = gp.month_date
      ORDER BY md.month_date
    `;

    const params = [];
    if (!isSuperAdmin) {
      params.push(tenantId);
    }

    console.log('🔍 Debug getMonthlyGrowthData SQL:', query);
    console.log('🔍 Debug getMonthlyGrowthData params:', params);

    const result = await pool.query(query, params);

    // Дополнительная отладка - проверим что у нас в данных
    console.log('🔍 Raw monthly data:', result.rows.map(row => ({
      month: row.month_name,
      date: row.month_date,
      client_acts: row.client_acts,
      estimates_total: row.estimates_total,
      specialist_acts: row.specialist_acts,
      global_purchases: row.global_purchases
    })));

    // Проверим конкретно октябрьские записи 2025
    const octoberCheck = await pool.query(`
      SELECT wca.act_type, wca.act_date, wca.total_amount, wca.act_number
      FROM work_completion_acts wca
      JOIN estimates e ON wca.estimate_id = e.id
      JOIN projects p ON e.project_id = p.id
      WHERE DATE_TRUNC('month', wca.act_date) = '2025-10-01'::date
      ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
      ORDER BY wca.act_date
    `, params);
    
    console.log('🔍 October 2025 acts:', octoberCheck.rows);

    // Преобразуем данные в формат для ApexCharts
    const monthNames = result.rows.map(row => row.month_name);
    const clientActsData = result.rows.map(row => parseFloat(row.client_acts) / 1000); // Конвертируем в тысячи
    const estimatesTotalData = result.rows.map(row => parseFloat(row.estimates_total) / 1000);
    const specialistActsData = result.rows.map(row => parseFloat(row.specialist_acts) / 1000);
    const globalPurchasesData = result.rows.map(row => parseFloat(row.global_purchases) / 1000);

    const chartData = {
      months: monthNames,
      series: [
        { name: 'Доход (Акты заказчика)', data: clientActsData },
        { name: 'Доход (Итого по смете)', data: estimatesTotalData },
        { name: 'Расход (Акты специалиста)', data: specialistActsData },
        { name: 'Расход (Итого закупленно)', data: globalPurchasesData }
      ]
    };

    console.log('🔍 Debug getMonthlyGrowthData result:', chartData);

    res.status(StatusCodes.OK).json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Error in getMonthlyGrowthData:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при получении данных роста по месяцам',
      error: error.message
    });
  }
};

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
export const getProjectsChartData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';
    const { period = 'year' } = req.query; // 'month' or 'year'

    let query, timeFormat, interval;
    
    if (period === 'month') {
      // Last 30 days by days - показываем количество проектов по каждому статусу
      timeFormat = 'YYYY-MM-DD';
      interval = '30 days';
      query = `
        WITH date_series AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '30 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS period_date
        )
        SELECT 
          TO_CHAR(ds.period_date, 'YYYY-MM-DD') as period,
          TO_CHAR(ds.period_date, 'DD Mon') as month_name,
          ds.period_date,
          (
            SELECT COUNT(*)
            FROM projects p 
            WHERE p.status = 'planning'
            AND p.created_at::date <= ds.period_date
            AND (p.end_date IS NULL OR p.end_date >= ds.period_date)
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ) as planning_count,
          (
            SELECT COUNT(*)
            FROM projects p 
            WHERE p.status = 'approval'
            AND p.created_at::date <= ds.period_date
            AND (p.end_date IS NULL OR p.end_date >= ds.period_date)
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ) as approval_count,
          (
            SELECT COUNT(*)
            FROM projects p 
            WHERE p.status = 'in_progress'
            AND p.created_at::date <= ds.period_date
            AND (p.end_date IS NULL OR p.end_date >= ds.period_date)
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ) as in_progress_count,
          (
            SELECT COUNT(*)
            FROM projects p 
            WHERE p.status = 'rejected'
            AND p.created_at::date <= ds.period_date
            AND (p.end_date IS NULL OR p.end_date >= ds.period_date)
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ) as rejected_count,
          (
            SELECT COUNT(*)
            FROM projects p 
            WHERE p.status = 'completed'
            AND p.created_at::date <= ds.period_date
            AND (p.end_date IS NULL OR p.end_date >= ds.period_date)
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ) as completed_count,
          (
            SELECT COUNT(*)
            FROM projects p 
            WHERE p.created_at::date <= ds.period_date
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ) as total_count
        FROM date_series ds
      `;
    } else {
      // Last 12 months by months - показываем количество проектов по каждому статусу
      timeFormat = 'YYYY-MM';
      interval = '12 months';
      query = `
        WITH month_series AS (
          SELECT generate_series(
            DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months'),
            DATE_TRUNC('month', CURRENT_DATE),
            INTERVAL '1 month'
          )::date AS period_date
        )
        SELECT 
          TO_CHAR(ms.period_date, 'YYYY-MM') as period,
          CASE TO_CHAR(ms.period_date, 'Mon')
            WHEN 'Jan' THEN 'Янв'
            WHEN 'Feb' THEN 'Фев'
            WHEN 'Mar' THEN 'Мар'
            WHEN 'Apr' THEN 'Апр'
            WHEN 'May' THEN 'Май'
            WHEN 'Jun' THEN 'Июн'
            WHEN 'Jul' THEN 'Июл'
            WHEN 'Aug' THEN 'Авг'
            WHEN 'Sep' THEN 'Сен'
            WHEN 'Oct' THEN 'Окт'
            WHEN 'Nov' THEN 'Ноя'
            WHEN 'Dec' THEN 'Дек'
          END AS month_name,
          ms.period_date,
          (
            SELECT COUNT(*)
            FROM projects p 
            WHERE p.status = 'planning'
            AND DATE_TRUNC('month', p.created_at) <= ms.period_date
            AND (p.end_date IS NULL OR DATE_TRUNC('month', p.end_date) >= ms.period_date)
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ) as planning_count,
          (
            SELECT COUNT(*)
            FROM projects p 
            WHERE p.status = 'approval'
            AND DATE_TRUNC('month', p.created_at) <= ms.period_date
            AND (p.end_date IS NULL OR DATE_TRUNC('month', p.end_date) >= ms.period_date)
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ) as approval_count,
          (
            SELECT COUNT(*)
            FROM projects p 
            WHERE p.status = 'in_progress'
            AND DATE_TRUNC('month', p.created_at) <= ms.period_date
            AND (p.end_date IS NULL OR DATE_TRUNC('month', p.end_date) >= ms.period_date)
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ) as in_progress_count,
          (
            SELECT COUNT(*)
            FROM projects p 
            WHERE p.status = 'rejected'
            AND DATE_TRUNC('month', p.created_at) <= ms.period_date
            AND (p.end_date IS NULL OR DATE_TRUNC('month', p.end_date) >= ms.period_date)
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ) as rejected_count,
          (
            SELECT COUNT(*)
            FROM projects p 
            WHERE p.status = 'completed'
            AND DATE_TRUNC('month', p.created_at) <= ms.period_date
            AND (p.end_date IS NULL OR DATE_TRUNC('month', p.end_date) >= ms.period_date)
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ) as completed_count,
          (
            SELECT COUNT(*)
            FROM projects p 
            WHERE DATE_TRUNC('month', p.created_at) <= ms.period_date
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ) as total_count
        FROM month_series ms
      `;
    }

    const params = [];
    if (!isSuperAdmin) {
      params.push(tenantId);
    }

    query += `
      ORDER BY period_date
    `;

    const result = await pool.query(query, params);
    
    console.log('🔍 Debug getProjectsChartData SQL result sample:', result.rows.slice(-3));
    
    // Получаем информацию о всех проектах для отладки
    const debugProjectsQuery = `
      SELECT id, name, status, created_at, end_date, tenant_id
      FROM projects 
      ${!isSuperAdmin ? 'WHERE tenant_id = $1' : ''}
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const debugResult = await pool.query(debugProjectsQuery, !isSuperAdmin ? [tenantId] : []);
    console.log('🔍 Debug: All projects in database:', debugResult.rows);
    
    const chartData = result.rows.map(row => ({
      period: row.period,
      monthName: row.month_name || row.period, // Используем русское название если есть
      planningProjects: parseInt(row.planning_count || 0),
      approvalProjects: parseInt(row.approval_count || 0),
      inProgressProjects: parseInt(row.in_progress_count || row.active_count || 0),
      rejectedProjects: parseInt(row.rejected_count || 0),
      completedProjects: parseInt(row.completed_count || 0),
      totalProjects: parseInt(row.total_count),
      // Для обратной совместимости (старые графики используют эти поля)
      activeProjects: parseInt(row.in_progress_count || row.active_count || 0),
      inactiveProjects: parseInt(row.total_count) - parseInt(row.in_progress_count || row.active_count || 0)
    }));

    console.log('📊 Chart data sample (last 3):', chartData.slice(-3));

    // Извлекаем массив названий месяцев для графика
    const monthNames = result.rows.map(row => row.month_name || row.period);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        period: period,
        chartData: chartData,
        months: monthNames // Добавляем массив русских названий месяцев
      }
    });
  } catch (error) {
    console.error('Error in getProjectsChartData:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при получении данных графика проектов',
      error: error.message
    });
  }
};

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
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || null;
    const tenantId = req.user?.tenantId || null;
    const isSuperAdmin = req.user?.role === 'super_admin';

    // Получаем проект с использованием расширенного представления
    let query = `
      SELECT 
        p.*,
        t.name as tenant_name,
        creator.full_name as created_by_name,
        updater.full_name as updated_by_name,
        manager.full_name as manager_name,
        manager.email as manager_email,
        (SELECT COUNT(*) FROM project_team_members 
         WHERE project_id = p.id AND left_at IS NULL) as team_size,
        CASE 
          WHEN p.end_date < CURRENT_DATE THEN (CURRENT_DATE - p.end_date)
          ELSE (p.end_date - CURRENT_DATE)
        END as days_remaining,
        CASE WHEN p.end_date < CURRENT_DATE THEN true ELSE false END as is_overdue
      FROM projects p
      LEFT JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN users creator ON p.created_by = creator.id
      LEFT JOIN users updater ON p.updated_by = updater.id
      LEFT JOIN users manager ON p.manager_id = manager.id
      WHERE p.id = $1
    `;

    const params = [id];
    
    // Tenant isolation (проекты всегда принадлежат тенанту, глобальных нет)
    if (isSuperAdmin) {
      // Super admin видит все проекты
    } else if (tenantId) {
      // Авторизованный пользователь: только свои проекты
      query += ` AND p.tenant_id = $2`;
      params.push(tenantId);
    } else {
      // Неавторизованный пользователь: не видит проектов
      query += ` AND FALSE`;
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Проект не найден'
      });
    }

    // Получаем команду проекта
    const teamQuery = `
      SELECT 
        ptm.*,
        u.full_name,
        u.email
      FROM project_team_members ptm
      JOIN users u ON ptm.user_id = u.id
      WHERE ptm.project_id = $1 AND ptm.left_at IS NULL
      ORDER BY ptm.joined_at DESC
    `;
    const teamResult = await pool.query(teamQuery, [id]);

    const project = result.rows[0];
    project.team = teamResult.rows;

    res.status(StatusCodes.OK).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error in getProjectById:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при получении проекта',
      error: error.message
    });
  }
};

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
export const createProject = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const {
      name,
      objectName,
      client,
      contractor,
      address,
      startDate,
      endDate,
      status = 'planning',
      progress = 0,
      budget = 0,
      actualCost = 0,
      managerId,
      description
    } = req.body;

    // Валидация обязательных полей
    if (!objectName || !client || !contractor || !address) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Обязательные поля: objectName, client, contractor, address'
      });
    }

    // Валидация дат (только если обе указаны)
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Дата начала должна быть раньше даты окончания'
      });
    }

    // Если name не указан, используем objectName
    const projectName = name || objectName;

    // Номер договора будет NULL при создании проекта
    // Он будет заполнен автоматически при создании договора в таблице contracts
    const query = `
      INSERT INTO projects (
        tenant_id, name, object_name, client, contractor, address,
        start_date, end_date, status, progress, budget, actual_cost,
        created_by, updated_by, manager_id, description, contract_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const params = [
      tenantId,
      projectName,
      objectName,
      client,
      contractor,
      address,
      startDate || null, // NULL если пустая строка или undefined
      endDate || null,   // NULL если пустая строка или undefined
      status,
      progress,
      budget,
      actualCost,
      userId, // created_by
      userId, // updated_by
      managerId || userId, // manager_id (по умолчанию создатель)
      description || null,
      null // contract_number - будет заполнен при создании договора
    ];

    const result = await pool.query(query, params);
    const newProject = result.rows[0];

    // Триггер add_creator_to_team автоматически добавит создателя в команду

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Проект успешно создан',
      data: newProject
    });
  } catch (error) {
    console.error('Error in createProject:', error);
    
    // Обработка специфичных ошибок PostgreSQL
    if (error.code === '23503') { // Foreign key violation
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Указан несуществующий пользователь или тенант'
      });
    }
    
    if (error.code === '23514') { // Check constraint violation
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Некорректные значения полей (проверьте progress, budget, даты)'
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при создании проекта',
      error: error.message
    });
  }
};

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
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';

    // Проверяем, существует ли проект и есть ли права на редактирование
    let checkQuery = `SELECT * FROM projects WHERE id = $1`;
    const checkParams = [id];
    
    if (!isSuperAdmin) {
      checkQuery += ` AND tenant_id = $2`;
      checkParams.push(tenantId);
    }

    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Проект не найден или нет прав на редактирование'
      });
    }

    const {
      name,
      objectName,
      client,
      contractor,
      address,
      startDate,
      endDate,
      status,
      progress,
      budget,
      actualCost,
      managerId,
      description
    } = req.body;

    // Валидация дат если они обновляются
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Дата начала должна быть раньше даты окончания'
      });
    }

    // Строим динамический UPDATE запрос
    const updates = [];
    const params = [id];
    let paramCount = 1;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }
    if (objectName !== undefined) {
      paramCount++;
      updates.push(`object_name = $${paramCount}`);
      params.push(objectName);
    }
    if (client !== undefined) {
      paramCount++;
      updates.push(`client = $${paramCount}`);
      params.push(client);
    }
    if (contractor !== undefined) {
      paramCount++;
      updates.push(`contractor = $${paramCount}`);
      params.push(contractor);
    }
    if (address !== undefined) {
      paramCount++;
      updates.push(`address = $${paramCount}`);
      params.push(address);
    }
    if (startDate !== undefined) {
      paramCount++;
      updates.push(`start_date = $${paramCount}`);
      params.push(startDate);
    }
    if (endDate !== undefined) {
      paramCount++;
      updates.push(`end_date = $${paramCount}`);
      params.push(endDate);
    }
    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }
    if (progress !== undefined) {
      paramCount++;
      updates.push(`progress = $${paramCount}`);
      params.push(progress);
    }
    if (budget !== undefined) {
      paramCount++;
      updates.push(`budget = $${paramCount}`);
      params.push(budget);
    }
    if (actualCost !== undefined) {
      paramCount++;
      updates.push(`actual_cost = $${paramCount}`);
      params.push(actualCost);
    }
    if (managerId !== undefined) {
      paramCount++;
      updates.push(`manager_id = $${paramCount}`);
      params.push(managerId);
    }
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }

    if (updates.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Нет данных для обновления'
      });
    }

    // Всегда обновляем updated_by
    paramCount++;
    updates.push(`updated_by = $${paramCount}`);
    params.push(userId);

    const query = `
      UPDATE projects 
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, params);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Проект успешно обновлен',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error in updateProject:', error);
    
    if (error.code === '23503') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Указан несуществующий пользователь'
      });
    }
    
    if (error.code === '23514') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Некорректные значения полей (проверьте progress, budget, даты)'
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при обновлении проекта',
      error: error.message
    });
  }
};

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
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';

    // Проверяем существование и права
    let checkQuery = `SELECT * FROM projects WHERE id = $1`;
    const checkParams = [id];
    
    if (!isSuperAdmin) {
      checkQuery += ` AND tenant_id = $2`;
      checkParams.push(tenantId);
    }

    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Проект не найден или нет прав на удаление'
      });
    }

    // Удаляем проект (CASCADE удалит связанные записи в project_team_members)
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Проект успешно удален'
    });
  } catch (error) {
    console.error('Error in deleteProject:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при удалении проекта',
      error: error.message
    });
  }
};

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
export const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';

    // Валидация статуса
    const validStatuses = ['planning', 'approval', 'in_progress', 'rejected', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Недопустимый статус. Допустимые значения: ' + validStatuses.join(', ')
      });
    }

    // Проверяем существование проекта и права
    let checkQuery = `SELECT * FROM projects WHERE id = $1`;
    const checkParams = [id];
    
    if (!isSuperAdmin) {
      checkQuery += ` AND tenant_id = $2`;
      checkParams.push(tenantId);
    }

    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Проект не найден или нет прав на редактирование'
      });
    }

    // Обновляем только статус
    const updateQuery = `
      UPDATE projects 
      SET 
        status = $1,
        updated_by = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [status, userId, id]);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Статус проекта успешно обновлен',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error in updateProjectStatus:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при обновлении статуса проекта',
      error: error.message
    });
  }
};

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
export const getProjectTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';

    // Проверяем доступ к проекту
    let checkQuery = `SELECT * FROM projects WHERE id = $1`;
    const checkParams = [id];
    
    if (!isSuperAdmin) {
      checkQuery += ` AND tenant_id = $2`;
      checkParams.push(tenantId);
    }

    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Проект не найден'
      });
    }

    // Получаем всех участников команды (включая покинувших)
    const includeLeft = req.query.includeLeft === 'true';
    
    let query = `
      SELECT 
        ptm.*,
        u.full_name,
        u.email
      FROM project_team_members ptm
      JOIN users u ON ptm.user_id = u.id
      WHERE ptm.project_id = $1
    `;

    if (!includeLeft) {
      query += ` AND ptm.left_at IS NULL`;
    }

    query += ` ORDER BY ptm.joined_at DESC`;

    const result = await pool.query(query, [id]);

    res.status(StatusCodes.OK).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error in getProjectTeam:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при получении команды проекта',
      error: error.message
    });
  }
};

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
export const addTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';

    const {
      userId: newUserId,
      role = 'member',
      canEdit = false,
      canViewFinancials = false
    } = req.body;

    if (!newUserId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Обязательное поле: userId'
      });
    }

    // Проверяем доступ к проекту
    let checkQuery = `SELECT * FROM projects WHERE id = $1`;
    const checkParams = [id];
    
    if (!isSuperAdmin) {
      checkQuery += ` AND tenant_id = $2`;
      checkParams.push(tenantId);
    }

    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Проект не найден'
      });
    }

    // Проверяем, не состоит ли пользователь уже в команде
    const memberCheck = await pool.query(
      'SELECT * FROM project_team_members WHERE project_id = $1 AND user_id = $2 AND left_at IS NULL',
      [id, newUserId]
    );

    if (memberCheck.rows.length > 0) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Пользователь уже состоит в команде проекта'
      });
    }

    // Добавляем участника
    const query = `
      INSERT INTO project_team_members (
        project_id, user_id, role, can_edit, can_view_financials, added_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      newUserId,
      role,
      canEdit,
      canViewFinancials,
      userId
    ]);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Участник успешно добавлен в команду',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error in addTeamMember:', error);
    
    if (error.code === '23503') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Указан несуществующий пользователь'
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при добавлении участника в команду',
      error: error.message
    });
  }
};

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
export const updateTeamMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';

    const { role, canEdit, canViewFinancials } = req.body;

    // Проверяем доступ к проекту
    let checkQuery = `SELECT * FROM projects WHERE id = $1`;
    const checkParams = [id];
    
    if (!isSuperAdmin) {
      checkQuery += ` AND tenant_id = $2`;
      checkParams.push(tenantId);
    }

    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Проект не найден'
      });
    }

    // Строим динамический UPDATE
    const updates = [];
    const params = [memberId, id];
    let paramCount = 2;

    if (role !== undefined) {
      paramCount++;
      updates.push(`role = $${paramCount}`);
      params.push(role);
    }
    if (canEdit !== undefined) {
      paramCount++;
      updates.push(`can_edit = $${paramCount}`);
      params.push(canEdit);
    }
    if (canViewFinancials !== undefined) {
      paramCount++;
      updates.push(`can_view_financials = $${paramCount}`);
      params.push(canViewFinancials);
    }

    if (updates.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Нет данных для обновления'
      });
    }

    const query = `
      UPDATE project_team_members 
      SET ${updates.join(', ')}
      WHERE id = $1 AND project_id = $2 AND left_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Участник команды не найден'
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Данные участника команды обновлены',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error in updateTeamMember:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при обновлении участника команды',
      error: error.message
    });
  }
};

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
export const removeTeamMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';

    // Проверяем доступ к проекту
    let checkQuery = `SELECT * FROM projects WHERE id = $1`;
    const checkParams = [id];
    
    if (!isSuperAdmin) {
      checkQuery += ` AND tenant_id = $2`;
      checkParams.push(tenantId);
    }

    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Проект не найден'
      });
    }

    // Soft delete - устанавливаем left_at
    const query = `
      UPDATE project_team_members 
      SET left_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND project_id = $2 AND left_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [memberId, id]);

    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Участник команды не найден или уже удален'
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Участник удален из команды проекта'
    });
  } catch (error) {
    console.error('Error in removeTeamMember:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при удалении участника из команды',
      error: error.message
    });
  }
};

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
export const calculateProjectProgress = async (req, res) => {
  console.log('🔵 calculateProjectProgress called');
  console.log('🔵 Project ID:', req.params.id);
  console.log('🔵 User:', req.user?.email, 'Role:', req.user?.role);
  
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';

    // Проверяем доступ к проекту
    let checkQuery = `SELECT * FROM projects WHERE id = $1`;
    const checkParams = [id];
    
    if (!isSuperAdmin) {
      checkQuery += ` AND tenant_id = $2`;
      checkParams.push(tenantId);
    }

    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      console.log('❌ Project not found or no access');
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Проект не найден'
      });
    }

    console.log('✅ Project found:', checkResult.rows[0].name);

    // Получаем все сметы проекта
    const estimatesQuery = `
      SELECT id FROM estimates 
      WHERE project_id = $1 
      ${!isSuperAdmin ? 'AND tenant_id = $2' : ''}
    `;
    const estimatesResult = await pool.query(estimatesQuery, checkParams);
    
    if (estimatesResult.rows.length === 0) {
      // Если нет смет, прогресс = 0%
      const updateQuery = `
        UPDATE projects 
        SET progress = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING progress
      `;
      const updateResult = await pool.query(updateQuery, [id]);
      
      return res.status(StatusCodes.OK).json({
        success: true,
        progress: 0,
        completedWorks: 0,
        totalWorks: 0,
        message: 'Нет смет в проекте, прогресс установлен в 0%'
      });
    }

    const estimateIds = estimatesResult.rows.map(row => row.id);

    // Подсчитываем общее количество работ и выполненных работ
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT ei.id) as total_works,
        COUNT(DISTINCT CASE WHEN wc.completed = true THEN ei.id END) as completed_works
      FROM estimate_items ei
      LEFT JOIN work_completions wc ON wc.estimate_item_id = ei.id
      WHERE ei.estimate_id = ANY($1)
    `;
    
    console.log('📊 Calculating progress for project:', id);
    console.log('📊 Estimate IDs:', estimateIds);
    
    const statsResult = await pool.query(statsQuery, [estimateIds]);
    const { total_works, completed_works } = statsResult.rows[0];

    console.log('📊 Total works:', total_works);
    console.log('📊 Completed works:', completed_works);

    // Вычисляем процент выполнения
    let progress = 0;
    if (parseInt(total_works) > 0) {
      progress = (parseInt(completed_works) / parseInt(total_works)) * 100;
      // Округляем до целого числа (т.к. поле progress имеет тип INTEGER)
      progress = Math.round(progress);
    }
    
    console.log('📊 Calculated progress:', progress + '%');

    // Обновляем прогресс в проекте
    const updateQuery = `
      UPDATE projects 
      SET progress = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING progress
    `;
    
    await pool.query(updateQuery, [progress, id]);

    res.status(StatusCodes.OK).json({
      success: true,
      progress: progress,
      completedWorks: parseInt(completed_works),
      totalWorks: parseInt(total_works),
      message: `Прогресс обновлен: ${completed_works} из ${total_works} работ выполнено`
    });

  } catch (error) {
    console.error('Error calculating project progress:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при расчете прогресса проекта',
      error: error.message
    });
  }
};

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
export const getDashboardSummary = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.role === 'super_admin';

    // Параллельно выполняем все запросы к БД
    const [
      profitResult,
      incomeWorksResult,
      incomeMaterialsResult,
      chartMonthResult,
      chartYearResult,
      growthResult,
      projectsProfitResult
    ] = await Promise.all([
      // 1. Общая прибыль
      getTotalProfitData(tenantId, isSuperAdmin),
      // 2. Доход от работ
      getIncomeWorksData(tenantId, isSuperAdmin),
      // 3. Доход от материалов
      getIncomeMaterialsData(tenantId, isSuperAdmin),
      // 4. Данные графика за месяц
      getChartDataInternal(tenantId, isSuperAdmin, 'month'),
      // 5. Данные графика за год
      getChartDataInternal(tenantId, isSuperAdmin, 'year'),
      // 6. Данные роста по месяцам
      getMonthlyGrowthInternal(tenantId, isSuperAdmin),
      // 7. Прибыльность проектов
      getProjectsProfitInternal(tenantId, isSuperAdmin, 10)
    ]);

    const duration = Date.now() - startTime;
    console.log(`📊 Dashboard summary loaded in ${duration}ms (single request vs 7 separate)`);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        totalProfit: profitResult,
        incomeWorks: incomeWorksResult,
        incomeMaterials: incomeMaterialsResult,
        chartDataMonth: chartMonthResult,
        chartDataYear: chartYearResult,
        growthData: growthResult,
        projectsProfitData: projectsProfitResult
      },
      meta: {
        loadTime: duration,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in getDashboardSummary:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при загрузке данных дашборда',
      error: error.message
    });
  }
};

// ============= Internal helper functions for getDashboardSummary =============

/**
 * Получить общую прибыль (внутренняя функция)
 */
async function getTotalProfitData(tenantId, isSuperAdmin) {
  let query = `
    WITH project_profits AS (
      SELECT 
        p.id as project_id,
        COALESCE(
          (SELECT SUM(wca.total_amount) FROM work_completion_acts wca WHERE wca.estimate_id = e.id AND wca.act_type = 'client'), 0
        ) - COALESCE(
          (SELECT SUM(wca.total_amount) FROM work_completion_acts wca WHERE wca.estimate_id = e.id AND wca.act_type = 'specialist'), 0
        ) as works_profit,
        COALESCE(
          (SELECT SUM(pur.total_price) FROM purchases pur WHERE pur.estimate_id = e.id AND pur.total_price IS NOT NULL), 0
        ) - COALESCE(
          (SELECT SUM(gp.total_price) FROM global_purchases gp WHERE gp.estimate_id = e.id AND gp.total_price IS NOT NULL), 0
        ) as materials_profit
      FROM projects p
      JOIN estimates e ON p.id = e.project_id
      WHERE 1=1 ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
    )
    SELECT 
      COALESCE(SUM(works_profit + materials_profit), 0) as total_profit,
      COUNT(DISTINCT project_id) as projects_with_profit
    FROM project_profits
  `;

  const params = !isSuperAdmin ? [tenantId] : [];
  const result = await pool.query(query, params);
  
  return {
    totalProfit: parseFloat(result.rows[0].total_profit) || 0,
    projectsWithProfit: parseInt(result.rows[0].projects_with_profit) || 0
  };
}

/**
 * Получить доход от работ (внутренняя функция)
 */
async function getIncomeWorksData(tenantId, isSuperAdmin) {
  let query = `
    SELECT COALESCE(SUM(wca.total_amount), 0) as total_income_works
    FROM work_completion_acts wca
    JOIN estimates e ON wca.estimate_id = e.id
    JOIN projects p ON e.project_id = p.id
    WHERE wca.act_type = 'client'
    ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
  `;

  const params = !isSuperAdmin ? [tenantId] : [];
  const result = await pool.query(query, params);
  
  return parseFloat(result.rows[0].total_income_works) || 0;
}

/**
 * Получить доход от материалов (внутренняя функция)
 */
async function getIncomeMaterialsData(tenantId, isSuperAdmin) {
  let query = `
    SELECT COALESCE(SUM(pur.total_price), 0) as total_income_materials
    FROM purchases pur
    JOIN estimates e ON pur.estimate_id = e.id
    JOIN projects p ON e.project_id = p.id
    WHERE pur.total_price IS NOT NULL
    ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
  `;

  const params = !isSuperAdmin ? [tenantId] : [];
  const result = await pool.query(query, params);
  
  return parseFloat(result.rows[0].total_income_materials) || 0;
}

/**
 * Получить данные графика проектов (внутренняя функция)
 */
async function getChartDataInternal(tenantId, isSuperAdmin, period) {
  const isMonth = period === 'month';
  const interval = isMonth ? '30 days' : '12 months';
  const dateGroup = isMonth ? 'day' : 'month';
  const dateFormat = isMonth ? 'DD Mon' : 'Mon YYYY';
  
  let query;
  
  if (isMonth) {
    // За последние 30 дней
    query = `
      WITH date_series AS (
        SELECT generate_series(
          DATE_TRUNC('day', CURRENT_DATE - INTERVAL '29 days'),
          DATE_TRUNC('day', CURRENT_DATE),
          INTERVAL '1 day'
        )::date AS date_point
      )
      SELECT 
        ds.date_point,
        TO_CHAR(ds.date_point, 'DD') as label,
        COUNT(DISTINCT CASE WHEN p.status = 'planning' THEN p.id END) as planning_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'approval' THEN p.id END) as approval_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'in_progress' THEN p.id END) as in_progress_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'rejected' THEN p.id END) as rejected_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects,
        COUNT(DISTINCT p.id) as total_projects
      FROM date_series ds
      LEFT JOIN projects p ON DATE_TRUNC('day', p.created_at) <= ds.date_point
        ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
      GROUP BY ds.date_point
      ORDER BY ds.date_point
    `;
  } else {
    // За последние 12 месяцев
    query = `
      WITH month_series AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months'),
          DATE_TRUNC('month', CURRENT_DATE),
          INTERVAL '1 month'
        )::date AS month_point
      )
      SELECT 
        ms.month_point,
        CASE TO_CHAR(ms.month_point, 'Mon')
          WHEN 'Jan' THEN 'Янв' WHEN 'Feb' THEN 'Фев' WHEN 'Mar' THEN 'Мар'
          WHEN 'Apr' THEN 'Апр' WHEN 'May' THEN 'Май' WHEN 'Jun' THEN 'Июн'
          WHEN 'Jul' THEN 'Июл' WHEN 'Aug' THEN 'Авг' WHEN 'Sep' THEN 'Сен'
          WHEN 'Oct' THEN 'Окт' WHEN 'Nov' THEN 'Ноя' WHEN 'Dec' THEN 'Дек'
        END as label,
        COUNT(DISTINCT CASE WHEN p.status = 'planning' AND DATE_TRUNC('month', p.created_at) <= ms.month_point THEN p.id END) as planning_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'approval' AND DATE_TRUNC('month', p.created_at) <= ms.month_point THEN p.id END) as approval_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'in_progress' AND DATE_TRUNC('month', p.created_at) <= ms.month_point THEN p.id END) as in_progress_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'rejected' AND DATE_TRUNC('month', p.created_at) <= ms.month_point THEN p.id END) as rejected_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' AND DATE_TRUNC('month', p.created_at) <= ms.month_point THEN p.id END) as completed_projects,
        COUNT(DISTINCT CASE WHEN DATE_TRUNC('month', p.created_at) <= ms.month_point THEN p.id END) as total_projects
      FROM month_series ms
      LEFT JOIN projects p ON 1=1 ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
      GROUP BY ms.month_point
      ORDER BY ms.month_point
    `;
  }

  const params = !isSuperAdmin ? [tenantId] : [];
  const result = await pool.query(query, params);

  return {
    months: result.rows.map(r => r.label),
    chartData: result.rows.map(r => ({
      planningProjects: parseInt(r.planning_projects) || 0,
      approvalProjects: parseInt(r.approval_projects) || 0,
      inProgressProjects: parseInt(r.in_progress_projects) || 0,
      rejectedProjects: parseInt(r.rejected_projects) || 0,
      completedProjects: parseInt(r.completed_projects) || 0,
      totalProjects: parseInt(r.total_projects) || 0
    }))
  };
}

/**
 * Получить данные роста по месяцам (внутренняя функция)
 */
async function getMonthlyGrowthInternal(tenantId, isSuperAdmin) {
  const query = `
    WITH month_series AS (
      SELECT generate_series(
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
        DATE_TRUNC('month', CURRENT_DATE),
        INTERVAL '1 month'
      )::date AS month_date
    ),
    monthly_data AS (
      SELECT 
        ms.month_date,
        CASE TO_CHAR(ms.month_date, 'Mon')
          WHEN 'Jan' THEN 'Янв' WHEN 'Feb' THEN 'Фев' WHEN 'Mar' THEN 'Мар'
          WHEN 'Apr' THEN 'Апр' WHEN 'May' THEN 'Май' WHEN 'Jun' THEN 'Июн'
          WHEN 'Jul' THEN 'Июл' WHEN 'Aug' THEN 'Авг' WHEN 'Sep' THEN 'Сен'
          WHEN 'Oct' THEN 'Окт' WHEN 'Nov' THEN 'Ноя' WHEN 'Dec' THEN 'Дек'
        END as month_name,
        
        -- Доход от актов заказчика
        COALESCE((
          SELECT SUM(wca.total_amount) / 1000.0
          FROM work_completion_acts wca
          JOIN estimates e ON wca.estimate_id = e.id
          JOIN projects p ON e.project_id = p.id
          WHERE wca.act_type = 'client'
            AND DATE_TRUNC('month', wca.created_at) = ms.month_date
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
        ), 0) as income_client_acts,
        
        -- Доход итого по смете
        COALESCE((
          SELECT SUM(pur.total_price) / 1000.0
          FROM purchases pur
          JOIN estimates e ON pur.estimate_id = e.id
          JOIN projects p ON e.project_id = p.id
          WHERE DATE_TRUNC('month', pur.created_at) = ms.month_date
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
        ), 0) as income_estimate,
        
        -- Расход акты специалиста
        COALESCE((
          SELECT SUM(wca.total_amount) / 1000.0
          FROM work_completion_acts wca
          JOIN estimates e ON wca.estimate_id = e.id
          JOIN projects p ON e.project_id = p.id
          WHERE wca.act_type = 'specialist'
            AND DATE_TRUNC('month', wca.created_at) = ms.month_date
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
        ), 0) as expense_specialist_acts,
        
        -- Расход итого закупленно
        COALESCE((
          SELECT SUM(gp.total_price) / 1000.0
          FROM global_purchases gp
          JOIN estimates e ON gp.estimate_id = e.id
          JOIN projects p ON e.project_id = p.id
          WHERE DATE_TRUNC('month', gp.created_at) = ms.month_date
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
        ), 0) as expense_purchases
        
      FROM month_series ms
    )
    SELECT * FROM monthly_data ORDER BY month_date
  `;

  const params = !isSuperAdmin ? [tenantId] : [];
  const result = await pool.query(query, params);

  return {
    months: result.rows.map(r => r.month_name),
    series: [
      { name: 'Доход (Акты заказчика)', data: result.rows.map(r => parseFloat(r.income_client_acts) || 0) },
      { name: 'Доход (Итого по смете)', data: result.rows.map(r => parseFloat(r.income_estimate) || 0) },
      { name: 'Расход (Акты специалиста)', data: result.rows.map(r => parseFloat(r.expense_specialist_acts) || 0) },
      { name: 'Расход (Итого закупленно)', data: result.rows.map(r => parseFloat(r.expense_purchases) || 0) }
    ]
  };
}

/**
 * Получить прибыльность проектов (внутренняя функция)
 */
async function getProjectsProfitInternal(tenantId, isSuperAdmin, limit) {
  let query = `
    WITH project_financials AS (
      SELECT 
        p.id, p.name, p.status,
        COALESCE((SELECT SUM(wca.total_amount) FROM work_completion_acts wca JOIN estimates e ON wca.estimate_id = e.id WHERE e.project_id = p.id AND wca.act_type = 'client'), 0) as income_works,
        COALESCE((SELECT SUM(wca.total_amount) FROM work_completion_acts wca JOIN estimates e ON wca.estimate_id = e.id WHERE e.project_id = p.id AND wca.act_type = 'specialist'), 0) as expense_works,
        COALESCE((SELECT SUM(pur.total_price) FROM purchases pur JOIN estimates e ON pur.estimate_id = e.id WHERE e.project_id = p.id), 0) as income_materials,
        COALESCE((SELECT SUM(gp.total_price) FROM global_purchases gp JOIN estimates e ON gp.estimate_id = e.id WHERE e.project_id = p.id), 0) as expense_materials
      FROM projects p
      WHERE 1=1 ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
    )
    SELECT 
      id, name, status,
      (income_works - expense_works + income_materials - expense_materials) as total_profit,
      income_works + income_materials as total_income,
      CASE 
        WHEN (income_works + income_materials) > 0 
        THEN ROUND(((income_works - expense_works + income_materials - expense_materials) / (income_works + income_materials) * 100)::numeric, 1)
        ELSE 0 
      END as profit_percentage
    FROM project_financials
    WHERE (income_works + income_materials) > 0
    ORDER BY total_profit DESC
    LIMIT ${!isSuperAdmin ? '$2' : '$1'}
  `;

  const params = !isSuperAdmin ? [tenantId, limit] : [limit];
  const result = await pool.query(query, params);

  return result.rows.map(r => ({
    id: r.id,
    name: r.name,
    status: r.status,
    totalProfit: parseFloat(r.total_profit) || 0,
    totalIncome: parseFloat(r.total_income) || 0,
    profitPercentage: parseFloat(r.profit_percentage) || 0,
    isProfit: parseFloat(r.total_profit) > 0
  }));
}

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
export const getProjectFullDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId || null;
    const isSuperAdmin = req.user?.role === 'super_admin';

    // 1. Получаем проект с расширенной информацией
    let projectQuery = `
      SELECT 
        p.*,
        t.name as tenant_name,
        creator.full_name as created_by_name,
        updater.full_name as updated_by_name,
        manager.full_name as manager_name,
        manager.email as manager_email,
        (SELECT COUNT(*) FROM project_team_members 
         WHERE project_id = p.id AND left_at IS NULL) as team_size,
        CASE 
          WHEN p.end_date < CURRENT_DATE THEN (CURRENT_DATE - p.end_date)
          ELSE (p.end_date - CURRENT_DATE)
        END as days_remaining,
        CASE WHEN p.end_date < CURRENT_DATE THEN true ELSE false END as is_overdue
      FROM projects p
      LEFT JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN users creator ON p.created_by = creator.id
      LEFT JOIN users updater ON p.updated_by = updater.id
      LEFT JOIN users manager ON p.manager_id = manager.id
      WHERE p.id = $1
    `;
    
    const projectParams = [id];
    
    // Tenant isolation
    if (isSuperAdmin) {
      // Super admin видит все проекты
    } else if (tenantId) {
      projectQuery += ` AND p.tenant_id = $2`;
      projectParams.push(tenantId);
    } else {
      projectQuery += ` AND FALSE`;
    }

    const projectResult = await pool.query(projectQuery, projectParams);

    if (projectResult.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Проект не найден'
      });
    }

    const project = projectResult.rows[0];

    // 2. Получаем команду проекта
    const teamQuery = `
      SELECT 
        ptm.*,
        u.full_name,
        u.email
      FROM project_team_members ptm
      JOIN users u ON ptm.user_id = u.id
      WHERE ptm.project_id = $1 AND ptm.left_at IS NULL
      ORDER BY ptm.joined_at DESC
    `;
    const teamResult = await pool.query(teamQuery, [id]);

    // 3. Получаем сметы проекта
    const estimatesQuery = `
      SELECT 
        id,
        name,
        status,
        description,
        created_at,
        updated_at
      FROM estimates
      WHERE project_id = $1
      ORDER BY created_at DESC
    `;
    const estimatesResult = await pool.query(estimatesQuery, [id]);

    // 4. Получаем финансовую сводку для ВСЕХ смет проекта одним запросом
    const financialQuery = `
      SELECT 
        -- Доходы от работ (акты заказчика)
        COALESCE(
          (SELECT SUM(wca.total_amount) 
           FROM work_completion_acts wca 
           JOIN estimates e ON wca.estimate_id = e.id 
           WHERE e.project_id = $1 AND wca.act_type = 'client'), 0
        ) as income_works,
        
        -- Расходы на работы (акты специалистов)
        COALESCE(
          (SELECT SUM(wca.total_amount) 
           FROM work_completion_acts wca 
           JOIN estimates e ON wca.estimate_id = e.id 
           WHERE e.project_id = $1 AND wca.act_type = 'specialist'), 0
        ) as expense_works,
        
        -- Доходы от материалов (планируемые - total из purchases)
        COALESCE(
          (SELECT SUM(pur.total_price) 
           FROM purchases pur 
           JOIN estimates e ON pur.estimate_id = e.id 
           WHERE e.project_id = $1 AND pur.total_price IS NOT NULL), 0
        ) as income_materials,
        
        -- Расходы на материалы (фактические - из global_purchases)
        COALESCE(
          (SELECT SUM(gp.total_price) 
           FROM global_purchases gp 
           JOIN estimates e ON gp.estimate_id = e.id 
           WHERE e.project_id = $1 AND gp.total_price IS NOT NULL), 0
        ) as expense_materials
    `;
    const financialResult = await pool.query(financialQuery, [id]);
    const financialData = financialResult.rows[0];

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        project,
        team: teamResult.rows,
        estimates: estimatesResult.rows,
        financialSummary: {
          incomeWorks: parseFloat(financialData.income_works) || 0,
          expenseWorks: parseFloat(financialData.expense_works) || 0,
          incomeMaterials: parseFloat(financialData.income_materials) || 0,
          expenseMaterials: parseFloat(financialData.expense_materials) || 0
        }
      }
    });
  } catch (error) {
    console.error('Error in getProjectFullDashboard:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при получении данных дашборда проекта',
      error: error.message
    });
  }
};

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
