/**
 * Repository для работы со сметами в базе данных
 */

import db from '../config/database.js';
const pool = db.pool;

/**
 * Получить все сметы проекта
 * @param {string} projectId - ID проекта
 * @param {string} tenantId - ID компании (для изоляции)
 * @returns {Promise<Array>} - Массив смет
 */
export async function findByProjectId(projectId, tenantId) {
  const query = `
    SELECT 
      e.*,
      p.name as project_name,
      u.full_name as created_by_name,
      COUNT(ei.id) as items_count
    FROM estimates e
    LEFT JOIN projects p ON e.project_id = p.id
    LEFT JOIN users u ON e.created_by = u.id
    LEFT JOIN estimate_items ei ON e.id = ei.estimate_id
    WHERE e.project_id = $1 
      AND e.tenant_id = $2
    GROUP BY e.id, p.name, u.full_name
    ORDER BY e.created_at DESC
  `;

  const result = await pool.query(query, [projectId, tenantId]);
  return result.rows;
}

/**
 * Получить смету по ID
 * @param {string} estimateId - ID сметы
 * @param {string} tenantId - ID компании (для изоляции)
 * @returns {Promise<Object|null>} - Смета или null
 */
export async function findById(estimateId, tenantId) {
  const query = `
    SELECT 
      e.*,
      p.name as project_name,
      p.object_name as project_object_name,
      p.client as client_name,
      p.contractor as contractor_name,
      p.address as object_address,
      p.contract_number as contract_number,
      u.full_name as created_by_name,
      u.email as created_by_email
    FROM estimates e
    LEFT JOIN projects p ON e.project_id = p.id
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.id = $1 
      AND e.tenant_id = $2
  `;

  const result = await pool.query(query, [estimateId, tenantId]);
  
  // ✅ Логируем для отладки
  if (result.rows[0]) {
    console.log('📊 Estimate DB data:', {
      estimate_id: result.rows[0].id,
      project_id: result.rows[0].project_id,
      client_name: result.rows[0].client_name,
      contractor_name: result.rows[0].contractor_name,
      object_address: result.rows[0].object_address,
      contract_number: result.rows[0].contract_number,
    });
  }
  
  return result.rows[0] || null;
}

/**
 * Создать новую смету
 * @param {Object} data - Данные сметы
 * @param {string} tenantId - ID компании
 * @param {string} userId - ID пользователя-создателя
 * @returns {Promise<Object>} - Созданная смета
 */
