import db from '../config/database.js';

/**
 * Создать фактическую закупку материала
 */
export const createGlobalPurchase = async (tenantId, userId, purchaseData) => {
  const {
    projectId,
    estimateId,
    materialId,
    quantity,
    purchasePrice,
    purchaseDate,
    sourcePurchaseId,
    isExtraCharge
  } = purchaseData;

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);

    // Получаем данные материала для денормализации
    const materialResult = await client.query(
      `SELECT m.id, m.sku, m.name, m.unit, m.category, m.category_id, m.category_full_path, m.image,
              p.name as project_name,
              e.name as estimate_name
       FROM materials m, projects p, estimates e
       WHERE m.id = $3 AND p.id = $1 AND e.id = $2`,
      [projectId, estimateId, materialId]
    );

    if (materialResult.rows.length === 0) {
      throw new Error('Material, project or estimate not found');
    }

    const material = materialResult.rows[0];
    const totalPrice = parseFloat(quantity) * parseFloat(purchasePrice);

    // Вставляем фактическую закупку
    const result = await client.query(
      `INSERT INTO global_purchases (
        tenant_id, project_id, estimate_id, material_id,
        material_sku, material_name, material_image, unit, category, category_id, category_full_path,
        quantity, purchase_price, total_price,
        source_purchase_id, purchase_date,
        project_name, estimate_name, created_by, is_extra_charge
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [
        tenantId,
        projectId,
        estimateId,
        materialId,
        material.sku,
        material.name,
        material.image,
        material.unit,
        material.category,
        material.category_id,
        material.category_full_path,
        quantity,
        purchasePrice,
        totalPrice,
        sourcePurchaseId || null,
        purchaseDate,
        material.project_name,
        material.estimate_name,
        userId,
        isExtraCharge || false
      ]
    );

    // Обновляем purchased_quantity в таблице purchases для ВСЕХ материалов (и обычных, и О/Ч)
    if (sourcePurchaseId) {
      await client.query(
        `UPDATE purchases 
         SET purchased_quantity = purchased_quantity + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND tenant_id = $3`,
        [quantity, sourcePurchaseId, tenantId]
      );
    }

    await client.query('COMMIT');
    return result.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[GLOBAL PURCHASES REPO] Error creating purchase:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Получить все фактические закупки с фильтрацией
 */
export const findAllGlobalPurchases = async (tenantId, userId, filters = {}) => {
  const { projectId, estimateId, materialId, dateFrom, dateTo } = filters;

  console.log('🗄️ [REPOSITORY] findAllGlobalPurchases');
  console.log('   tenantId:', tenantId);
  console.log('   userId:', userId);
  console.log('   filters:', filters);

  const client = await db.getClient();

  try {
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);

    let query = `
      SELECT 
        gp.*,
        m.sku as current_material_sku,
        m.name as current_material_name
      FROM global_purchases gp
      LEFT JOIN materials m ON gp.material_id = m.id
      WHERE gp.tenant_id = $1
    `;

    const params = [tenantId];
    let paramIndex = 2;

    if (projectId) {
      console.log(`   ➕ Добавлен фильтр projectId: ${projectId} (param $${paramIndex})`);
      query += ` AND gp.project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    if (estimateId) {
      console.log(`   ➕ Добавлен фильтр estimateId: ${estimateId} (param $${paramIndex})`);
      query += ` AND gp.estimate_id = $${paramIndex}`;
      params.push(estimateId);
      paramIndex++;
    }

    if (materialId) {
      console.log(`   ➕ Добавлен фильтр materialId: ${materialId} (param $${paramIndex})`);
      query += ` AND gp.material_id = $${paramIndex}`;
      params.push(materialId);
      paramIndex++;
    }

    if (dateFrom) {
      console.log(`   ➕ Добавлен фильтр dateFrom: ${dateFrom} (param $${paramIndex})`);
      query += ` AND gp.purchase_date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      console.log(`   ➕ Добавлен фильтр dateTo: ${dateTo} (param $${paramIndex})`);
      query += ` AND gp.purchase_date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    query += ` ORDER BY gp.purchase_date DESC, gp.created_at DESC`;

    console.log('   📝 SQL Query:', query);
    console.log('   📦 Params:', params);

    const result = await client.query(query, params);

    console.log(`   ✅ Найдено записей: ${result.rows.length}`);

    return result.rows;

  } finally {
    client.release();
  }
};

/**
 * Получить закупку по ID
 */
