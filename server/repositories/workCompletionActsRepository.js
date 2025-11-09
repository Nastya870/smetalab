import db from '../config/database.js';

/**
 * Repository для работы с актами выполненных работ
 * Генерирует два типа актов:
 * 1. client - для заказчика (цены заказчика × факт.количество)
 * 2. specialist - для специалиста (базовые цены × факт.количество)
 */

/**
 * Генерация уникального номера акта
 * @param {object} client - Database client
 * @param {string} tenantId - ID компании
 * @param {string} actType - Тип акта ('client' или 'specialist')
 * @param {number} year - Год
 * @returns {Promise<string>} - Номер акта (например, ACT-CL-2025-001)
 */
async function generateActNumber(client, tenantId, actType, year = new Date().getFullYear()) {
  const prefix = actType === 'client' ? 'ACT-CL' : 'ACT-SP';
  
  // Находим последний номер за этот год
  const query = `
    SELECT act_number
    FROM work_completion_acts
    WHERE tenant_id = $1 
      AND act_type = $2
      AND EXTRACT(YEAR FROM act_date) = $3
    ORDER BY act_number DESC
    LIMIT 1
  `;
  
  const result = await client.query(query, [tenantId, actType, year]);
  
  let newNumber = 1;
  if (result.rows.length > 0) {
    // Извлекаем номер из строки вида "ACT-CL-2025-001"
    const lastNumber = result.rows[0].act_number;
    const match = lastNumber.match(/-(\d+)$/);
    if (match) {
      newNumber = parseInt(match[1], 10) + 1;
    }
  }
  
  // Форматируем: ACT-CL-2025-001
  const formattedNumber = `${prefix}-${year}-${String(newNumber).padStart(3, '0')}`;
  return formattedNumber;
}

/**
 * Генерация акта для ЗАКАЗЧИКА
 * Использует цены заказчика (с коэффициентом) × фактическое количество
 */