export async function create(data, tenantId, userId) {
  const {
    projectId,
    name,
    description,
    estimateType,
    status = 'draft',
    currency = 'RUB',
    estimateDate,
    validUntil
  } = data;

  const query = `
    INSERT INTO estimates (
      tenant_id,
      project_id,
      name,
      description,
      estimate_type,
      status,
      currency,
      estimate_date,
      valid_until,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const values = [
    tenantId,
    projectId,
    name,
    description || null,
    estimateType,
    status,
    currency,
    estimateDate || new Date(),
    validUntil || null,
    userId
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Обновить смету
 * @param {string} estimateId - ID сметы
 * @param {Object} data - Обновляемые данные
 * @param {string} tenantId - ID компании (для изоляции)
 * @param {string} userId - ID пользователя
 * @returns {Promise<Object>} - Обновленная смета
 */
export async function update(estimateId, data, tenantId, userId) {
  const {
    name,
    description,
    estimateType,
    status,
    currency,
    estimateDate,
    validUntil
    // ✅ УБРАЛИ: clientName, contractorName, objectAddress, contractNumber
    // Эти данные хранятся в таблице projects, а не в estimates
  } = data;

  const query = `
    UPDATE estimates
    SET 
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      estimate_type = COALESCE($3, estimate_type),
      status = COALESCE($4, status),
      currency = COALESCE($5, currency),
      estimate_date = COALESCE($6, estimate_date),
      valid_until = $7,
      updated_by = $8,
      updated_at = NOW()
    WHERE id = $9 
      AND tenant_id = $10
    RETURNING *
  `;

  const values = [
    name,
    description,
    estimateType,
    status,
    currency,
    estimateDate,
    validUntil,
    userId,
    estimateId,
    tenantId
  ];

  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    throw new Error('Смета не найдена или нет доступа');
  }

  return result.rows[0];
}

/**
 * Удалить смету
 * @param {string} estimateId - ID сметы
 * @param {string} tenantId - ID компании (для изоляции)
 * @returns {Promise<boolean>} - true если удалено
 */
export async function deleteEstimate(estimateId, tenantId) {
  const query = `
    DELETE FROM estimates
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `;

  const result = await pool.query(query, [estimateId, tenantId]);
  
  if (result.rows.length === 0) {
    throw new Error('Смета не найдена или нет доступа');
  }

  return true;
}

/**
 * Получить статистику по смете
 * @param {string} estimateId - ID сметы
 * @param {string} tenantId - ID компании
 * @returns {Promise<Object>} - Статистика сметы
 */
export async function getStatistics(estimateId, tenantId) {
  const query = `
    SELECT 
      COUNT(*)::int AS items_count,
      COUNT(*) FILTER (WHERE item_type = 'work')::int AS works_count,
      COUNT(*) FILTER (WHERE item_type = 'material')::int AS materials_count,
      COALESCE(SUM(quantity), 0) AS total_quantity,
      COALESCE(SUM(total_price), 0) AS base_total,
      COALESCE(SUM(final_price), 0) AS final_total
    FROM estimate_items ei
    JOIN estimates e ON ei.estimate_id = e.id
    WHERE ei.estimate_id = $1 
      AND e.tenant_id = $2
  `;

  const result = await pool.query(query, [estimateId, tenantId]);
  return result.rows[0];
}

/**
 * Получить полную смету с items и materials
 * @param {string} estimateId - ID сметы
 * @returns {Promise<Object|null>} - Полная смета
 */
export async function findByIdWithDetails(estimateId, tenantId) {
  try {
    console.log(`[findByIdWithDetails] Loading estimate ${estimateId} for tenant ${tenantId}`);
    
    // Получаем основную информацию о смете
    const estimateQuery = `
      SELECT e.*, p.name as project_name
      FROM estimates e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.id = $1 AND e.tenant_id = $2
    `;
    
    const estimateResult = await pool.query(estimateQuery, [estimateId, tenantId]);
    
    if (estimateResult.rows.length === 0) {
      console.log(`[findByIdWithDetails] Estimate not found`);
      return null;
    }
    
    const estimate = estimateResult.rows[0];
    console.log(`[findByIdWithDetails] Found estimate: ${estimate.name}`);
    
    // Получаем позиции сметы (включая work_id для проверки дублей)
    const itemsQuery = `
      SELECT * FROM estimate_items 
      WHERE estimate_id = $1 
      ORDER BY position_number
    `;
    
    const itemsResult = await pool.query(itemsQuery, [estimateId]);
    console.log(`[findByIdWithDetails] Found ${itemsResult.rows.length} items`);
    
    // Для каждой позиции получаем материалы
    const items = await Promise.all(
      itemsResult.rows.map(async (item, index) => {
        try {
          const materialsQuery = `
            SELECT 
              eim.id,
              eim.quantity,
              eim.unit_price,
              eim.total_price,
              eim.consumption_coefficient,
              eim.is_required,
              eim.notes,
              m.id as material_id,
              m.sku,
              m.name as material_name,
              m.unit,
              m.category,
              m.price as material_base_price,
              m.consumption,
              m.image
            FROM estimate_item_materials eim
            JOIN materials m ON eim.material_id = m.id
            WHERE eim.estimate_item_id = $1
            ORDER BY m.name
          `;
          
          const materialsResult = await pool.query(materialsQuery, [item.id]);
          
          // 🔧 Пересчитываем total для каждого материала при загрузке
          const materialsWithTotal = materialsResult.rows.map(material => ({
            ...material,
            // Добавляем поле total (фронтенд ожидает именно его)
            total: parseFloat((material.quantity * material.unit_price).toFixed(2)),
            // Цена из материала используется как unit_price если не задана вручную
            price: material.unit_price || material.material_base_price
          }));
          
          return {
            ...item,
            // 🔧 ИСПРАВЛЕНИЕ: Пересчитываем final_price для работы при загрузке
            final_price: item.final_price || parseFloat((item.quantity * item.unit_price).toFixed(2)),
            materials: materialsWithTotal
          };
        } catch (itemError) {
          console.error(`[findByIdWithDetails] ❌ Error loading materials for item #${index} (${item.id}):`, itemError);
          throw itemError;
        }
      })
    );
    
    console.log(`[findByIdWithDetails] ✅ Successfully loaded estimate with ${items.length} items`);
    
    return {
      ...estimate,
      items
    };
  } catch (error) {
    console.error('[findByIdWithDetails] ❌ Fatal error:', error);
    throw error;
  }
}

