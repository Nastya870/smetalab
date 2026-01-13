/**
 * Repository for working with projects in the database
 */

import db from '../config/database.js';
const pool = db.pool;

/**
 * Get all projects with pagination, searching, and filtering
 * @param {Object} options - Search and filter options
 * @param {string} tenantId - Tenant ID for isolation
 * @param {boolean} isSuperAdmin - Whether the user is a super admin
 * @returns {Promise<{rows: Array, totalItems: number}>} - Projects and total count
 */
export async function findAll(options, tenantId, isSuperAdmin) {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    startDateFrom = '',
    startDateTo = '',
    endDateFrom = '',
    endDateTo = '',
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = options;

  const offset = (page - 1) * limit;
  const params = [];
  let paramCount = 0;

  let query = `
    SELECT 
      p.*,
      (SELECT COUNT(*) FROM project_team_members 
       WHERE project_id = p.id AND left_at IS NULL) as team_size,
      CASE 
        WHEN p.end_date < CURRENT_DATE THEN (p.end_date - CURRENT_DATE)
        ELSE (p.end_date - CURRENT_DATE)
      END as days_remaining,
      CASE WHEN p.end_date < CURRENT_DATE THEN true ELSE false END as is_overdue
    FROM projects p
    WHERE 1=1
  `;

  // RLS: Tenant isolation
  if (!isSuperAdmin) {
    if (tenantId) {
      paramCount++;
      query += ` AND p.tenant_id = $${paramCount}`;
      params.push(tenantId);
    } else {
      query += ` AND FALSE`;
    }
  }

  // Filters
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

  if (status) {
    paramCount++;
    query += ` AND p.status = $${paramCount}`;
    params.push(status);
  }

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

  // Count total items
  const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM');
  const countResult = await pool.query(countQuery, params);
  const totalItems = parseInt(countResult.rows[0]?.count || 0);

  // Sorting and Pagination
  const validSortFields = [
    'name', 'object_name', 'client', 'contractor',
    'status', 'progress', 'start_date', 'end_date',
    'budget', 'actual_cost', 'created_at', 'updated_at'
  ];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';

  query += ` ORDER BY p.${sortField} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  return {
    rows: result.rows,
    totalItems
  };
}

/**
 * Get project statistics
 * @param {string} tenantId - Tenant ID
 * @param {boolean} isSuperAdmin - Super admin flag
 * @returns {Promise<Object>} - Statistics
 */
export async function getStats(tenantId, isSuperAdmin) {
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

  return {
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
  };
}

/**
 * Get total profit across projects
 * @param {string} tenantId - Tenant ID
 * @param {boolean} isSuperAdmin - Super admin flag
 * @returns {Promise<Object>} - Profit details
 */
export async function getTotalProfit(tenantId, isSuperAdmin) {
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
      WHERE 1=1
  `;

  const params = [];
  if (!isSuperAdmin) {
    query += ` AND p.tenant_id = $1`;
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

  const result = await pool.query(query, params);
  const data = result.rows[0];

  return {
    totalProfit: parseFloat(data.total_profit) || 0,
    projectsWithProfit: parseInt(data.projects_with_profit) || 0,
    worksProfit: parseFloat(data.sum_works_profit) || 0,
    materialsProfit: parseFloat(data.sum_materials_profit) || 0
  };
}

/**
 * Get project by ID with team details
 * @param {string} id - Project ID
 * @param {string} tenantId - Tenant ID
 * @param {boolean} isSuperAdmin - Super admin flag
 * @returns {Promise<Object|null>} - Project or null
 */
export async function findById(id, tenantId, isSuperAdmin) {
  let query = `
    SELECT 
      p.*,
      u.full_name as creator_name,
      u.email as creator_email
    FROM projects p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.id = $1
  `;

  const params = [id];
  if (!isSuperAdmin) {
    query += ` AND p.tenant_id = $2`;
    params.push(tenantId);
  }

  const result = await pool.query(query, params);
  const project = result.rows[0];

  if (!project) return null;

  // Fetch team members
  const teamQuery = `
    SELECT 
      ptm.*,
      u.full_name,
      u.email,
      u.avatar_url
    FROM project_team_members ptm
    JOIN users u ON ptm.user_id = u.id
    WHERE ptm.project_id = $1 AND ptm.left_at IS NULL
    ORDER BY ptm.joined_at ASC
  `;
  const teamResult = await pool.query(teamQuery, [id]);
  project.team = teamResult.rows;

  return project;
}

/**
 * Create a new project
 * @param {Object} data - Project data
 * @param {string} tenantId - Tenant ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Created project
 */
export async function create(data, tenantId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const query = `
      INSERT INTO projects (
        tenant_id, name, object_name, client, contractor, 
        address, start_date, end_date, budget, description, 
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      tenantId,
      data.name || data.objectName || 'Project',
      data.object_name || data.objectName || null,
      data.client || null,
      data.contractor || null,
      data.address || null,
      data.start_date || data.startDate || null,
      data.end_date || data.endDate || null,
      data.budget || 0,
      data.description || null,
      data.status || 'planning',
      userId
    ];

    const result = await client.query(query, values);
    const project = result.rows[0];

    await client.query('COMMIT');
    return project;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update project
 * @param {string} id - Project ID
 * @param {Object} data - Update data
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} - Updated project or null
 */
export async function update(id, data, tenantId) {
  const fields = [];
  const values = [];
  let paramCount = 0;

  const fieldMapping = {
    name: 'name',
    object_name: 'object_name',
    objectName: 'object_name',
    client: 'client',
    contractor: 'contractor',
    address: 'address',
    start_date: 'start_date',
    startDate: 'start_date',
    end_date: 'end_date',
    endDate: 'end_date',
    budget: 'budget',
    actual_cost: 'actual_cost',
    actualCost: 'actual_cost',
    progress: 'progress',
    description: 'description',
    status: 'status'
  };

  const processedFields = new Set();

  for (const [key, dbField] of Object.entries(fieldMapping)) {
    if (data[key] !== undefined && !processedFields.has(dbField)) {
      paramCount++;
      fields.push(`${dbField} = $${paramCount}`);
      values.push(data[key]);
      processedFields.add(dbField);
    }
  }

  if (fields.length === 0) return null;

  paramCount++;
  values.push(id);
  const idParam = paramCount;

  paramCount++;
  values.push(tenantId);
  const tenantParam = paramCount;

  const query = `
    UPDATE projects 
    SET ${fields.join(', ')}, updated_at = NOW() 
    WHERE id = $${idParam} AND tenant_id = $${tenantParam}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

/**
 * Delete project
 * @param {string} id - Project ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} - Success
 */
export async function remove(id, tenantId) {
  const query = 'DELETE FROM projects WHERE id = $1 AND tenant_id = $2 RETURNING id';
  const result = await pool.query(query, [id, tenantId]);
  return result.rowCount > 0;
}

/**
 * Get total income from works (client acts)
 * @param {string} tenantId - Tenant ID
 * @param {boolean} isSuperAdmin - Super admin flag
 * @returns {Promise<number>} - Total income
 */
export async function getTotalIncomeWorks(tenantId, isSuperAdmin) {
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
    query += ` AND p.tenant_id = $1`;
    params.push(tenantId);
  }

  const result = await pool.query(query, params);
  return parseFloat(result.rows[0].total_income_works) || 0;
}

/**
 * Get total income from materials (estimated purchases)
 * @param {string} tenantId - Tenant ID
 * @param {boolean} isSuperAdmin - Super admin flag
 * @returns {Promise<number>} - Total income
 */
export async function getTotalIncomeMaterials(tenantId, isSuperAdmin) {
  let query = `
    SELECT 
      COALESCE(SUM(pur.total_price), 0) as total_income_materials
    FROM purchases pur
    JOIN estimates e ON pur.estimate_id = e.id
    JOIN projects p ON e.project_id = p.id
    WHERE pur.total_price IS NOT NULL
  `;

  const params = [];
  if (!isSuperAdmin) {
    query += ` AND p.tenant_id = $1`;
    params.push(tenantId);
  }

  const result = await pool.query(query, params);
  return parseFloat(result.rows[0].total_income_materials) || 0;
}

/**
 * Get project profitability data
 * @param {number} limit - Number of projects
 * @param {string} tenantId - Tenant ID
 * @param {boolean} isSuperAdmin - Super admin flag
 * @returns {Promise<Array>} - Profitability data
 */
export async function getProjectsProfitData(limit, tenantId, isSuperAdmin) {
  let query = `
    WITH project_financials AS (
      SELECT 
        p.id, p.name, p.status,
        
        COALESCE(
          (SELECT SUM(wca.total_amount) FROM work_completion_acts wca 
           JOIN estimates e ON wca.estimate_id = e.id WHERE e.project_id = p.id AND wca.act_type = 'client'), 0
        ) as income_works,
        
        COALESCE(
          (SELECT SUM(wca.total_amount) FROM work_completion_acts wca 
           JOIN estimates e ON wca.estimate_id = e.id WHERE e.project_id = p.id AND wca.act_type = 'specialist'), 0
        ) as expense_works,
        
        COALESCE(
          (SELECT SUM(pur.total_price) FROM purchases pur 
           JOIN estimates e ON pur.estimate_id = e.id WHERE e.project_id = p.id AND pur.total_price IS NOT NULL), 0
        ) as income_materials,
        
        COALESCE(
          (SELECT SUM(gp.total_price) FROM global_purchases gp 
           JOIN estimates e ON gp.estimate_id = e.id WHERE e.project_id = p.id AND gp.total_price IS NOT NULL), 0
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
      id, name, status,
      (income_works - expense_works) as works_profit,
      (income_materials - expense_materials) as materials_profit,
      (income_works - expense_works + income_materials - expense_materials) as total_profit,
      income_works + income_materials as total_income,
      expense_works + expense_materials as total_expense,
      CASE 
        WHEN (income_works + income_materials) > 0 
        THEN ROUND(((income_works - expense_works + income_materials - expense_materials) / (income_works + income_materials) * 100)::numeric, 1)
        ELSE 0 
      END as profit_percentage
    FROM project_financials
    WHERE (income_works + income_materials) > 0
    ORDER BY total_profit DESC
    LIMIT $${params.length + 1}
  `;
  params.push(limit);

  const result = await pool.query(query, params);
  return result.rows.map(row => ({
    ...row,
    totalProfit: parseFloat(row.total_profit),
    worksProfit: parseFloat(row.works_profit),
    materialsProfit: parseFloat(row.materials_profit),
    totalIncome: parseFloat(row.total_income),
    totalExpense: parseFloat(row.total_expense),
    profitPercentage: parseFloat(row.profit_percentage),
    isProfit: parseFloat(row.total_profit) > 0
  }));
}

/**
 * Get monthly growth data for the last 12 months
 * @param {string} tenantId - Tenant ID
 * @param {boolean} isSuperAdmin - Super admin flag
 * @returns {Promise<Object>} - Months and series data
 */
export async function getMonthlyGrowthData(tenantId, isSuperAdmin) {
  const tenantFilter = !isSuperAdmin ? 'AND p.tenant_id = $1' : '';
  const params = !isSuperAdmin ? [tenantId] : [];

  let query = `
    WITH month_series AS (
      SELECT generate_series(DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months', DATE_TRUNC('month', CURRENT_DATE), INTERVAL '1 month')::date AS month_date
    ),
    monthly_data AS (
      SELECT ms.month_date,
        CASE TO_CHAR(ms.month_date, 'Mon')
          WHEN 'Jan' THEN 'Янв' WHEN 'Feb' THEN 'Фев' WHEN 'Mar' THEN 'Мар' WHEN 'Apr' THEN 'Апр'
          WHEN 'May' THEN 'Май' WHEN 'Jun' THEN 'Июн' WHEN 'Jul' THEN 'Июл' WHEN 'Aug' THEN 'Авг'
          WHEN 'Sep' THEN 'Сен' WHEN 'Oct' THEN 'Окт' WHEN 'Nov' THEN 'Ноя' WHEN 'Dec' THEN 'Дек'
        END AS month_name
      FROM month_series ms
    ),
    acts_client AS (
      SELECT DATE_TRUNC('month', wca.act_date) AS month_date, COALESCE(SUM(wca.total_amount), 0) AS amount
      FROM work_completion_acts wca JOIN estimates e ON wca.estimate_id = e.id JOIN projects p ON e.project_id = p.id
      WHERE wca.act_type = 'client' AND wca.act_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
      ${tenantFilter} GROUP BY 1
    ),
    acts_specialist AS (
      SELECT DATE_TRUNC('month', wca.act_date) AS month_date, COALESCE(SUM(wca.total_amount), 0) AS amount
      FROM work_completion_acts wca JOIN estimates e ON wca.estimate_id = e.id JOIN projects p ON e.project_id = p.id
      WHERE wca.act_type = 'specialist' AND wca.act_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
      ${tenantFilter} GROUP BY 1
    ),
    estimates_total AS (
      SELECT DATE_TRUNC('month', pur.created_at) AS month_date, COALESCE(SUM(pur.total_price), 0) AS amount
      FROM purchases pur JOIN estimates e ON pur.estimate_id = e.id JOIN projects p ON e.project_id = p.id
      WHERE pur.total_price IS NOT NULL AND pur.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
      ${tenantFilter} GROUP BY 1
    ),
    global_purchases AS (
      SELECT DATE_TRUNC('month', gp.created_at) AS month_date, COALESCE(SUM(gp.total_price), 0) AS amount
      FROM global_purchases gp JOIN estimates e ON gp.estimate_id = e.id JOIN projects p ON e.project_id = p.id
      WHERE gp.total_price IS NOT NULL AND gp.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
      ${tenantFilter} GROUP BY 1
    )
    SELECT md.month_date, md.month_name,
      COALESCE(ac.amount, 0) as client_acts,
      COALESCE(et.amount, 0) as estimates_total,
      COALESCE(asp.amount, 0) as specialist_acts,
      COALESCE(gp.amount, 0) as global_purchases
    FROM monthly_data md
    LEFT JOIN acts_client ac ON md.month_date = ac.month_date
    LEFT JOIN acts_specialist asp ON md.month_date = asp.month_date
    LEFT JOIN estimates_total et ON md.month_date = et.month_date
    LEFT JOIN global_purchases gp ON md.month_date = gp.month_date
    ORDER BY md.month_date
  `;

  const result = await pool.query(query, params);

  return {
    months: result.rows.map(r => r.month_name),
    series: [
      { name: "Доход (Акты заказчика)", data: result.rows.map(r => parseFloat((r.client_acts / 1000).toFixed(2))) },
      { name: "Доход (Итого по смете)", data: result.rows.map(r => parseFloat((r.estimates_total / 1000).toFixed(2))) },
      { name: "Расход (Акты специалиста)", data: result.rows.map(r => parseFloat((r.specialist_acts / 1000).toFixed(2))) },
      { name: "Расход (Итого закупленно)", data: result.rows.map(r => parseFloat((r.global_purchases / 1000).toFixed(2))) }
    ]
  };
}

/**
 * Add member to project team
 */
export async function addTeamMember(projectId, data, addedByUserId, tenantId) {
  const query = `
    INSERT INTO project_team_members (
        project_id, user_id, tenant_id, role, can_edit, can_view_financials, added_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const result = await pool.query(query, [
    projectId,
    data.userId || data.user_id,
    tenantId,
    data.role || 'member',
    data.canEdit !== undefined ? data.canEdit : (data.can_edit || false),
    data.canViewFinancials !== undefined ? data.canViewFinancials : (data.can_view_financials || false),
    addedByUserId
  ]);
  return result.rows[0];
}

/**
 * Update project team member
 */
export async function updateTeamMember(memberId, projectId, data) {
  const fields = [];
  const values = [memberId, projectId];
  let paramCount = 2;

  const fieldMapping = {
    role: 'role',
    can_edit: 'can_edit',
    canEdit: 'can_edit',
    can_view_financials: 'can_view_financials',
    canViewFinancials: 'can_view_financials',
    responsibilities: 'responsibilities'
  };

  const processedFields = new Set();
  for (const [key, dbField] of Object.entries(fieldMapping)) {
    if (data[key] !== undefined && !processedFields.has(dbField)) {
      paramCount++;
      fields.push(`${dbField} = $${paramCount}`);
      values.push(data[key]);
      processedFields.add(dbField);
    }
  }

  if (fields.length === 0) return null;

  const query = `
    UPDATE project_team_members 
    SET ${fields.join(', ')}
    WHERE id = $1 AND project_id = $2 AND left_at IS NULL
    RETURNING *
  `;
  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

/**
 * Remove member from team (soft delete)
 */
export async function removeTeamMember(memberId, projectId) {
  const query = `
    UPDATE project_team_members 
    SET left_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND project_id = $2 AND left_at IS NULL
    RETURNING *
  `;
  const result = await pool.query(query, [memberId, projectId]);
  return result.rowCount > 0;
}

/**
 * Calculate and update project progress
 */
export async function calculateProgress(projectId, tenantId) {
  // 1. Get stats from estimates and work_completions
  // Using explicit JOINs and filtering by item_type = 'work'
  const statsQuery = `
    SELECT 
      COUNT(ei.id) as total_works,
      COUNT(wc.id) as completed_works
    FROM estimate_items ei
    JOIN estimates e ON ei.estimate_id = e.id
    LEFT JOIN work_completions wc ON ei.id = wc.estimate_item_id AND wc.completed = true
    WHERE e.project_id = $1 AND ei.item_type = 'work'
  `;

  const statsResult = await pool.query(statsQuery, [projectId]);
  const { total_works, completed_works } = statsResult.rows[0];

  const total = parseInt(total_works) || 0;
  const completed = parseInt(completed_works) || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 2. Update project progress
  let updateQuery = 'UPDATE projects SET progress = $1, updated_at = NOW() WHERE id = $2';
  const updateParams = [progress, projectId];

  if (tenantId) {
    updateQuery += ' AND tenant_id = $3';
    updateParams.push(tenantId);
  }

  await pool.query(updateQuery, updateParams);

  return { progress, totalWorks: total, completedWorks: completed };
}

export async function getTeam(projectId) {
  const query = `
    SELECT 
      ptm.*,
      u.email,
      u.full_name,
      u.avatar_url as avatar
    FROM project_team_members ptm
    JOIN users u ON ptm.user_id = u.id
    WHERE ptm.project_id = $1 AND (ptm.left_at IS NULL)
  `;
  const result = await pool.query(query, [projectId]);
  return { rows: result.rows, rowCount: result.rowCount };
}

export async function getEstimates(projectId) {
  const query = `
      SELECT * FROM estimates 
      WHERE project_id = $1 
      ORDER BY created_at DESC
  `;
  const result = await pool.query(query, [projectId]);
  return result.rows;
}


/**
 * Get projects chart data (counts by status over time)
 * @param {string} period - 'month' or 'year'
 * @param {string} tenantId - Tenant ID
 * @param {boolean} isSuperAdmin - Super admin flag
 */
export async function getProjectsChartData(period, tenantId, isSuperAdmin) {
  let query;

  if (period === 'month') {
    // Last 30 days
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
          (SELECT COUNT(*) FROM projects p WHERE p.status = 'planning' AND p.created_at::date <= ds.period_date AND (p.end_date IS NULL OR p.end_date >= ds.period_date) ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}) as planning_count,
          (SELECT COUNT(*) FROM projects p WHERE p.status = 'approval' AND p.created_at::date <= ds.period_date AND (p.end_date IS NULL OR p.end_date >= ds.period_date) ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}) as approval_count,
          (SELECT COUNT(*) FROM projects p WHERE p.status = 'in_progress' AND p.created_at::date <= ds.period_date AND (p.end_date IS NULL OR p.end_date >= ds.period_date) ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}) as in_progress_count,
          (SELECT COUNT(*) FROM projects p WHERE p.status = 'rejected' AND p.created_at::date <= ds.period_date AND (p.end_date IS NULL OR p.end_date >= ds.period_date) ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}) as rejected_count,
          (SELECT COUNT(*) FROM projects p WHERE p.status = 'completed' AND p.created_at::date <= ds.period_date AND (p.end_date IS NULL OR p.end_date >= ds.period_date) ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}) as completed_count,
          (SELECT COUNT(*) FROM projects p WHERE p.created_at::date <= ds.period_date ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}) as total_count
        FROM date_series ds
    `;
  } else {
    // Last 12 months
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
            WHEN 'Jan' THEN 'Янв' WHEN 'Feb' THEN 'Фев' WHEN 'Mar' THEN 'Мар' WHEN 'Apr' THEN 'Апр'
            WHEN 'May' THEN 'Май' WHEN 'Jun' THEN 'Июн' WHEN 'Jul' THEN 'Июл' WHEN 'Aug' THEN 'Авг'
            WHEN 'Sep' THEN 'Сен' WHEN 'Oct' THEN 'Окт' WHEN 'Nov' THEN 'Ноя' WHEN 'Dec' THEN 'Дек'
          END AS month_name,
          ms.period_date,
          (SELECT COUNT(*) FROM projects p WHERE p.status = 'planning' AND DATE_TRUNC('month', p.created_at) <= ms.period_date AND (p.end_date IS NULL OR DATE_TRUNC('month', p.end_date) >= ms.period_date) ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}) as planning_count,
          (SELECT COUNT(*) FROM projects p WHERE p.status = 'approval' AND DATE_TRUNC('month', p.created_at) <= ms.period_date AND (p.end_date IS NULL OR DATE_TRUNC('month', p.end_date) >= ms.period_date) ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}) as approval_count,
          (SELECT COUNT(*) FROM projects p WHERE p.status = 'in_progress' AND DATE_TRUNC('month', p.created_at) <= ms.period_date AND (p.end_date IS NULL OR DATE_TRUNC('month', p.end_date) >= ms.period_date) ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}) as in_progress_count,
          (SELECT COUNT(*) FROM projects p WHERE p.status = 'rejected' AND DATE_TRUNC('month', p.created_at) <= ms.period_date AND (p.end_date IS NULL OR DATE_TRUNC('month', p.end_date) >= ms.period_date) ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}) as rejected_count,
          (SELECT COUNT(*) FROM projects p WHERE p.status = 'completed' AND DATE_TRUNC('month', p.created_at) <= ms.period_date AND (p.end_date IS NULL OR DATE_TRUNC('month', p.end_date) >= ms.period_date) ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}) as completed_count,
          (SELECT COUNT(*) FROM projects p WHERE DATE_TRUNC('month', p.created_at) <= ms.period_date ${!isSuperAdmin ? 'AND p.tenant_id = $1' : ''}) as total_count
        FROM month_series ms
    `;
  }

  const params = [];
  if (!isSuperAdmin) {
    params.push(tenantId);
  }

  query += ` ORDER BY period_date `;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getProjectFinancials(projectId) {
  const query = `