export async function generateClientAct(estimateId, projectId, tenantId, userId, options = {}) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    
    console.log('[ACT REPO] Generating CLIENT act for estimate:', estimateId);
    
    // Получаем выполненные работы с ценами заказчика
    // ⭐ ВАЖНО: Исключаем только работы, которые уже в актах КЛИЕНТА
    // Работы из актов специалиста должны попадать в акты клиента
    const worksQuery = `
      SELECT 
        ei.id as estimate_item_id,
        ei.work_id,
        w.code as work_code,
        ei.name as work_name,
        ei.section,
        ei.subsection,
        ei.unit,
        ei.quantity as planned_quantity,
        wc.actual_quantity,
        COALESCE(ei.unit_price, 0) as client_unit_price, -- Цена заказчика из сметы
        (wc.actual_quantity * COALESCE(ei.unit_price, 0)) as total_price,
        ei.position_number
      FROM work_completions wc
      JOIN estimate_items ei ON wc.estimate_item_id = ei.id
      LEFT JOIN works w ON ei.work_id = w.id
      LEFT JOIN work_completion_acts wca ON wc.last_act_id = wca.id
      WHERE wc.estimate_id = $1 
        AND wc.completed = true
        AND wc.actual_quantity > 0
        AND (wc.last_act_id IS NULL OR wca.act_type != 'client') -- ⭐ Исключаем только акты клиента
        AND wc.tenant_id = $2
      ORDER BY ei.section NULLS LAST, ei.subsection NULLS LAST, ei.position_number
    `;
    
    const worksResult = await client.query(worksQuery, [estimateId, tenantId]);
    console.log('[ACT REPO] Found completed works:', worksResult.rows.length);
    
    if (worksResult.rows.length > 0) {
      console.log('[ACT REPO] Sample work item:', JSON.stringify(worksResult.rows[0], null, 2));
    }
    
    if (worksResult.rows.length === 0) {
      await client.query('ROLLBACK');
      const error = new Error('Выберите выполненные работы во вкладке "Выполнение"');
      error.code = 'NO_COMPLETED_WORKS';
      throw error;
    }
    
    // Вычисляем итоги
    const totalAmount = worksResult.rows.reduce((sum, work) => sum + parseFloat(work.total_price), 0);
    const totalQuantity = worksResult.rows.reduce((sum, work) => sum + parseFloat(work.actual_quantity), 0);
    const workCount = worksResult.rows.length;
    
    // Генерируем номер акта
    const actNumber = await generateActNumber(client, tenantId, 'client');
    
    // Создаем акт
    const actInsertQuery = `
      INSERT INTO work_completion_acts (
        tenant_id,
        estimate_id,
        project_id,
        act_type,
        act_number,
        act_date,
        period_from,
        period_to,
        total_amount,
        total_quantity,
        work_count,
        status,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const actValues = [
      tenantId,
      estimateId,
      projectId,
      'client',
      actNumber,
      options.actDate || new Date(),
      options.periodFrom || null,
      options.periodTo || new Date(),
      totalAmount,
      totalQuantity,
      workCount,
      options.status || 'draft',
      userId,
      userId
    ];
    
    const actResult = await client.query(actInsertQuery, actValues);
    const act = actResult.rows[0];
    console.log('[ACT REPO] Created act:', act.id, act.act_number);
    
    // Вставляем позиции акта
    let position = 1;
    for (const work of worksResult.rows) {
      const itemInsertQuery = `
        INSERT INTO work_completion_act_items (
          act_id,
          tenant_id,
          estimate_item_id,
          work_id,
          work_code,
          work_name,
          section,
          subsection,
          unit,
          planned_quantity,
          actual_quantity,
          unit_price,
          total_price,
          position_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;
      
      const itemValues = [
        act.id,
        tenantId,
        work.estimate_item_id,
        work.work_id,
        work.work_code,
        work.work_name,
        work.section,
        work.subsection,
        work.unit,
        work.planned_quantity,
        work.actual_quantity,
        work.client_unit_price,
        work.total_price,
        position++
      ];
      
      await client.query(itemInsertQuery, itemValues);
    }
    
    // ⭐ Обновляем last_act_id для всех включенных работ
    const estimateItemIds = worksResult.rows.map(w => w.estimate_item_id);
    const updateActIdQuery = `
      UPDATE work_completions
      SET last_act_id = $1,
          updated_at = NOW(),
          updated_by = $2
      WHERE estimate_id = $3
        AND estimate_item_id = ANY($4)
        AND tenant_id = $5
    `;
    
    await client.query(updateActIdQuery, [
      act.id,
      userId,
      estimateId,
      estimateItemIds,
      tenantId
    ]);
    
    console.log(`[ACT REPO] Updated last_act_id for ${estimateItemIds.length} works`);
    
    await client.query('COMMIT');
    console.log('[ACT REPO] CLIENT act generated successfully');
    
    return act;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ACT REPO] Error generating CLIENT act:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Генерация акта для СПЕЦИАЛИСТА
 * Использует базовые цены (без коэффициента) × фактическое количество
 */
