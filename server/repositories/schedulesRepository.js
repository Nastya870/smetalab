import db from '../config/database.js';

/**
 * Получить график по ID сметы
 * @param {string} estimateId - ID сметы
 * @param {string} tenantId - ID компании
 * @param {string} userId - ID пользователя (для RLS)
 * @returns {Promise<Array>} - Массив работ графика, сгруппированных по фазам
 */
export async function findByEstimateId(estimateId, tenantId, userId) {
  const client = await db.getClient();
  
  try {
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);

    const query = `
      SELECT 
        id,
        phase,
        work_id,
        work_code,
        work_name,
        unit,
        quantity,
        unit_price,
        total_price,
        position_number,
        created_at
      FROM schedules
      WHERE estimate_id = $1 AND tenant_id = $2
      ORDER BY phase, position_number
    `;

    const result = await client.query(query, [estimateId, tenantId]);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Создать график на основе сметы
 * @param {string} estimateId - ID сметы
 * @param {string} projectId - ID проекта
 * @param {string} tenantId - ID компании
 * @param {string} userId - ID пользователя
 * @returns {Promise<Array>} - Созданные записи графика
 */
export async function generateFromEstimate(estimateId, projectId, tenantId, userId) {
  const client = await db.getClient();
  
  try {
    console.log('[SCHEDULES REPO] Starting transaction...');
    await client.query('BEGIN');

    // Устанавливаем контекст RLS
    console.log('[SCHEDULES REPO] Setting RLS context:', { userId, tenantId });
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);

    // Удаляем старый график если он есть
    console.log('[SCHEDULES REPO] Deleting old schedule...');
    await client.query(
      'DELETE FROM schedules WHERE estimate_id = $1 AND tenant_id = $2',
      [estimateId, tenantId]
    );

    // Получаем работы из сметы с их фазами
    console.log('[SCHEDULES REPO] Fetching estimate items...');
    const estimateQuery = `
      SELECT 
        ei.id as work_id,
        ei.name as work_name,
        w.code as work_code,
        ei.unit,
        ei.quantity,
        ei.unit_price,
        ei.final_price as total_price,
        ei.position_number,
        COALESCE(ei.phase, 'Без фазы') as phase,
        ei.section,
        ei.subsection
      FROM estimate_items ei
      LEFT JOIN works w ON ei.work_id = w.id
      WHERE ei.estimate_id = $1
        AND ei.item_type = 'work'
      ORDER BY 
        ei.phase NULLS LAST,
        ei.section NULLS LAST,
        ei.subsection NULLS LAST,
        ei.position_number
    `;

    const estimateResult = await client.query(estimateQuery, [estimateId]);
    console.log('[SCHEDULES REPO] Found works:', estimateResult.rows.length);
    
    if (estimateResult.rows.length === 0) {
      throw new Error('В смете нет работ для формирования графика');
    }

    const scheduleWorks = [];
    let position = 1;

    // Вставляем работы в график
    console.log('[SCHEDULES REPO] Inserting works into schedule...');
    for (const work of estimateResult.rows) {
      const insertQuery = `
        INSERT INTO schedules (
          tenant_id,
          project_id,
          estimate_id,
          phase,
          work_id,
          work_code,
          work_name,
          unit,
          quantity,
          unit_price,
          total_price,
          position_number,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const values = [
        tenantId,
        projectId,
        estimateId,
        work.phase || 'Без фазы',
        work.work_id,
        work.work_code || null, // work_code из таблицы works
        work.work_name,
        work.unit,
        work.quantity,
        work.unit_price,
        work.total_price || (work.quantity * work.unit_price),
        position++,
        userId
      ];

      try {
        const result = await client.query(insertQuery, values);
        scheduleWorks.push(result.rows[0]);
      } catch (insertError) {
        console.error('[SCHEDULES REPO] Error inserting work:', work, insertError);
        throw insertError;
      }
    }

    console.log('[SCHEDULES REPO] Committing transaction...');
    await client.query('COMMIT');
    console.log('[SCHEDULES REPO] Success! Created', scheduleWorks.length, 'schedule items');
    return scheduleWorks;

  } catch (error) {
    console.error('[SCHEDULES REPO] Error in generateFromEstimate:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Удалить график
 * @param {string} estimateId - ID сметы
 * @param {string} tenantId - ID компании
 * @param {string} userId - ID пользователя (для RLS)
 * @returns {Promise<boolean>} - true если удалено
 */
export async function deleteByEstimateId(estimateId, tenantId, userId) {
  const client = await db.getClient();
  
  try {
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false),
             set_config('app.current_user_role', 'admin', false)
    `, [userId, tenantId]);

    const query = `
      DELETE FROM schedules
      WHERE estimate_id = $1 AND tenant_id = $2
      RETURNING id
    `;

    const result = await client.query(query, [estimateId, tenantId]);
    return result.rows.length > 0;
  } finally {
    client.release();
  }
}

/**
 * Группировка работ графика по фазам для фронтенда
 * @param {Array} scheduleWorks - Массив работ из БД
 * @returns {Array} - Массив фаз с работами и итогами
 */
export function groupByPhases(scheduleWorks) {
  const phases = {};

  scheduleWorks.forEach(work => {
    const phase = work.phase || 'Без фазы';
    
    if (!phases[phase]) {
      phases[phase] = {
        phase: phase,
        works: [],
        phaseTotal: 0
      };
    }

    phases[phase].works.push({
      code: work.work_code,
      name: work.work_name,
      unit: work.unit,
      quantity: parseFloat(work.quantity),
      price: parseFloat(work.unit_price),
      total: parseFloat(work.total_price)
    });

    phases[phase].phaseTotal += parseFloat(work.total_price);
  });

  return Object.values(phases);
}

export default {
  findByEstimateId,
  generateFromEstimate,
  deleteByEstimateId,
  groupByPhases
};
