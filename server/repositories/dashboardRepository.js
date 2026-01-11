
import db from '../config/database.js';
const pool = db.pool;

// ============= Helper Functions =============

function getDateFilter(period) {
    switch (period) {
        case 'month': return "NOW() - INTERVAL '1 month'";
        case 'quarter': return "NOW() - INTERVAL '3 months'";
        case 'year': return "NOW() - INTERVAL '12 months'";
        case 'all': default: return null;
    }
}

function getChartDateRange(chartPeriod) {
    const now = new Date();
    let startDate, endDate, interval;

    switch (chartPeriod) {
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            interval = 'day';
            break;
        case 'quarter':
            startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            endDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
            interval = 'week';
            break;
        case 'halfyear':
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            endDate = now;
            interval = 'month';
            break;
        case 'year':
        default:
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 6, 0);
            interval = 'month';
            break;
    }

    return {
        sqlStart: `'${startDate.toISOString().split('T')[0]}'`,
        sqlEnd: `'${endDate.toISOString().split('T')[0]}'`,
        interval
    };
}

async function getTotalProfitData(tenantId, isSuperAdmin, period = 'year') {
    const dateFilter = getDateFilter(period);
    let query = `
    WITH project_profits AS(
    SELECT 
        p.id as project_id,
    COALESCE(
      (SELECT SUM(wca.total_amount) FROM work_completion_acts wca 
           WHERE wca.estimate_id = e.id AND wca.act_type = 'client' ${dateFilter ? `AND wca.act_date >= ${dateFilter}` : ''}), 0
  ) - COALESCE(
    (SELECT SUM(wca.total_amount) FROM work_completion_acts wca 
           WHERE wca.estimate_id = e.id AND wca.act_type = 'specialist' ${dateFilter ? `AND wca.act_date >= ${dateFilter}` : ''}), 0
        ) as works_profit,
  COALESCE(
    (SELECT SUM(pur.total_price) FROM purchases pur 
           WHERE pur.estimate_id = e.id AND pur.total_price IS NOT NULL ${dateFilter ? `AND pur.created_at >= ${dateFilter}` : ''}), 0
        ) - COALESCE(
      (SELECT SUM(gp.total_price) FROM global_purchases gp 
           WHERE gp.estimate_id = e.id AND gp.total_price IS NOT NULL ${dateFilter ? `AND gp.created_at >= ${dateFilter}` : ''}), 0
        ) as materials_profit
      FROM projects p
      JOIN estimates e ON p.id = e.project_id
      WHERE 1 = 1 ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
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

async function getActiveProjectsCount(tenantId, isSuperAdmin) {
    let query = `
    SELECT COUNT(*) as active_projects
    FROM projects p
    WHERE p.status = 'in_progress'
    ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
  `;
    const params = !isSuperAdmin ? [tenantId] : [];
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].active_projects) || 0;
}

async function getIncomeWorksData(tenantId, isSuperAdmin, period = 'year') {
    const dateFilter = getDateFilter(period);
    let query = `
    SELECT COALESCE(SUM(wca.total_amount), 0) as total_income_works
    FROM work_completion_acts wca
    JOIN estimates e ON wca.estimate_id = e.id
    JOIN projects p ON e.project_id = p.id
    WHERE wca.act_type = 'client'
    ${dateFilter ? `AND wca.act_date >= ${dateFilter}` : ''}
    ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
  `;
    const params = !isSuperAdmin ? [tenantId] : [];
    const result = await pool.query(query, params);
    return parseFloat(result.rows[0].total_income_works) || 0;
}

async function getIncomeMaterialsData(tenantId, isSuperAdmin, period = 'year') {
    const dateFilter = getDateFilter(period);
    let query = `
    SELECT COALESCE(SUM(pur.total_price), 0) as total_income_materials
    FROM purchases pur
    JOIN estimates e ON pur.estimate_id = e.id
    JOIN projects p ON e.project_id = p.id
    WHERE pur.total_price IS NOT NULL
    ${dateFilter ? `AND pur.created_at >= ${dateFilter}` : ''}
    ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
  `;
    const params = !isSuperAdmin ? [tenantId] : [];
    const result = await pool.query(query, params);
    return parseFloat(result.rows[0].total_income_materials) || 0;
}

async function getProjectsProfitInternal(tenantId, isSuperAdmin, limit, period = 'all') {
    const dateFilter = getDateFilter(period);
    let query = `
    WITH project_financials AS(
    SELECT 
        p.id, p.name, p.status,
    COALESCE((
      SELECT SUM(wca.total_amount) 
          FROM work_completion_acts wca 
          JOIN estimates e ON wca.estimate_id = e.id 
          WHERE e.project_id = p.id AND wca.act_type = 'client'
          ${dateFilter ? `AND wca.act_date >= ${dateFilter}` : ''}
    ), 0) as income_works,
  COALESCE((
    SELECT SUM(wca.total_amount) 
          FROM work_completion_acts wca 
          JOIN estimates e ON wca.estimate_id = e.id 
          WHERE e.project_id = p.id AND wca.act_type = 'specialist'
          ${dateFilter ? `AND wca.act_date >= ${dateFilter}` : ''}
  ), 0) as expense_works,
    COALESCE((
      SELECT SUM(pur.total_price) 
          FROM purchases pur 
          JOIN estimates e ON pur.estimate_id = e.id 
          WHERE e.project_id = p.id
          ${dateFilter ? `AND pur.created_at >= ${dateFilter}` : ''}
    ), 0) as income_materials,
      COALESCE((
        SELECT SUM(gp.total_price) 
          FROM global_purchases gp 
          JOIN estimates e ON gp.estimate_id = e.id 
          WHERE e.project_id = p.id
          ${dateFilter ? `AND gp.created_at >= ${dateFilter}` : ''}
      ), 0) as expense_materials
      FROM projects p
      WHERE 1 = 1 ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
    )
    SELECT
    id, name, status,
    (income_works - expense_works + income_materials - expense_materials) as total_profit,
    income_works + income_materials as total_income,
    CASE
      WHEN(income_works + income_materials) > 0 
      THEN ROUND(((income_works - expense_works + income_materials - expense_materials) / (income_works + income_materials) * 100):: numeric, 1)
      ELSE 0
    END as profit_percentage
    FROM project_financials
    WHERE(income_works + income_materials) > 0
    ORDER BY total_profit DESC
    LIMIT ${!isSuperAdmin ? '$2' : '$1'}
  `;
    const params = !isSuperAdmin ? [tenantId, limit] : [limit];
    const result = await pool.query(query, params);
    return result.rows.map(r => ({
        project_id: r.id,
        project_name: r.name,
        status: r.status,
        total_profit: parseFloat(r.total_profit) || 0,
        totalIncome: parseFloat(r.total_income) || 0,
        profitPercentage: parseFloat(r.profit_percentage) || 0,
        isProfit: parseFloat(r.total_profit) > 0
    }));
}

async function getMonthlyGrowthInternal(tenantId, isSuperAdmin, period = 'year') {
    const query = `
    WITH month_series AS(
    SELECT generate_series(
      DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
      DATE_TRUNC('month', CURRENT_DATE),
      INTERVAL '1 month'
    ):: date AS month_date
  ),
  monthly_data AS(
    SELECT 
        ms.month_date,
    CASE TO_CHAR(ms.month_date, 'Mon')
          WHEN 'Jan' THEN 'Янв' WHEN 'Feb' THEN 'Фев' WHEN 'Mar' THEN 'Мар'
          WHEN 'Apr' THEN 'Апр' WHEN 'May' THEN 'Май' WHEN 'Jun' THEN 'Июн'
          WHEN 'Jul' THEN 'Июл' WHEN 'Aug' THEN 'Авг' WHEN 'Sep' THEN 'Сен'
          WHEN 'Oct' THEN 'Окт' WHEN 'Nov' THEN 'Ноя' WHEN 'Dec' THEN 'Дек'
        END as month_name,
    COALESCE((
      SELECT SUM(wca.total_amount) / 1000.0
          FROM work_completion_acts wca
          JOIN estimates e ON wca.estimate_id = e.id
          JOIN projects p ON e.project_id = p.id
          WHERE wca.act_type = 'client'
            AND DATE_TRUNC('month', wca.created_at) = ms.month_date
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
    ), 0) as income_client_acts,
    COALESCE((
      SELECT SUM(pur.total_price) / 1000.0
          FROM purchases pur
          JOIN estimates e ON pur.estimate_id = e.id
          JOIN projects p ON e.project_id = p.id
          WHERE DATE_TRUNC('month', pur.created_at) = ms.month_date
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
    ), 0) as income_estimate,
    COALESCE((
      SELECT SUM(wca.total_amount) / 1000.0
          FROM work_completion_acts wca
          JOIN estimates e ON wca.estimate_id = e.id
          JOIN projects p ON e.project_id = p.id
          WHERE wca.act_type = 'specialist'
            AND DATE_TRUNC('month', wca.created_at) = ms.month_date
            ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
    ), 0) as expense_specialist_acts,
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

async function getChartDataInternal(tenantId, isSuperAdmin, chartPeriod = 'year') {
    const dateRange = getChartDateRange(chartPeriod);
    let query;
    let interval, groupFormat;

    switch (chartPeriod) {
        case 'month':
            interval = '1 day';
            groupFormat = 'DD';
            query = `
        WITH date_series AS(
          SELECT generate_series(
            DATE_TRUNC('day', ${dateRange.sqlStart}:: date),
            DATE_TRUNC('day', ${dateRange.sqlEnd}:: date),
            INTERVAL '${interval}'
          ):: date AS date_point
        )
        SELECT
          ds.date_point,
          TO_CHAR(ds.date_point, '${groupFormat}') as label,
          COALESCE((
            SELECT SUM(wca.total_amount) FROM work_completion_acts wca
            JOIN estimates e ON wca.estimate_id = e.id
            JOIN projects p ON e.project_id = p.id
            WHERE wca.act_type = 'client'
              AND DATE_TRUNC('day', wca.act_date) = ds.date_point
              ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ), 0) as income_works,
          COALESCE((
            SELECT SUM(pur.total_price) FROM purchases pur
            JOIN estimates e ON pur.estimate_id = e.id
            JOIN projects p ON e.project_id = p.id
            WHERE DATE_TRUNC('day', pur.created_at) = ds.date_point
              ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ), 0) as income_materials,
          COALESCE((
            SELECT SUM(wca.total_amount) FROM work_completion_acts wca
            JOIN estimates e ON wca.estimate_id = e.id
            JOIN projects p ON e.project_id = p.id
            WHERE wca.act_type = 'specialist'
              AND DATE_TRUNC('day', wca.act_date) = ds.date_point
              ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ), 0) as expense_works,
          COALESCE((
            SELECT SUM(gp.total_price) FROM global_purchases gp
            JOIN estimates e ON gp.estimate_id = e.id
            JOIN projects p ON e.project_id = p.id
            WHERE DATE_TRUNC('day', gp.created_at) = ds.date_point
              ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ), 0) as expense_materials
        FROM date_series ds
        ORDER BY ds.date_point
      `;
            break;
        default:
            interval = '1 month';
            query = `
        WITH month_series AS(
          SELECT generate_series(
            DATE_TRUNC('month', ${dateRange.sqlStart}:: date),
            DATE_TRUNC('month', ${dateRange.sqlEnd}:: date),
            INTERVAL '${interval}'
          ):: date AS month_point
        )
        SELECT
          ms.month_point,
          CASE TO_CHAR(ms.month_point, 'Mon')
            WHEN 'Jan' THEN 'Янв' WHEN 'Feb' THEN 'Фев' WHEN 'Mar' THEN 'Мар'
            WHEN 'Apr' THEN 'Апр' WHEN 'May' THEN 'Май' WHEN 'Jun' THEN 'Июн'
            WHEN 'Jul' THEN 'Июл' WHEN 'Aug' THEN 'Авг' WHEN 'Sep' THEN 'Сен'
            WHEN 'Oct' THEN 'Окт' WHEN 'Nov' THEN 'Ноя' WHEN 'Dec' THEN 'Дек'
          END as label,
          COALESCE((
            SELECT SUM(wca.total_amount) FROM work_completion_acts wca
            JOIN estimates e ON wca.estimate_id = e.id
            JOIN projects p ON e.project_id = p.id
            WHERE wca.act_type = 'client'
              AND DATE_TRUNC('month', wca.act_date) = ms.month_point
              ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ), 0) as income_works,
          COALESCE((
            SELECT SUM(pur.total_price) FROM purchases pur
            JOIN estimates e ON pur.estimate_id = e.id
            JOIN projects p ON e.project_id = p.id
            WHERE DATE_TRUNC('month', pur.created_at) = ms.month_point
              ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ), 0) as income_materials,
          COALESCE((
            SELECT SUM(wca.total_amount) FROM work_completion_acts wca
            JOIN estimates e ON wca.estimate_id = e.id
            JOIN projects p ON e.project_id = p.id
            WHERE wca.act_type = 'specialist'
              AND DATE_TRUNC('month', wca.act_date) = ms.month_point
              ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ), 0) as expense_works,
          COALESCE((
            SELECT SUM(gp.total_price) FROM global_purchases gp
            JOIN estimates e ON gp.estimate_id = e.id
            JOIN projects p ON e.project_id = p.id
            WHERE DATE_TRUNC('month', gp.created_at) = ms.month_point
              ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}
          ), 0) as expense_materials
        FROM month_series ms
        ORDER BY ms.month_point
      `;
            break;
    }
    const params = !isSuperAdmin ? [tenantId] : [];
    const result = await pool.query(query, params);
    const categories = result.rows.map(row => row.label);
    const series = [
        { name: 'income_works', data: result.rows.map(row => parseFloat(row.income_works) || 0) },
        { name: 'income_materials', data: result.rows.map(row => parseFloat(row.income_materials) || 0) },
        { name: 'expense_works', data: result.rows.map(row => parseFloat(row.expense_works) || 0) },
        { name: 'expense_materials', data: result.rows.map(row => parseFloat(row.expense_materials) || 0) }
    ];
    return { categories, series };
}

export async function getSummary(tenantId, isSuperAdmin, period, chartPeriod) {
    const [
        profitResult,
        incomeWorksResult,
        incomeMaterialsResult,
        activeProjectsResult,
        chartDataResult,
        growthResult,
        projectsProfitResult
    ] = await Promise.all([
        getTotalProfitData(tenantId, isSuperAdmin, period),
        getIncomeWorksData(tenantId, isSuperAdmin, period),
        getIncomeMaterialsData(tenantId, isSuperAdmin, period),
        getActiveProjectsCount(tenantId, isSuperAdmin),
        getChartDataInternal(tenantId, isSuperAdmin, chartPeriod),
        getMonthlyGrowthInternal(tenantId, isSuperAdmin, period),
        getProjectsProfitInternal(tenantId, isSuperAdmin, 10, period)
    ]);

    return {
        totalProfit: profitResult,
        incomeWorks: incomeWorksResult,
        incomeMaterials: incomeMaterialsResult,
        activeProjects: activeProjectsResult,
        chartData: chartDataResult,
        growthData: growthResult,
        projectsProfitData: projectsProfitResult
    };
}

export default {
    getSummary
};