export async function generateSpecialistAct(estimateId, projectId, tenantId, userId, options = {}) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    
    console.log('[ACT REPO] Generating SPECIALIST act for estimate:', estimateId);
    
    // Получаем выполненные работы с базовыми ценами
    // ⭐ ВАЖНО: Исключаем только работы, которые уже в актах СПЕЦИАЛИСТА
    // Работы из актов клиента должны попадать в акты специалиста
    const worksQuery = `
      SELECT 
        ei.id as estimate_item_id,
        ei.work_id,
        w.code as work_code,
        ei.name as work_name,
        ei.section,
        ei.subsection,
        ei.unit,
        ei.quantity as planned_quantity,
        wc.actual_quantity,
        COALESCE(w.base_price, ei.unit_price, 0) as specialist_unit_price, -- Базовая цена из справочника или сметы
        (wc.actual_quantity * COALESCE(w.base_price, ei.unit_price, 0)) as total_price,
        ei.position_number
      FROM work_completions wc
      JOIN estimate_items ei ON wc.estimate_item_id = ei.id
      LEFT JOIN works w ON ei.work_id = w.id
      LEFT JOIN work_completion_acts wca ON wc.last_act_id = wca.id
      WHERE wc.estimate_id = $1 
        AND wc.completed = true
        AND wc.actual_quantity > 0
        AND (wc.last_act_id IS NULL OR wca.act_type != 'specialist') -- ⭐ Исключаем только акты специалиста
        AND wc.tenant_id = $2
      ORDER BY ei.section NULLS LAST, ei.subsection NULLS LAST, ei.position_number
    `;
    
    const worksResult = await client.query(worksQuery, [estimateId, tenantId]);
    console.log('[ACT REPO] Found completed works:', worksResult.rows.length);
    
    if (worksResult.rows.length > 0) {
      console.log('[ACT REPO] Sample work item:', JSON.stringify(worksResult.rows[0], null, 2));
    }
    
    if (worksResult.rows.length === 0) {
      await client.query('ROLLBACK');
      const error = new Error('Выберите выполненные работы во вкладке "Выполнение"');
      error.code = 'NO_COMPLETED_WORKS';
      throw error;
    }
    
    // Вычисляем итоги
    const totalAmount = worksResult.rows.reduce((sum, work) => sum + parseFloat(work.total_price), 0);
    const totalQuantity = worksResult.rows.reduce((sum, work) => sum + parseFloat(work.actual_quantity), 0);
    const workCount = worksResult.rows.length;
    
    // Генерируем номер акта
    const actNumber = await generateActNumber(client, tenantId, 'specialist');
    
    // Создаем акт
    const actInsertQuery = `
      INSERT INTO work_completion_acts (
        tenant_id,
        estimate_id,
        project_id,
        act_type,
        act_number,
        act_date,
        period_from,
        period_to,
        total_amount,
        total_quantity,
        work_count,
        status,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const actValues = [
      tenantId,
      estimateId,
      projectId,
      'specialist',
      actNumber,
      options.actDate || new Date(),
      options.periodFrom || null,
      options.periodTo || new Date(),
      totalAmount,
      totalQuantity,
      workCount,
      options.status || 'draft',
      userId,
      userId
    ];
    
    const actResult = await client.query(actInsertQuery, actValues);
    const act = actResult.rows[0];
    console.log('[ACT REPO] Created act:', act.id, act.act_number);
    
    // Вставляем позиции акта
    let position = 1;
    for (const work of worksResult.rows) {
      const itemInsertQuery = `
        INSERT INTO work_completion_act_items (
          act_id,
          tenant_id,
          estimate_item_id,
          work_id,
          work_code,
          work_name,
          section,
          subsection,
          unit,
          planned_quantity,
          actual_quantity,
          unit_price,
          total_price,
          position_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;
      
      const itemValues = [
        act.id,
        tenantId,
        work.estimate_item_id,
        work.work_id,
        work.work_code,
        work.work_name,
        work.section,
        work.subsection,
        work.unit,
        work.planned_quantity,
        work.actual_quantity,
        work.specialist_unit_price,
        work.total_price,
        position++
      ];
      
      await client.query(itemInsertQuery, itemValues);
    }
    
    // ⭐ Обновляем last_act_id для всех включенных работ
    const estimateItemIds = worksResult.rows.map(w => w.estimate_item_id);
    const updateActIdQuery = `
      UPDATE work_completions
      SET last_act_id = $1,
          updated_at = NOW(),
          updated_by = $2
      WHERE estimate_id = $3
        AND estimate_item_id = ANY($4)
        AND tenant_id = $5
    `;
    
    await client.query(updateActIdQuery, [
      act.id,
      userId,
      estimateId,
      estimateItemIds,
      tenantId
    ]);
    
    console.log(`[ACT REPO] Updated last_act_id for ${estimateItemIds.length} works`);
    
    await client.query('COMMIT');
    console.log('[ACT REPO] SPECIALIST act generated successfully');
    
    return act;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ACT REPO] Error generating SPECIALIST act:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Получить список актов по смете
 */
