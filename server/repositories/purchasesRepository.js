import db from '../config/database.js';

/**
 * Сформировать закупки из сметы (группировка материалов)
 * Материалы с одинаковым material_id суммируются
 */
export const generatePurchases = async (tenantId, projectId, estimateId, userId) => {
  const client = await db.getClient();
  
  try {
    console.log('[PURCHASES REPO] Starting transaction...');
    await client.query('BEGIN');

    // Устанавливаем контекст RLS
    console.log('[PURCHASES REPO] Setting RLS context:', { userId, tenantId });
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);

    // Сохраняем purchased_quantity из существующих закупок перед удалением
    console.log('[PURCHASES REPO] Saving purchased quantities...');
    const existingPurchasesResult = await client.query(
      `SELECT material_id, purchased_quantity 
       FROM purchases 
       WHERE estimate_id = $1 AND tenant_id = $2 AND is_extra_charge = false`,
      [estimateId, tenantId]
    );
    
    const purchasedQuantities = {};
    existingPurchasesResult.rows.forEach(row => {
      purchasedQuantities[row.material_id] = parseFloat(row.purchased_quantity) || 0;
    });
    console.log('[PURCHASES REPO] Saved purchased quantities:', Object.keys(purchasedQuantities).length);

    // Удаляем только обычные закупки (НЕ О/Ч материалы!)
    console.log('[PURCHASES REPO] Deleting old regular purchases (keeping extra charges)...');
    await client.query(
      `DELETE FROM purchases 
       WHERE estimate_id = $1 
         AND tenant_id = $2 
         AND (is_extra_charge = false OR is_extra_charge IS NULL)`,
      [estimateId, tenantId]
    );

    // Группируем материалы по material_id и суммируем количество
    console.log('[PURCHASES REPO] Fetching and grouping materials...');
    const materialsResult = await client.query(
      `SELECT 
        eim.material_id,
        m.sku as material_sku,
        m.name as material_name,
        m.category,
        m.unit,
        m.image as material_image,
        SUM(eim.quantity) as quantity,
        SUM(eim.total_price) / NULLIF(SUM(eim.quantity), 0) as unit_price,
        SUM(eim.total_price) as total_price
       FROM estimate_item_materials eim
       JOIN estimate_items ei ON eim.estimate_item_id = ei.id
       JOIN materials m ON eim.material_id = m.id
       WHERE ei.estimate_id = $1
         AND eim.quantity > 0
       GROUP BY 
         eim.material_id, 
         m.sku, 
         m.name, 
         m.category, 
         m.unit,
         m.image
       ORDER BY m.sku ASC NULLS LAST, m.name ASC`,
      [estimateId]
    );
    console.log('[PURCHASES REPO] Found materials:', materialsResult.rows.length);

    const materials = materialsResult.rows;
    
    console.log('[PURCHASES REPO] Sample material data:', materials[0]);

    // Вставляем сгруппированные материалы в purchases
    if (materials.length > 0) {
      const insertValues = [];
      const insertParams = [];
      let paramIndex = 1;

      for (const material of materials) {
        // Проверяем и очищаем данные
        const quantity = parseFloat(material.quantity) || 0;
        const unit_price = parseFloat(material.unit_price) || 0;
        const total_price = parseFloat(material.total_price) || 0;
        
        if (quantity === 0) {
          console.warn('[PURCHASES REPO] Skipping material with zero quantity:', material.material_name);
          continue;
        }
        
        // Восстанавливаем purchased_quantity из сохраненных данных
        const purchasedQty = purchasedQuantities[material.material_id] || 0;
        
        insertValues.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, ` +
          `$${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, ` +
          `$${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12})`
        );
        
        insertParams.push(
          tenantId,
          projectId,
          estimateId,
          material.material_id,
          material.material_sku,
          material.material_name,
          material.category,
          material.unit,
          material.material_image,
          quantity,
          unit_price,
          total_price,
          purchasedQty // Восстанавливаем purchased_quantity
        );
        
        paramIndex += 13;
      }

      if (insertValues.length > 0) {
        console.log('[PURCHASES REPO] Inserting', insertValues.length, 'materials into purchases...');
        await client.query(
          `INSERT INTO purchases (
            tenant_id, project_id, estimate_id, material_id,
            material_sku, material_name, category, unit, material_image,
            quantity, unit_price, total_price, purchased_quantity
           ) VALUES ${insertValues.join(', ')}
           ON CONFLICT (estimate_id, material_id) 
           DO UPDATE SET
             quantity = EXCLUDED.quantity,
             unit_price = EXCLUDED.unit_price,
             total_price = EXCLUDED.total_price,
             material_image = EXCLUDED.material_image,
             purchased_quantity = EXCLUDED.purchased_quantity,
             updated_at = CURRENT_TIMESTAMP`,
          insertParams
        );
        console.log('[PURCHASES REPO] Successfully inserted materials with preserved purchased_quantity');
      } else {
        console.log('[PURCHASES REPO] No valid materials to insert');
      }
    }

    await client.query('COMMIT');
    console.log('[PURCHASES REPO] Transaction committed successfully');

    // Возвращаем сформированные закупки с восстановленными purchased_quantity
    return materials.map(m => ({
      id: null, // ID будет только после вставки в БД, пока null
      materialId: m.material_id,
      sku: m.material_sku,
      name: m.material_name,
      category: m.category,
      unit: m.unit,
      image: m.material_image,
      quantity: parseFloat(m.quantity) || 0,
      price: parseFloat(m.unit_price) || 0,
      total: parseFloat(m.total_price) || 0,
      purchasedQuantity: purchasedQuantities[m.material_id] || 0 // Восстанавливаем из сохраненных
    }));

  } catch (error) {
    console.error('[PURCHASES REPO] Error in generatePurchases:', error);
    console.error('[PURCHASES REPO] Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Получить закупки по ID сметы
 */
export const getPurchasesByEstimate = async (tenantId, estimateId, userId) => {
  const client = await db.getClient();
  
  try {
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);

    const result = await client.query(
      `SELECT 
        p.id,
        p.material_id,
        p.material_sku as sku,
        p.material_name as name,
        p.category,
        p.unit,
        p.material_image as image,
        p.quantity,
        p.unit_price as price,
        p.total_price as total,
        p.purchased_quantity,
        COALESCE(p.is_extra_charge, false) as is_extra_charge,
        -- Фактические закупки (агрегация из global_purchases)
        COALESCE(SUM(gp.quantity), 0) as actual_purchased_quantity,
        CASE 
          WHEN COUNT(gp.id) > 0 THEN AVG(gp.purchase_price)
          ELSE NULL
        END as avg_purchase_price,
        COALESCE(SUM(gp.total_price), 0) as actual_total_price
       FROM purchases p
       LEFT JOIN global_purchases gp 
         ON p.id = gp.source_purchase_id 
         AND gp.tenant_id = p.tenant_id
       WHERE p.tenant_id = $1 AND p.estimate_id = $2
       GROUP BY p.id, p.material_id, p.material_sku, p.material_name, 
                p.category, p.unit, p.material_image, p.quantity, 
                p.unit_price, p.total_price, p.purchased_quantity, p.is_extra_charge
       ORDER BY 
         COALESCE(p.is_extra_charge, false) ASC,
         p.material_sku ASC NULLS LAST, 
         p.material_name ASC`,
      [tenantId, estimateId]
    );

    // Преобразуем material_id в camelCase для единообразия
    const purchases = result.rows.map(row => ({
      id: row.id,
      materialId: row.material_id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      unit: row.unit,
      image: row.image,
      quantity: parseFloat(row.quantity) || 0,
      price: parseFloat(row.price) || 0,
      total: parseFloat(row.total) || 0,
      purchasedQuantity: parseFloat(row.purchased_quantity) || 0,
      isExtraCharge: row.is_extra_charge || false,
      // Фактические данные из global_purchases
      actualPurchasedQuantity: parseFloat(row.actual_purchased_quantity) || 0,
      avgPurchasePrice: row.avg_purchase_price ? parseFloat(row.avg_purchase_price) : null,
      actualTotalPrice: parseFloat(row.actual_total_price) || 0
    }));

    return purchases;
  } finally {
    client.release();
  }
};

/**
 * Удалить закупки
 */
export const deletePurchases = async (tenantId, estimateId, userId) => {
  const client = await db.getClient();
  
  try {
    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);

    await client.query(
      `DELETE FROM purchases 
       WHERE tenant_id = $1 AND estimate_id = $2`,
      [tenantId, estimateId]
    );
  } finally {
    client.release();
  }
};

/**
 * Создать материал О/Ч в закупках проекта
 */
export const createExtraCharge = async (tenantId, projectId, estimateId, materialId, quantity, price, userId) => {
  const client = await db.getClient();
  
  try {
    console.log('[PURCHASES REPO] Creating Extra Charge:', { 
      tenantId, projectId, estimateId, materialId, quantity, price, userId 
    });

    // Устанавливаем контекст RLS
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);

    // Получаем данные материала (может быть глобальным или тенантным)
    const materialResult = await client.query(
      `SELECT id, sku, name, category, unit, image 
       FROM materials 
       WHERE id = $1 
         AND (tenant_id = $2 OR is_global = TRUE)`,
      [materialId, tenantId]
    );

    if (materialResult.rows.length === 0) {
      throw new Error('Материал не найден');
    }

    const material = materialResult.rows[0];

    // Создаем запись в purchases с флагом is_extra_charge
    const insertResult = await client.query(
      `INSERT INTO purchases (
        tenant_id,
        project_id,
        estimate_id,
        material_id,
        material_sku,
        material_name,
        category,
        unit,
        material_image,
        quantity,
        unit_price,
        total_price,
        is_extra_charge
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
      RETURNING *`,
      [
        tenantId,
        projectId,
        estimateId,
        materialId,
        material.sku,
        material.name,
        material.category,
        material.unit,
        material.image,
        quantity,
        price,
        quantity * price
      ]
    );

    const purchase = insertResult.rows[0];

    console.log('[PURCHASES REPO] Extra Charge created:', purchase);

    // Возвращаем с данными материала
    return {
      ...purchase,
      sku: material.sku,
      name: material.name,
      category: material.category,
      unit: material.unit,
      image: material.image,
      isExtraCharge: true,
      purchasedQuantity: 0 // Еще не закуплено
    };

  } finally {
    client.release();
  }
};