/**
 * Создать смету с items и materials (транзакция)
 * @param {Object} data - Полные данные сметы
 * @param {string} tenantId - ID компании
 * @param {string} userId - ID пользователя
 * @returns {Promise<Object>} - Созданная смета
 */
export async function createWithDetails(data, tenantId, userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      projectId,
      name,
      description,
      estimateType,
      status = 'draft',
      currency = 'RUB',
      estimateDate,
      validUntil,
      items = []
    } = data;
    
    // Создаем смету
    const estimateQuery = `
      INSERT INTO estimates (
        tenant_id, project_id, name, description, 
        estimate_type, status, currency, 
        estimate_date, valid_until, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const estimateResult = await client.query(estimateQuery, [
      tenantId, projectId, name, description || '',
      estimateType, status, currency,
      estimateDate || new Date(), validUntil, userId
    ]);
    
    const estimate = estimateResult.rows[0];
    const createdItems = [];
    let totalAmount = 0;
    
    // Создаем позиции сметы
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      const itemQuery = `
        INSERT INTO estimate_items (
          estimate_id, position_number, item_type, name, description,
          code, unit, quantity, unit_price,
          source_type, phase, section, subsection,
          overhead_percent, profit_percent, tax_percent,
          is_optional, notes, work_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `;
      
      const itemResult = await client.query(itemQuery, [
        estimate.id,
        i + 1,
        item.item_type || 'work',
        item.name,
        item.description || '',
        item.code || '',
        item.unit,
        item.quantity,
        item.unit_price,
        item.source_type || 'global',
        item.phase || null,
        item.section || null,
        item.subsection || null,
        item.overhead_percent || 0,
        item.profit_percent || 0,
        item.tax_percent || 0,
        item.is_optional || false,
        item.notes || '',
        item.workId || null // ★ Добавили work_id для связи с справочником
      ]);
      
      const createdItem = itemResult.rows[0];
      // total_price и final_price вычисляются автоматически БД
      totalAmount += parseFloat(createdItem.final_price || createdItem.total_price || 0);
      
      // Добавляем материалы к позиции
      if (item.materials && item.materials.length > 0) {
        for (const material of item.materials) {
          // Пропускаем материалы без material_id (ручные добавления)
          if (!material.material_id) {
            console.log('Skipping material without material_id:', material);
            continue;
          }
          
          await client.query(
            `INSERT INTO estimate_item_materials (
              estimate_item_id, material_id, quantity, unit_price,
              consumption_coefficient, is_required, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              createdItem.id,
              material.material_id, // только реальный ID
              material.quantity,
              material.unit_price || material.price,
              material.consumption || material.consumption_coefficient || 1.0,
              material.is_required !== false,
              material.notes || ''
            ]
          );
        }
      }
      
      createdItems.push(createdItem);
    }
    
    // Обновляем total_amount сметы
    await client.query(
      'UPDATE estimates SET total_amount = $1 WHERE id = $2',
      [totalAmount, estimate.id]
    );
    
    await client.query('COMMIT');
    
    return {
      ...estimate,
      total_amount: totalAmount,
      items: createdItems
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default {
  findByProjectId,
  findById,
  create,
  update,
  deleteEstimate,
  getStatistics,
  findByIdWithDetails,
  createWithDetails
};