export async function findByEstimateId(estimateId, tenantId, userId, actType = null) {
  const startTime = Date.now();
  const client = await db.getClient();
  
  try {
    const rlsStart = Date.now();
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    const rlsTime = Date.now() - rlsStart;
    
    let query = `
      SELECT 
        id,
        act_type,
        act_number,
        act_date,
        period_from,
        period_to,
        total_amount,
        total_quantity,
        work_count,
        status,
        notes,
        created_at,
        updated_at
      FROM work_completion_acts
      WHERE estimate_id = $1 AND tenant_id = $2
    `;
    
    const params = [estimateId, tenantId];
    
    if (actType) {
      query += ` AND act_type = $3`;
      params.push(actType);
    }
    
    query += ` ORDER BY act_date DESC, created_at DESC`;
    
    const queryStart = Date.now();
    const result = await client.query(query, params);
    const queryTime = Date.now() - queryStart;
    
    const totalTime = Date.now() - startTime;
    console.log(`⏱️ [findByEstimateId] Total: ${totalTime}ms | RLS: ${rlsTime}ms | Query: ${queryTime}ms | Rows: ${result.rows.length}`);
    
    return result.rows;
    
  } finally {
    client.release();
  }
}

/**
 * Получить детали акта с позициями
 */
export async function findById(actId, tenantId, userId) {
  const startTime = Date.now();
  const client = await db.getClient();
  
  try {
    const rlsStart = Date.now();
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    const rlsTime = Date.now() - rlsStart;
    
    // Получаем акт
    const actQueryStart = Date.now();
    const actQuery = `
      SELECT * FROM work_completion_acts
      WHERE id = $1 AND tenant_id = $2
    `;
    
    const actResult = await client.query(actQuery, [actId, tenantId]);
    const actQueryTime = Date.now() - actQueryStart;
    
    if (actResult.rows.length === 0) {
      console.log(`⏱️ [findById] Not found in ${Date.now() - startTime}ms`);
      return null;
    }
    
    const act = actResult.rows[0];
    
    // Получаем позиции акта
    const itemsQueryStart = Date.now();
    const itemsQuery = `
      SELECT * FROM work_completion_act_items
      WHERE act_id = $1 AND tenant_id = $2
      ORDER BY position_number
    `;
    
    const itemsResult = await client.query(itemsQuery, [actId, tenantId]);
    const itemsQueryTime = Date.now() - itemsQueryStart;
    
    const totalTime = Date.now() - startTime;
    console.log(`⏱️ [findById] Total: ${totalTime}ms | RLS: ${rlsTime}ms | Act: ${actQueryTime}ms | Items: ${itemsQueryTime}ms (${itemsResult.rows.length} rows)`);
    
    return {
      ...act,
      items: itemsResult.rows
    };
    
  } finally {
    client.release();
  }
}

/**
 * Удалить акт
 */
export async function deleteById(actId, tenantId, userId) {
  const client = await db.getClient();
  
  try {
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    
    const query = `
      DELETE FROM work_completion_acts
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `;
    
    const result = await client.query(query, [actId, tenantId]);
    return result.rows.length > 0;
    
  } finally {
    client.release();
  }
}

/**
 * Обновить статус акта
 */
export async function updateStatus(actId, newStatus, tenantId, userId) {
  const client = await db.getClient();
  
  try {
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    
    const query = `
      UPDATE work_completion_acts
      SET status = $1, 
          updated_at = NOW(),
          updated_by = $2
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `;
    
    const result = await client.query(query, [newStatus, userId, actId, tenantId]);
    return result.rows[0] || null;
    
  } finally {
    client.release();
  }
}

/**
 * Группировка позиций акта по разделам для отображения
 */
export function groupItemsBySection(items) {
  const sections = {};
  
  items.forEach(item => {
    const section = item.section || 'Без раздела';
    
    if (!sections[section]) {
      sections[section] = {
        section: section,
        items: [],
        sectionTotal: 0
      };
    }
    
    sections[section].items.push(item);
    sections[section].sectionTotal += parseFloat(item.total_price);
  });
  
  return Object.values(sections);
}

/**
 * Получить данные для формы КС-2 (Акт о приемке выполненных работ)
 * @param {string} actId - ID акта
 * @param {string} tenantId - ID компании
 * @param {string} userId - ID пользователя
 * @param {Object} externalClient - Опциональный клиент БД (для переиспользования)
 * @returns {Promise<Object>} - Данные для КС-2
 */