SELECT
COALESCE(
  (SELECT SUM(wca.total_amount) 
   FROM work_completion_acts wca 
   JOIN estimates e ON wca.estimate_id = e.id 
   WHERE e.project_id = $1 AND wca.act_type = 'client'), 0
) as income_works,
COALESCE(
  (SELECT SUM(wca.total_amount) 
   FROM work_completion_acts wca 
   JOIN estimates e ON wca.estimate_id = e.id 
   WHERE e.project_id = $1 AND wca.act_type = 'specialist'), 0
) as expense_works,
COALESCE(
  (SELECT SUM(pur.total_price) 
   FROM purchases pur 
   JOIN estimates e ON pur.estimate_id = e.id 
   WHERE e.project_id = $1 AND pur.total_price IS NOT NULL), 0
) as income_materials,
COALESCE(
  (SELECT SUM(gp.total_price) 
   FROM global_purchases gp 
   JOIN estimates e ON gp.estimate_id = e.id 
   WHERE e.project_id = $1 AND gp.total_price IS NOT NULL), 0
) as expense_materials
  `;
  const result = await pool.query(query, [projectId]);
  return result.rows[0];
}

export default {
  findAll,
  findById,
  create,
  update,
  remove,
  getStats,
  getTotalProfit,
  getTotalIncomeWorks,
  getTotalIncomeMaterials,
  getProjectsProfitData,
  getMonthlyGrowthData,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  calculateProgress,
  getTeam,
  getEstimates,
  getProjectFinancials,
  getProjectsChartData
};
