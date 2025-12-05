/**
 * Projects Routes
 * Роуты для управления проектами
 * 
 * Все роуты защищены middleware authenticateToken
 * RLS автоматически фильтрует данные по tenant_id
 */

import express from 'express';
import {
  getAllProjects,
  getProjectStats,
  getTotalProfit,
  getTotalIncomeWorks,
  getTotalIncomeMaterials,
  getMonthlyGrowthData,
  getProjectsProfitData,
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
} from '../controllers/projectsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkPermission, checkAnyPermission } from '../middleware/checkPermission.js';

const router = express.Router();

// Применяем аутентификацию ко всем роутам
router.use(authenticateToken);

/**
 * @route   GET /api/projects
 * @desc    Получить список проектов с пагинацией, поиском и фильтрацией
 * @access  Private (требует projects.read)
 * @query   {number} page - Номер страницы (default: 1)
 * @query   {number} limit - Количество элементов на странице (default: 10)
 * @query   {string} search - Поиск по названию, объекту, клиенту, подрядчику
 * @query   {string} status - Фильтр по статусу (active|planning|completed|on_hold)
 * @query   {string} startDateFrom - Фильтр по дате начала (от)
 * @query   {string} startDateTo - Фильтр по дате начала (до)
 * @query   {string} endDateFrom - Фильтр по дате окончания (от)
 * @query   {string} endDateTo - Фильтр по дате окончания (до)
 * @query   {string} sortBy - Поле для сортировки (default: created_at)
 * @query   {string} sortOrder - Порядок сортировки: asc|desc (default: desc)
 */
router.get('/', checkPermission('projects', 'read'), getAllProjects);

/**
 * @route   GET /api/projects/stats
 * @desc    Получить статистику по проектам
 * @access  Private (требует projects.read)
 * @return  {object} Статистика: всего, в работе, завершено, бюджет и т.д.
 */
router.get('/stats', checkPermission('projects', 'read'), getProjectStats);

/**
 * @route   GET /api/projects/dashboard-summary
 * @desc    Получить все данные дашборда за один запрос (оптимизация: 7 запросов → 1)
 * @access  Private (требует projects.read)
 * @return  {object} Все данные для главной панели: прибыль, доходы, графики, проекты
 */
router.get('/dashboard-summary', checkPermission('projects', 'read'), getDashboardSummary);

/**
 * @route   GET /api/projects/total-profit
 * @desc    Получить общую прибыль по всем проектам
 * @access  Private (требует projects.read)
 * @return  {object} Общая прибыль из всех смет проектов
 */
router.get('/total-profit', checkPermission('projects', 'read'), getTotalProfit);

/**
 * @route   GET /api/projects/chart-data
 * @desc    Получить данные для графиков проектов по месяцам
 * @access  Private (требует projects.read)
 * @query   {string} period - Период: month|year (default: year)
 * @return  {object} Данные для графиков: активные и общее количество проектов по периодам
 */
router.get('/chart-data', checkPermission('projects', 'read'), getProjectsChartData);

/**
 * @route   GET /api/projects/total-income-works
 * @desc    Получить общий доход по работам
 * @access  Private (требует projects.read)
 */
router.get('/total-income-works', checkPermission('projects', 'read'), getTotalIncomeWorks);

/**
 * @route   GET /api/projects/total-income-materials
 * @desc    Получить общий доход по материалам
 * @access  Private (требует projects.read)
 */
router.get('/total-income-materials', checkPermission('projects', 'read'), getTotalIncomeMaterials);

/**
 * @route   GET /api/projects/monthly-growth-data
 * @desc    Получить данные роста по месяцам
 * @access  Private (требует projects.read)
 */
router.get('/monthly-growth-data', checkPermission('projects', 'read'), getMonthlyGrowthData);

/**
 * @route   GET /api/projects/profit-data
 * @desc    Получить данные прибыли по проектам
 * @access  Private (требует projects.read)
 */
router.get('/profit-data', checkPermission('projects', 'read'), getProjectsProfitData);

/**
 * @route   GET /api/projects/:id
 * @desc    Получить детальную информацию о проекте
 * @access  Private (требует projects.read)
 * @param   {string} id - UUID проекта
 */
router.get('/:id', checkPermission('projects', 'read'), getProjectById);

/**
 * @route   GET /api/projects/:id/full-dashboard
 * @desc    Получить все данные дашборда проекта за один запрос (оптимизация: 4+ запросов → 1)
 * @access  Private (требует projects.read)
 * @param   {string} id - UUID проекта
 * @return  {object} project, team, estimates, financialSummary
 */
router.get('/:id/full-dashboard', checkPermission('projects', 'read'), getProjectFullDashboard);