export async function getFormKS2Data(actId, tenantId, userId, externalClient = null) {
  const client = externalClient || await db.getClient();
  const shouldRelease = !externalClient; // Освобождаем только если сами получили
  
  try {
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    
    // Получаем акт со всеми данными для КС-2
    const actQuery = `
      SELECT 
        wca.*,
        e.name as estimate_name,
        p.name as project_name,
        p.object_name as project_object,
        p.client as project_client,
        p.contractor as project_contractor,
        p.address as project_address,
        p.contract_number as project_contract_number
      FROM work_completion_acts wca
      LEFT JOIN estimates e ON wca.estimate_id = e.id
      LEFT JOIN projects p ON wca.project_id = p.id
      WHERE wca.id = $1 AND wca.tenant_id = $2
    `;
    
    const actResult = await client.query(actQuery, [actId, tenantId]);
    
    if (actResult.rows.length === 0) {
      throw new Error('Акт не найден');
    }
    
    const act = actResult.rows[0];
    
    // Получаем позиции акта
    const itemsQuery = `
      SELECT 
        position_number,
        work_code,
        work_name,
        unit,
        planned_quantity,
        actual_quantity,
        unit_price,
        total_price
      FROM work_completion_act_items
      WHERE act_id = $1 AND tenant_id = $2
      ORDER BY position_number
    `;
    
    const itemsResult = await client.query(itemsQuery, [actId, tenantId]);
    
    // Получаем подписантов
    const signatoriesQuery = `
      SELECT 
        role,
        full_name,
        position,
        signed_at
      FROM act_signatories
      WHERE act_id = $1 AND tenant_id = $2
      ORDER BY 
        CASE role
          WHEN 'contractor_chief' THEN 1
          WHEN 'contractor_accountant' THEN 2
          WHEN 'customer_chief' THEN 3
          WHEN 'customer_inspector' THEN 4
          ELSE 5
        END
    `;
    
    const signatoriesResult = await client.query(signatoriesQuery, [actId, tenantId]);
    
    // Формируем результат для КС-2
    return {
      // ОКУД 0322005
      okud: '0322005',
      formType: 'КС-2',
      
      // Номер и дата
      actNumber: act.act_number,
      actDate: act.act_date,
      
      // Подрядчик (используем данные из акта, иначе из проекта)
      contractor: {
        name: act.contractor_name || act.project_contractor || '',
        inn: act.contractor_inn || '',
        kpp: act.contractor_kpp || '',
        ogrn: act.contractor_ogrn || '',
        address: act.contractor_address || ''
      },
      
      // Заказчик (используем данные из акта, иначе из проекта)
      customer: {
        name: act.customer_name || act.project_client || '',
        inn: act.customer_inn || '',
        kpp: act.customer_kpp || '',
        ogrn: act.customer_ogrn || '',
        address: act.customer_address || ''
      },
      
      // Договор (используем данные из акта, иначе из проекта)
      contract: {
        number: act.contract_number || act.project_contract_number || '',
        date: act.contract_date || null,
        subject: act.contract_subject || ''
      },
      
      // Объект строительства (используем данные из акта, иначе из проекта)
      constructionObject: {
        name: act.construction_object || act.project_object || act.project_name || '',
        address: act.construction_address || act.project_address || '',
        okpd: act.construction_okpd || ''
      },
      
      // Период работ
      period: {
        from: act.period_from,
        to: act.period_to
      },
      
      // Работы
      works: itemsResult.rows.map(item => ({
        position: item.position_number,
        code: item.work_code,
        name: item.work_name,
        unit: item.unit,
        plannedQuantity: parseFloat(item.planned_quantity),
        actualQuantity: parseFloat(item.actual_quantity),
        price: parseFloat(item.unit_price),
        totalPrice: parseFloat(item.total_price)
      })),
      
      // Итоги
      totals: {
        amount: parseFloat(act.total_amount),
        quantity: parseFloat(act.total_quantity),
        workCount: act.work_count
      },
      
      // Подписанты
      signatories: signatoriesResult.rows.map(s => ({
        role: s.role,
        fullName: s.full_name,
        position: s.position,
        signedAt: s.signed_at
      })),
      
      // Примечания
      notes: act.notes || ''
    };
    
  } finally {
    if (shouldRelease) {
      client.release();
    }
  }
}