export const findGlobalPurchaseById = async (tenantId, userId, purchaseId) => {
  const client = await db.getClient();

  try {
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);

    const result = await client.query(
      `SELECT gp.*, 
              m.sku as current_material_sku,
              m.name as current_material_name
       FROM global_purchases gp
       LEFT JOIN materials m ON gp.material_id = m.id
       WHERE gp.id = $1 AND gp.tenant_id = $2`,
      [purchaseId, tenantId]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
};

/**
 * Обновить фактическую закупку
 */
export const updateGlobalPurchase = async (tenantId, userId, purchaseId, updateData) => {
  const { quantity, purchasePrice, purchaseDate } = updateData;

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);

    // Получаем старые данные для пересчета purchased_quantity
    const oldData = await client.query(
      `SELECT quantity, source_purchase_id FROM global_purchases 
       WHERE id = $1 AND tenant_id = $2`,
      [purchaseId, tenantId]
    );

    if (oldData.rows.length === 0) {
      throw new Error('Purchase not found');
    }

    const oldQuantity = parseFloat(oldData.rows[0].quantity);
    const newQuantity = parseFloat(quantity);
    const totalPrice = newQuantity * parseFloat(purchasePrice);
    const sourcePurchaseId = oldData.rows[0].source_purchase_id;

    // Обновляем закупку
    const result = await client.query(
      `UPDATE global_purchases 
       SET quantity = $1,
           purchase_price = $2,
           total_price = $3,
           purchase_date = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND tenant_id = $6
       RETURNING *`,
      [newQuantity, purchasePrice, totalPrice, purchaseDate, purchaseId, tenantId]
    );

    // Обновляем purchased_quantity если количество изменилось
    if (sourcePurchaseId && oldQuantity !== newQuantity) {
      const quantityDiff = newQuantity - oldQuantity;
      await client.query(
        `UPDATE purchases 
         SET purchased_quantity = purchased_quantity + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND tenant_id = $3`,
        [quantityDiff, sourcePurchaseId, tenantId]
      );
    }

    await client.query('COMMIT');
    return result.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[GLOBAL PURCHASES REPO] Error updating purchase:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Удалить фактическую закупку
 */
export const deleteGlobalPurchase = async (tenantId, userId, purchaseId) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);

    // Получаем данные для отката purchased_quantity
    const purchaseData = await client.query(
      `SELECT quantity, source_purchase_id FROM global_purchases 
       WHERE id = $1 AND tenant_id = $2`,
      [purchaseId, tenantId]
    );

    if (purchaseData.rows.length === 0) {
      throw new Error('Purchase not found');
    }

    const { quantity, source_purchase_id } = purchaseData.rows[0];

    // Удаляем закупку
    await client.query(
      `DELETE FROM global_purchases 
       WHERE id = $1 AND tenant_id = $2`,
      [purchaseId, tenantId]
    );

    // Откатываем purchased_quantity
    if (source_purchase_id) {
      await client.query(
        `UPDATE purchases 
         SET purchased_quantity = purchased_quantity - $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND tenant_id = $3`,
        [quantity, source_purchase_id, tenantId]
      );
    }

    await client.query('COMMIT');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[GLOBAL PURCHASES REPO] Error deleting purchase:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Получить даты с закупками для календаря
 */
export const getCalendarDates = async (tenantId, userId, year, month) => {
  const client = await db.getClient();

  try {
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);

    const result = await client.query(
      `SELECT 
        purchase_date,
        COUNT(*) as count,
        SUM(total_price) as total_sum
       FROM global_purchases
       WHERE tenant_id = $1
         AND EXTRACT(YEAR FROM purchase_date) = $2
         AND EXTRACT(MONTH FROM purchase_date) = $3
       GROUP BY purchase_date
       ORDER BY purchase_date`,
      [tenantId, year, month]
    );

    return result.rows.map(row => ({
      date: row.purchase_date,
      count: parseInt(row.count),
      totalSum: parseFloat(row.total_sum)
    }));

  } finally {
    client.release();
  }
};

/**
 * Получить статистику по закупкам
 */
export const getStatistics = async (tenantId, userId, filters = {}) => {
  const { projectId, dateFrom, dateTo } = filters;

  const client = await db.getClient();

  try {
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);

    let query = `
      SELECT 
        COUNT(*) as total_purchases,
        COUNT(DISTINCT material_id) as unique_materials,
        COUNT(DISTINCT project_id) as projects_count,
        SUM(total_price) as total_spent,
        SUM(quantity) as total_quantity
      FROM global_purchases
      WHERE tenant_id = $1
    `;

    const params = [tenantId];
    let paramIndex = 2;

    if (projectId) {
      query += ` AND project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    if (dateFrom) {
      query += ` AND purchase_date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND purchase_date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    const result = await client.query(query, params);

    return {
      totalPurchases: parseInt(result.rows[0].total_purchases) || 0,
      uniqueMaterials: parseInt(result.rows[0].unique_materials) || 0,
      projectsCount: parseInt(result.rows[0].projects_count) || 0,
      totalSpent: parseFloat(result.rows[0].total_spent) || 0,
      totalQuantity: parseFloat(result.rows[0].total_quantity) || 0
    };

  } finally {
    client.release();
  }
};