/**
 * @route   POST /api/projects
 * @desc    Создать новый проект
 * @access  Private (требует projects.create)
 * @body    {object} Данные проекта
 * @required {string} objectName - Наименование объекта
 * @required {string} client - Заказчик
 * @required {string} contractor - Подрядчик
 * @required {string} address - Адрес объекта
 * @required {string} startDate - Дата начала (YYYY-MM-DD)
 * @required {string} endDate - Дата окончания (YYYY-MM-DD)
 * @optional {string} name - Название проекта (если не указано, используется objectName)
 * @optional {string} status - Статус (default: planning)
 * @optional {number} progress - Прогресс 0-100 (default: 0)
 * @optional {number} budget - Бюджет (default: 0)
 * @optional {number} actualCost - Фактические затраты (default: 0)
 * @optional {string} managerId - UUID менеджера проекта
 * @optional {string} description - Описание проекта
 * @optional {string} notes - Заметки
 */
router.post('/', checkPermission('projects', 'create'), createProject);

/**
 * @route   PUT /api/projects/:id
 * @desc    Обновить проект
 * @access  Private (требует projects.update ИЛИ projects.manage)
 * @param   {string} id - UUID проекта
 * @body    {object} Данные для обновления (все поля опциональны)
 */
router.put('/:id', checkAnyPermission(['projects', 'update'], ['projects', 'manage']), updateProject);

/**
 * @route   PATCH /api/projects/:id/status
 * @desc    Обновить статус проекта (быстрое обновление)
 * @access  Private (требует projects.update ИЛИ projects.manage)
 * @param   {string} id - UUID проекта
 * @body    {object} { status: string }
 * @required {string} status - Новый статус (planning|approval|in_progress|rejected|completed)
 */
router.patch('/:id/status', checkAnyPermission(['projects', 'update'], ['projects', 'manage']), updateProjectStatus);

/**
 * @route   POST /api/projects/:id/calculate-progress
 * @desc    Автоматически рассчитать прогресс проекта на основе выполненных работ
 * @access  Private (требует projects.update ИЛИ projects.manage)
 * @param   {string} id - UUID проекта
 * @return  {object} { progress, completedWorks, totalWorks }
 */
router.post('/:id/calculate-progress', checkAnyPermission(['projects', 'update'], ['projects', 'manage']), calculateProjectProgress);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Удалить проект (CASCADE удалит команду)
 * @access  Private (требует projects.delete ИЛИ projects.manage)
 * @param   {string} id - UUID проекта
 * @security КРИТИЧНО: Теперь защищено проверкой разрешений!
 */
router.delete('/:id', checkAnyPermission(['projects', 'delete'], ['projects', 'manage']), deleteProject);

/**
 * @route   GET /api/projects/:id/team
 * @desc    Получить команду проекта
 * @access  Private (требует projects.read)
 * @param   {string} id - UUID проекта
 * @query   {boolean} includeLeft - Включить покинувших команду (default: false)
 */
router.get('/:id/team', checkPermission('projects', 'read'), getProjectTeam);

/**
 * @route   POST /api/projects/:id/team
 * @desc    Добавить участника в команду проекта
 * @access  Private (требует projects.update ИЛИ projects.manage)
 * @param   {string} id - UUID проекта
 * @body    {object} Данные участника
 * @required {string} userId - UUID пользователя
 * @optional {string} role - Роль (manager|member|viewer) (default: member)
 * @optional {boolean} canEdit - Может редактировать (default: false)
 * @optional {boolean} canViewFinancials - Может видеть финансы (default: false)
 */
router.post('/:id/team', checkAnyPermission(['projects', 'update'], ['projects', 'manage']), addTeamMember);

/**
 * @route   PUT /api/projects/:id/team/:memberId
 * @desc    Обновить роль и права участника команды
 * @access  Private (требует projects.update ИЛИ projects.manage)
 * @param   {string} id - UUID проекта
 * @param   {string} memberId - ID записи в project_team_members
 * @body    {object} Данные для обновления
 * @optional {string} role - Новая роль
 * @optional {boolean} canEdit - Может редактировать
 * @optional {boolean} canViewFinancials - Может видеть финансы
 */
router.put('/:id/team/:memberId', checkAnyPermission(['projects', 'update'], ['projects', 'manage']), updateTeamMember);

/**
 * @route   DELETE /api/projects/:id/team/:memberId
 * @desc    Удалить участника из команды (soft delete)
 * @access  Private (требует projects.update ИЛИ projects.manage)
 * @param   {string} id - UUID проекта
 * @param   {string} memberId - ID записи в project_team_members
 */
router.delete('/:id/team/:memberId', checkAnyPermission(['projects', 'update'], ['projects', 'manage']), removeTeamMember);

export default router;