/**
 * Получить данные для формы КС-3 (Справка о стоимости выполненных работ)
 * @param {string} actId - ID акта
 * @param {string} tenantId - ID компании
 * @param {string} userId - ID пользователя
 * @returns {Promise<Object>} - Данные для КС-3
 */
export async function getFormKS3Data(actId, tenantId, userId) {
  const client = await db.getClient();
  
  try {
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    
    // Получаем данные акта (передаём наш client чтобы не создавать новый)
    const ks2Data = await getFormKS2Data(actId, tenantId, userId, client);
    
    // Получаем акт для расчета накопительных сумм
    const actQuery = `
      SELECT 
        act_date,
        estimate_id,
        total_amount,
        total_amount_ytd,
        prev_period_amount,
        current_period_amount
      FROM work_completion_acts
      WHERE id = $1 AND tenant_id = $2
    `;
    
    const actResult = await client.query(actQuery, [actId, tenantId]);
    const act = actResult.rows[0];
    
    // Если поля накопительного итога не заполнены, рассчитываем их
    let totalAmountYTD = act.total_amount_ytd;
    let prevPeriodAmount = act.prev_period_amount;
    let currentPeriodAmount = act.current_period_amount || act.total_amount;
    
    if (!totalAmountYTD) {
      // Рассчитываем сумму с начала года
      const ytdQuery = `
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_ytd,
          COALESCE(SUM(CASE WHEN id != $1 THEN total_amount ELSE 0 END), 0) as prev_period
        FROM work_completion_acts
        WHERE estimate_id = $2
          AND tenant_id = $3
          AND act_date <= $4
          AND EXTRACT(YEAR FROM act_date) = EXTRACT(YEAR FROM $4::date)
          AND status != 'cancelled'
      `;
      
      const ytdResult = await client.query(ytdQuery, [
        actId,
        act.estimate_id,
        tenantId,
        act.act_date
      ]);
      
      totalAmountYTD = parseFloat(ytdResult.rows[0].total_ytd);
      prevPeriodAmount = parseFloat(ytdResult.rows[0].prev_period);
      currentPeriodAmount = parseFloat(act.total_amount);
    }
    
    // Получаем работы с накопительными данными
    // ОПТИМИЗАЦИЯ: используем CTE вместо коррелированных подзапросов
    const itemsQuery = `
      WITH ytd_aggregates AS (
        -- Один раз считаем накопительные итоги для всех позиций
        SELECT 
          wci.estimate_item_id,
          -- С начала года включая текущий акт
          SUM(wci.actual_quantity) FILTER (
            WHERE wca.act_date <= $4
          ) as quantity_ytd,
          -- За предыдущие периоды (до текущего акта)
          SUM(wci.actual_quantity) FILTER (
            WHERE wca.act_date < $4
          ) as quantity_prev_period
        FROM work_completion_act_items wci
        JOIN work_completion_acts wca ON wci.act_id = wca.id
        WHERE wca.estimate_id = $2
          AND wca.tenant_id = $3
          AND EXTRACT(YEAR FROM wca.act_date) = EXTRACT(YEAR FROM $4::date)
          AND wca.status != 'cancelled'
        GROUP BY wci.estimate_item_id
      )
      SELECT 
        wci.position_number,
        wci.work_code,
        wci.work_name,
        wci.unit,
        wci.planned_quantity,
        wci.actual_quantity,
        wci.unit_price,
        wci.total_price,
        wci.estimate_item_id,
        -- Подтягиваем предрасчитанные накопительные итоги
        COALESCE(ytd.quantity_ytd, 0) as quantity_ytd,
        COALESCE(ytd.quantity_prev_period, 0) as quantity_prev_period
      FROM work_completion_act_items wci
      LEFT JOIN ytd_aggregates ytd ON wci.estimate_item_id = ytd.estimate_item_id
      WHERE wci.act_id = $1 AND wci.tenant_id = $3
      ORDER BY wci.position_number
    `;
    
    const itemsResult = await client.query(itemsQuery, [
      actId,
      act.estimate_id,
      tenantId,
      act.act_date
    ]);
    
    // Формируем результат для КС-3
    return {
      // Все данные из КС-2
      ...ks2Data,
      
      // ОКУД 0322006 (перезаписываем значения из КС-2)
      okud: '0322006',
      formType: 'КС-3',
      
      // Работы с накопительными данными
      works: itemsResult.rows.map(item => ({
        position: item.position_number,
        code: item.work_code,
        name: item.work_name,
        unit: item.unit,
        plannedQuantity: parseFloat(item.planned_quantity),
        
        // Накопительные данные
        quantityYTD: parseFloat(item.quantity_ytd), // С начала года
        quantityPrevPeriod: parseFloat(item.quantity_prev_period), // За предыдущие периоды
        quantityCurrent: parseFloat(item.actual_quantity), // В текущем периоде
        
        price: parseFloat(item.unit_price),
        
        // Стоимости
        totalPriceYTD: parseFloat(item.quantity_ytd) * parseFloat(item.unit_price),
        totalPricePrevPeriod: parseFloat(item.quantity_prev_period) * parseFloat(item.unit_price),
        totalPriceCurrent: parseFloat(item.total_price)
      })),
      
      // Итоги с накопительными данными
      totals: {
        amountYTD: totalAmountYTD, // Всего с начала года
        amountPrevPeriod: prevPeriodAmount, // В т.ч. за предыдущие периоды
        amountCurrent: currentPeriodAmount, // В текущем периоде
        workCount: ks2Data.totals.workCount
      }
    };
    
  } finally {
    client.release();
  }
}

