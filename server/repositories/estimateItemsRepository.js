/**
 * Repository для работы с позициями смет (estimate_items)
 */

import db from '../config/database.js';

/**
 * Получить все позиции сметы
 */
export async function findByEstimateId(estimateId, tenantId) {
  const query = `
    SELECT 
      ei.*,
      e.tenant_id
    FROM estimate_items ei
    JOIN estimates e ON ei.estimate_id = e.id
    WHERE ei.estimate_id = $1
      AND e.tenant_id = $2
    ORDER BY ei.position_number ASC
  `;

  const result = await db.query(query, [estimateId, tenantId]);
  return result.rows;
}

/**
 * Получить позицию по ID
 */
export async function findById(id, tenantId) {
  const query = `
    SELECT 
      ei.*,
      e.tenant_id
    FROM estimate_items ei
    JOIN estimates e ON ei.estimate_id = e.id
    WHERE ei.id = $1
      AND e.tenant_id = $2
  `;

  const result = await db.query(query, [id, tenantId]);
  return result.rows[0];
}

/**
 * Создать новую позицию
 */
export async function create(itemData, estimateId, tenantId) {
  // Проверяем доступ к смете
  const checkQuery = `
    SELECT id FROM estimates
    WHERE id = $1 AND tenant_id = $2
  `;
  const checkResult = await db.query(checkQuery, [estimateId, tenantId]);
  
  if (checkResult.rows.length === 0) {
    throw new Error('Смета не найдена или нет доступа');
  }

  // Получаем следующий position_number
  const positionQuery = `
    SELECT COALESCE(MAX(position_number), 0) + 1 as next_position
    FROM estimate_items
    WHERE estimate_id = $1
  `;
  const positionResult = await db.query(positionQuery, [estimateId]);
  const positionNumber = positionResult.rows[0].next_position;

  // Создаем позицию
  const insertQuery = `
    INSERT INTO estimate_items (
      estimate_id,
      position_number,
      item_type,
      name,
      description,
      code,
      unit,
      quantity,
      unit_price,
      overhead_percent,
      profit_percent,
      tax_percent,
      notes,
      is_optional,
      source_type,
      work_id,
      phase,
      section,
      subsection
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *
  `;

  const values = [
    estimateId,
    positionNumber,
    itemData.item_type || 'work',
    itemData.name,
    itemData.description || null,
    itemData.code || null,
    itemData.unit,
    itemData.quantity,
    itemData.unit_price,
    itemData.overhead_percent || 0,
    itemData.profit_percent || 0,
    itemData.tax_percent || 0,
    itemData.notes || null,
    itemData.is_optional || false,
    itemData.source_type || 'tenant',
    itemData.workId || null, // ✅ Добавлено! Сохраняем ID работы из справочника
    itemData.phase || null,
    itemData.section || null,
    itemData.subsection || null
  ];

  const result = await db.query(insertQuery, values);
  const createdItem = result.rows[0];
  
  // Если есть материалы, добавляем их
  if (itemData.materials && Array.isArray(itemData.materials) && itemData.materials.length > 0) {
    for (const material of itemData.materials) {
      // Пропускаем материалы без material_id
      if (!material.material_id) {
        console.log('Skipping material without material_id:', material);
        continue;
      }
      
      await db.query(
        `INSERT INTO estimate_item_materials (
          estimate_item_id, material_id, quantity, unit_price,
          consumption_coefficient, is_required, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          createdItem.id,
          material.material_id,
          material.quantity,
          material.unit_price || material.price,
          material.consumption || material.consumption_coefficient || 1.0,
          material.is_required !== false,
          material.notes || ''
        ]
      );
    }
  }
  
  return createdItem;
}

/**
 * Обновить позицию
 */
export async function update(id, itemData, tenantId) {
  const query = `
    UPDATE estimate_items ei
    SET
      name = COALESCE($1, ei.name),
      description = COALESCE($2, ei.description),
      code = COALESCE($3, ei.code),
      unit = COALESCE($4, ei.unit),
      quantity = COALESCE($5, ei.quantity),
      unit_price = COALESCE($6, ei.unit_price),
      overhead_percent = COALESCE($7, ei.overhead_percent),
      profit_percent = COALESCE($8, ei.profit_percent),
      tax_percent = COALESCE($9, ei.tax_percent),
      notes = COALESCE($10, ei.notes),
      is_optional = COALESCE($11, ei.is_optional),
      updated_at = NOW()
    FROM estimates e
    WHERE ei.estimate_id = e.id
      AND ei.id = $12
      AND e.tenant_id = $13
    RETURNING ei.*
  `;

  const values = [
    itemData.name,
    itemData.description,
    itemData.code,
    itemData.unit,
    itemData.quantity,
    itemData.unit_price,
    itemData.overhead_percent,
    itemData.profit_percent,
    itemData.tax_percent,
    itemData.notes,
    itemData.is_optional,
    id,
    tenantId
  ];

  const result = await db.query(query, values);

  if (result.rows.length === 0) {
    throw new Error('Позиция не найдена или нет доступа');
  }

  return result.rows[0];
}

/**
 * Удалить позицию
 */
export async function deleteItem(id, tenantId) {
  const query = `
    DELETE FROM estimate_items ei
    USING estimates e
    WHERE ei.estimate_id = e.id
      AND ei.id = $1
      AND e.tenant_id = $2
    RETURNING ei.*
  `;

  const result = await db.query(query, [id, tenantId]);

  if (result.rows.length === 0) {
    throw new Error('Позиция не найдена или нет доступа');
  }

  return result.rows[0];
}

/**
 * Массовое добавление позиций из справочника работ
 */
export async function bulkCreateFromWorks(estimateId, workIds, tenantId, quantities = {}) {
  try {
    console.log('[bulkCreateFromWorks] Start:', { estimateId, workIds, tenantId, quantities });
    
    // Проверяем доступ к смете
    const checkQuery = `
      SELECT id FROM estimates
      WHERE id = $1 AND tenant_id = $2
    `;
    const checkResult = await db.query(checkQuery, [estimateId, tenantId]);
    
    if (checkResult.rows.length === 0) {
      throw new Error('Смета не найдена или нет доступа');
    }

    // Получаем работы из справочника (используем IN вместо ANY для совместимости)
    const placeholders = workIds.map((_, i) => `$${i + 1}`).join(',');
    const worksQuery = `
      SELECT 
        id,
        code,
        name,
        category,
        unit,
        base_price as unit_price,
        is_global,
        phase,
        section,
        subsection
      FROM works
      WHERE id IN (${placeholders})
        AND (tenant_id = $${workIds.length + 1} OR is_global = true)
    `;
    
    console.log('[bulkCreateFromWorks] Works query:', worksQuery);
    console.log('[bulkCreateFromWorks] Query params:', [...workIds, tenantId]);
    
    const worksResult = await db.query(worksQuery, [...workIds, tenantId]);
    const works = worksResult.rows;

    console.log('[bulkCreateFromWorks] Found works:', works.length);

    if (works.length === 0) {
      throw new Error('Работы не найдены');
    }

  // Получаем уже существующие позиции в этой смете для проверки дубликатов
  const existingItemsQuery = `
    SELECT code, name, unit FROM estimate_items
    WHERE estimate_id = $1
  `;
  const existingItemsResult = await db.query(existingItemsQuery, [estimateId]);
  const existingItems = existingItemsResult.rows;

  // Создаем Set для быстрой проверки дубликатов
  const existingKeys = new Set();
  existingItems.forEach(item => {
    // Используем код как уникальный ключ (если есть), иначе name + unit
    const key = item.code ? `code:${item.code}` : `name-unit:${item.name}|${item.unit}`;
    existingKeys.add(key);
  });

  console.log('[bulkCreateFromWorks] Existing items in estimate:', existingKeys.size);

  // Получаем текущий максимальный position_number
  const positionQuery = `
    SELECT COALESCE(MAX(position_number), 0) as max_position
    FROM estimate_items
    WHERE estimate_id = $1
  `;
  const positionResult = await db.query(positionQuery, [estimateId]);
  let positionNumber = positionResult.rows[0].max_position;

  // Создаем позиции для каждой работы (пропускаем дубликаты)
  const createdItems = [];
  const skippedItems = [];
  
  for (const work of works) {
    // Проверяем, существует ли уже такая позиция
    const workKey = work.code ? `code:${work.code}` : `name-unit:${work.name}|${work.unit}`;
    
    if (existingKeys.has(workKey)) {
      console.log('[bulkCreateFromWorks] Skipping duplicate:', work.name, work.code);
      skippedItems.push(work);
      continue; // Пропускаем дубликат
    }

    positionNumber++;
    const quantity = quantities[work.id] || 1; // По умолчанию 1

    const insertQuery = `
      INSERT INTO estimate_items (
        estimate_id,
        position_number,
        item_type,
        name,
        description,
        code,
        unit,
        quantity,
        unit_price,
        overhead_percent,
        profit_percent,
        tax_percent,
        source_type,
        phase,
        section,
        subsection
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      estimateId,
      positionNumber,
      'work',
      work.name,
      `Категория: ${work.category}`,
      work.code,
      work.unit,
      quantity,
      work.unit_price,
      0, // overhead
      0, // profit
      0, // tax
      work.is_global ? 'global' : 'tenant', // source_type
      work.phase || null, // phase
      work.section || null, // section
      work.subsection || null // subsection
    ];

    const result = await db.query(insertQuery, values);
    createdItems.push(result.rows[0]);
    
    // Добавляем ключ в Set для последующих проверок в этой же операции
    existingKeys.add(workKey);
  }

  console.log('[bulkCreateFromWorks] Created items:', createdItems.length);
  console.log('[bulkCreateFromWorks] Skipped duplicates:', skippedItems.length);
  
  return {
    created: createdItems,
    skipped: skippedItems.length,
    total: works.length
  };
  } catch (error) {
    console.error('[bulkCreateFromWorks] Error:', error);
    throw error;
  }
}

/**
 * Изменить порядок позиций
 */
export async function reorderItems(estimateId, itemsOrder, tenantId) {
  // Проверяем доступ к смете
  const checkQuery = `
    SELECT id FROM estimates
    WHERE id = $1 AND tenant_id = $2
  `;
  const checkResult = await db.query(checkQuery, [estimateId, tenantId]);
  
  if (checkResult.rows.length === 0) {
    throw new Error('Смета не найдена или нет доступа');
  }

  // Обновляем position_number для каждой позиции
  const promises = itemsOrder.map((item, index) => {
    const query = `
      UPDATE estimate_items
      SET position_number = $1, updated_at = NOW()
      WHERE id = $2 AND estimate_id = $3
    `;
    return db.query(query, [index + 1, item.id, estimateId]);
  });

  await Promise.all(promises);

  // Возвращаем обновленный список
  return findByEstimateId(estimateId, tenantId);
}

/**
 * Массовая вставка позиций с материалами в транзакции
 * @param {string} estimateId - ID сметы
 * @param {Array} items - Массив позиций с материалами
 * @param {string} tenantId - ID компании
 * @returns {Promise<Array>} - Созданные позиции
 */
export async function bulkCreate(estimateId, items, tenantId) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Проверяем доступ к смете
    const checkQuery = `
      SELECT id FROM estimates
      WHERE id = $1 AND tenant_id = $2
    `;
    const checkResult = await client.query(checkQuery, [estimateId, tenantId]);
    
    if (checkResult.rows.length === 0) {
      throw new Error('Смета не найдена или нет доступа');
    }

    // Получаем начальный position_number
    const positionQuery = `
      SELECT COALESCE(MAX(position_number), 0) as max_position
      FROM estimate_items
      WHERE estimate_id = $1
    `;
    const positionResult = await client.query(positionQuery, [estimateId]);
    let currentPosition = positionResult.rows[0].max_position;

    const createdItems = [];

    // Вставляем каждую позицию с материалами
    for (const itemData of items) {
      currentPosition++;
      
      // Вставляем позицию
      const insertItemQuery = `
        INSERT INTO estimate_items (
          estimate_id,
          position_number,
          item_type,
          name,
          description,
          code,
          unit,
          quantity,
          unit_price,
          overhead_percent,
          profit_percent,
          tax_percent,
          notes,
          is_optional,
          source_type,
          work_id,
          phase,
          section,
          subsection
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `;

      const itemValues = [
        estimateId,
        currentPosition,
        itemData.item_type || 'work',
        itemData.name,
        itemData.description || null,
        itemData.code || null,
        itemData.unit,
        itemData.quantity,
        itemData.unit_price,
        itemData.overhead_percent || 0,
        itemData.profit_percent || 0,
        itemData.tax_percent || 0,
        itemData.notes || null,
        itemData.is_optional || false,
        itemData.source_type || 'tenant',
        itemData.workId || null,
        itemData.phase || null,
        itemData.section || null,
        itemData.subsection || null
      ];

      const itemResult = await client.query(insertItemQuery, itemValues);
      const createdItem = itemResult.rows[0];
      
      // Вставляем материалы для этой позиции
      if (itemData.materials && Array.isArray(itemData.materials) && itemData.materials.length > 0) {
        for (const material of itemData.materials) {
          // Пропускаем материалы без material_id
          if (!material.material_id) {
            console.log('Skipping material without material_id:', material);
            continue;
          }
          
          const insertMaterialQuery = `
            INSERT INTO estimate_item_materials (
              estimate_item_id,
              material_id,
              quantity,
              unit_price,
              consumption_coefficient,
              is_required,
              notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;
          
          const materialValues = [
            createdItem.id,
            material.material_id,
            material.quantity,
            material.unit_price || material.price,
            material.consumption || material.consumption_coefficient || 1.0,
            material.is_required !== false,
            material.notes || ''
          ];
          
          await client.query(insertMaterialQuery, materialValues);
        }
      }
      
      createdItems.push(createdItem);
    }
    
    await client.query('COMMIT');
    console.log(`✅ Bulk created ${createdItems.length} items with materials`);
    
    return createdItems;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Bulk create failed, rolled back transaction:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Удалить все позиции сметы в транзакции
 * @param {string} estimateId - ID сметы
 * @param {string} tenantId - ID компании
 */
export async function deleteAllByEstimateId(estimateId, tenantId) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Проверяем доступ к смете
    const checkQuery = `
      SELECT id FROM estimates
      WHERE id = $1 AND tenant_id = $2
    `;
    const checkResult = await client.query(checkQuery, [estimateId, tenantId]);
    
    if (checkResult.rows.length === 0) {
      throw new Error('Смета не найдена или нет доступа');
    }

    // Удаляем материалы (CASCADE должен сработать, но на всякий случай делаем явно)
    const deleteMaterialsQuery = `
      DELETE FROM estimate_item_materials
      WHERE estimate_item_id IN (
        SELECT id FROM estimate_items WHERE estimate_id = $1
      )
    `;
    await client.query(deleteMaterialsQuery, [estimateId]);

    // Удаляем позиции
    const deleteItemsQuery = `
      DELETE FROM estimate_items
      WHERE estimate_id = $1
    `;
    const result = await client.query(deleteItemsQuery, [estimateId]);
    
    await client.query('COMMIT');
    console.log(`✅ Deleted ${result.rowCount} items from estimate ${estimateId}`);
    
    return result.rowCount;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Delete all failed, rolled back transaction:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Заменить все позиции сметы (удалить старые + вставить новые в одной транзакции)
 * @param {string} estimateId - ID сметы
 * @param {Array} items - Массив новых позиций с материалами
 * @param {string} tenantId - ID компании
 * @returns {Promise<Array>} - Созданные позиции
 */
export async function replaceAllItems(estimateId, items, tenantId) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    console.log(`[replaceAllItems] Starting transaction for estimate ${estimateId}`);
    
    // 1. Проверяем доступ к смете
    const checkQuery = `
      SELECT id FROM estimates
      WHERE id = $1 AND tenant_id = $2
    `;
    const checkResult = await client.query(checkQuery, [estimateId, tenantId]);
    
    if (checkResult.rows.length === 0) {
      throw new Error('Смета не найдена или нет доступа');
    }
    console.log('[replaceAllItems] ✅ Access verified');

    // 2. Удаляем все старые материалы
    const deleteMaterialsQuery = `
      DELETE FROM estimate_item_materials
      WHERE estimate_item_id IN (
        SELECT id FROM estimate_items WHERE estimate_id = $1
      )
    `;
    const deletedMaterialsResult = await client.query(deleteMaterialsQuery, [estimateId]);
    console.log(`[replaceAllItems] ✅ Deleted ${deletedMaterialsResult.rowCount} old materials`);

    // 3. Удаляем все старые позиции
    const deleteItemsQuery = `
      DELETE FROM estimate_items
      WHERE estimate_id = $1
    `;
    const deletedItemsResult = await client.query(deleteItemsQuery, [estimateId]);
    console.log(`[replaceAllItems] ✅ Deleted ${deletedItemsResult.rowCount} old items`);

    // 4. Вставляем новые позиции с материалами
    const createdItems = [];
    let currentPosition = 0;

    for (const itemData of items) {
      currentPosition++;
      
      // Вставляем позицию
      const insertItemQuery = `
        INSERT INTO estimate_items (
          estimate_id,
          position_number,
          item_type,
          name,
          description,
          code,
          unit,
          quantity,
          unit_price,
          overhead_percent,
          profit_percent,
          tax_percent,
          notes,
          is_optional,
          source_type,
          work_id,
          phase,
          section,
          subsection
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `;

      const itemValues = [
        estimateId,
        currentPosition,
        itemData.item_type || 'work',
        itemData.name,
        itemData.description || null,
        itemData.code || null,
        itemData.unit,
        itemData.quantity,
        itemData.unit_price,
        itemData.overhead_percent || 0,
        itemData.profit_percent || 0,
        itemData.tax_percent || 0,
        itemData.notes || null,
        itemData.is_optional || false,
        itemData.source_type || 'tenant',
        itemData.workId || null,
        itemData.phase || null,
        itemData.section || null,
        itemData.subsection || null
      ];

      const itemResult = await client.query(insertItemQuery, itemValues);
      const createdItem = itemResult.rows[0];
      
      // Вставляем материалы для этой позиции
      if (itemData.materials && Array.isArray(itemData.materials) && itemData.materials.length > 0) {
        for (const material of itemData.materials) {
          // Пропускаем материалы без material_id
          if (!material.material_id) {
            console.log('[replaceAllItems] Skipping material without material_id:', material);
            continue;
          }
          
          try {
            const insertMaterialQuery = `
              INSERT INTO estimate_item_materials (
                estimate_item_id,
                material_id,
                quantity,
                unit_price,
                consumption_coefficient,
                is_required,
                notes
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            
            const materialValues = [
              createdItem.id,
              material.material_id,
              material.quantity,
              material.unit_price || material.price,
              material.consumption || material.consumption_coefficient || 1.0,
              material.is_required !== false,
              material.notes || ''
            ];
            
            console.log('[replaceAllItems] Inserting material:', {
              material_id: material.material_id,
              quantity: material.quantity,
              unit_price: material.unit_price || material.price,
              consumption: material.consumption || material.consumption_coefficient || 1.0
            });
            
            await client.query(insertMaterialQuery, materialValues);
          } catch (materialError) {
            console.error('[replaceAllItems] ❌ Error inserting material:', materialError);
            console.error('[replaceAllItems] Material data:', material);
            throw materialError;
          }
        }
      }
      
      createdItems.push(createdItem);
    }
    
    await client.query('COMMIT');
    console.log(`[replaceAllItems] ✅ COMMIT: Replaced with ${createdItems.length} new items`);
    
    return createdItems;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[replaceAllItems] ❌ ROLLBACK: Error occurred:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default {
  findByEstimateId,
  findById,
  create,
  update,
  deleteItem,
  bulkCreateFromWorks,
  reorderItems,
  bulkCreate,
  deleteAllByEstimateId,
  replaceAllItems
};