/**
 * Обновить данные контрагентов и договора в акте
 * @param {string} actId - ID акта
 * @param {Object} data - Данные для обновления
 * @param {string} tenantId - ID компании
 * @param {string} userId - ID пользователя
 */
export async function updateActDetails(actId, data, tenantId, userId) {
  const client = await db.getClient();
  
  try {
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    
    const updateQuery = `
      UPDATE work_completion_acts
      SET 
        contractor_id = COALESCE($1, contractor_id),
        customer_id = COALESCE($2, customer_id),
        contract_number = COALESCE($3, contract_number),
        contract_date = COALESCE($4, contract_date),
        contract_subject = COALESCE($5, contract_subject),
        construction_object = COALESCE($6, construction_object),
        construction_address = COALESCE($7, construction_address),
        construction_okpd = COALESCE($8, construction_okpd),
        form_type = COALESCE($9, form_type),
        notes = COALESCE($10, notes),
        updated_at = NOW(),
        updated_by = $11
      WHERE id = $12 AND tenant_id = $13
      RETURNING *
    `;
    
    const values = [
      data.contractorId || null,
      data.customerId || null,
      data.contractNumber || null,
      data.contractDate || null,
      data.contractSubject || null,
      data.constructionObject || null,
      data.constructionAddress || null,
      data.constructionOkpd || null,
      data.formType || 'ks2-ks3',
      data.notes || null,
      userId,
      actId,
      tenantId
    ];
    
    const result = await client.query(updateQuery, values);
    return result.rows[0];
    
  } finally {
    client.release();
  }
}

/**
 * Обновить подписантов акта
 * @param {string} actId - ID акта
 * @param {Array} signatories - Массив подписантов
 * @param {string} tenantId - ID компании
 * @param {string} userId - ID пользователя
 */
export async function updateSignatories(actId, signatories, tenantId, userId) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    
    // Удаляем старых подписантов
    await client.query(
      'DELETE FROM act_signatories WHERE act_id = $1 AND tenant_id = $2',
      [actId, tenantId]
    );
    
    // Вставляем новых подписантов
    for (const signatory of signatories) {
      const insertQuery = `
        INSERT INTO act_signatories (
          act_id,
          tenant_id,
          role,
          full_name,
          position,
          signed_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await client.query(insertQuery, [
        actId,
        tenantId,
        signatory.role,
        signatory.fullName,
        signatory.position || null,
        signatory.signedAt || null
      ]);
    }
    
    await client.query('COMMIT');
    return true;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default {
  generateClientAct,
  generateSpecialistAct,
  findByEstimateId,
  findById,
  deleteById,
  updateStatus,
  groupItemsBySection,
  getFormKS2Data,
  getFormKS3Data,
  updateActDetails,
  updateSignatories
};
