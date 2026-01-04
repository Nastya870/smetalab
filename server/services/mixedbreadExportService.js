/**
 * Mixedbread Semantic Search Export Service
 * 
 * Выгрузка материалов и работ в формат документов для Mixedbread
 * 1 запись БД = 1 document
 */

import db from '../config/database.js';

/**
 * Формирует text для материала из доступных полей
 * @param {Object} material - Материал из БД
 * @returns {string} - Текст для semantic search
 */
function buildMaterialText(material) {
  const parts = [];
  
  // Обязательное: название
  if (material.name) {
    parts.push(material.name);
  }
  
  // SKU (может содержать бренд/производителя)
  if (material.sku && material.sku !== material.name) {
    parts.push(material.sku);
  }
  
  // Категория
  if (material.category) {
    parts.push(material.category);
  }
  
  // Поставщик (может быть производителем)
  if (material.supplier) {
    parts.push(material.supplier);
  }
  
  // Единица измерения (контекст: "30 кг", "10 л")
  if (material.unit) {
    parts.push(material.unit);
  }
  
  // Объединяем все части через пробел
  return parts.filter(Boolean).join(' ');
}

/**
 * Формирует text для работы из доступных полей
 * @param {Object} work - Работа из БД
 * @returns {string} - Текст для semantic search
 */
function buildWorkText(work) {
  const parts = [];
  
  // Обязательное: название работы
  if (work.name) {
    parts.push(work.name);
  }
  
  // Категория
  if (work.category) {
    parts.push(work.category);
  }
  
  // Единица измерения (контекст работы)
  if (work.unit) {
    parts.push(work.unit);
  }
  
  return parts.filter(Boolean).join(' ');
}

/**
 * Экспортирует материалы для tenant в формате Mixedbread documents
 * @param {string} tenantId - ID тенанта
 * @param {number} limit - Максимум документов за раз (по умолчанию 500)
 * @param {number} offset - Смещение для пагинации
 * @returns {Promise<Array>} - Массив documents
 */
export async function exportMaterialsForTenant(tenantId, limit = 500, offset = 0) {
  console.log(`📤 [Mixedbread Export] Выгрузка материалов для tenant: ${tenantId} (limit: ${limit}, offset: ${offset})`);
  
  const query = `
    SELECT 
      id,
      name,
      sku,
      unit,
      category,
      supplier,
      is_global
    FROM materials
    WHERE (tenant_id = $1 OR is_global = TRUE)
      AND name IS NOT NULL
    ORDER BY id
    LIMIT $2 OFFSET $3
  `;
  
  const result = await db.query(query, [tenantId, limit, offset]);
  
  const documents = result.rows.map(material => ({
    id: `material-${material.id}`,
    text: buildMaterialText(material),
    metadata: {
      tenantId: tenantId,
      type: 'material',
      dbId: material.id,
      categoryId: material.category || null,
      supplierId: material.supplier || null,
      unit: material.unit || null,
      isGlobal: material.is_global || false
    }
  }));
  
  console.log(`✅ [Mixedbread Export] Выгружено ${documents.length} материалов`);
  return documents;
}

/**
 * Экспортирует работы для tenant в формате Mixedbread documents
 * @param {string} tenantId - ID тенанта
 * @param {number} limit - Максимум документов за раз (по умолчанию 500)
 * @param {number} offset - Смещение для пагинации
 * @returns {Promise<Array>} - Массив documents
 */
export async function exportWorksForTenant(tenantId, limit = 500, offset = 0) {
  console.log(`📤 [Mixedbread Export] Выгрузка работ для tenant: ${tenantId} (limit: ${limit}, offset: ${offset})`);
  
  const query = `
    SELECT 
      id,
      name,
      unit,
      category,
      is_global
    FROM works
    WHERE (tenant_id = $1 OR is_global = TRUE)
      AND name IS NOT NULL
    ORDER BY id
    LIMIT $2 OFFSET $3
  `;
  
  const result = await db.query(query, [tenantId, limit, offset]);
  
  const documents = result.rows.map(work => ({
    id: `work-${work.id}`,
    text: buildWorkText(work),
    metadata: {
      tenantId: tenantId,
      type: 'work',
      dbId: work.id,
      categoryId: work.category || null,
      supplierId: null, // Работы не имеют поставщиков
      unit: work.unit || null,
      isGlobal: work.is_global || false
    }
  }));
  
  console.log(`✅ [Mixedbread Export] Выгружено ${documents.length} работ`);
  return documents;
}

/**
 * Экспортирует ВСЕ данные (материалы + работы) для tenant
 * @param {string} tenantId - ID тенанта
 * @param {number} batchSize - Размер батча (по умолчанию 500)
 * @returns {Promise<Object>} - { materials, works, total }
 */
export async function exportAllForTenant(tenantId, batchSize = 500) {
  console.log(`📦 [Mixedbread Export] Полная выгрузка для tenant: ${tenantId}`);
  
  const allMaterials = [];
  const allWorks = [];
  
  // Выгрузка материалов (батчами)
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const batch = await exportMaterialsForTenant(tenantId, batchSize, offset);
    allMaterials.push(...batch);
    
    if (batch.length < batchSize) {
      hasMore = false;
    } else {
      offset += batchSize;
    }
  }
  
  // Выгрузка работ (батчами)
  offset = 0;
  hasMore = true;
  
  while (hasMore) {
    const batch = await exportWorksForTenant(tenantId, batchSize, offset);
    allWorks.push(...batch);
    
    if (batch.length < batchSize) {
      hasMore = false;
    } else {
      offset += batchSize;
    }
  }
  
  console.log(`✅ [Mixedbread Export] Полная выгрузка завершена: ${allMaterials.length} материалов, ${allWorks.length} работ`);
  
  return {
    materials: allMaterials,
    works: allWorks,
    total: allMaterials.length + allWorks.length
  };
}

/**
 * Получает список удалённых записей (для удаления из Mixedbread)
 * Возвращает IDs записей, которые были помечены как deleted или не существуют
 * @param {string} tenantId - ID тенанта
 * @param {Array<string>} documentIds - Массив ID документов для проверки
 * @returns {Promise<Array<string>>} - Массив ID для удаления
 */
export async function getDeletedDocumentIds(tenantId, documentIds) {
  if (!documentIds || documentIds.length === 0) {
    return [];
  }
  
  console.log(`🗑️ [Mixedbread Export] Проверка ${documentIds.length} документов на удаление`);
  
  const deletedIds = [];
  
  // Разделяем ID на материалы и работы
  const materialIds = documentIds
    .filter(id => id.startsWith('material-'))
    .map(id => id.replace('material-', ''));
  
  const workIds = documentIds
    .filter(id => id.startsWith('work-'))
    .map(id => id.replace('work-', ''));
  
  // Проверяем материалы
  if (materialIds.length > 0) {
    const query = `
      SELECT id FROM materials 
      WHERE id = ANY($1::uuid[]) 
        AND (tenant_id = $2 OR is_global = TRUE)
    `;
    const result = await db.query(query, [materialIds, tenantId]);
    const existingIds = new Set(result.rows.map(r => r.id));
    
    // Все ID, которых нет в БД, считаем удалёнными
    materialIds.forEach(id => {
      if (!existingIds.has(id)) {
        deletedIds.push(`material-${id}`);
      }
    });
  }
  
  // Проверяем работы
  if (workIds.length > 0) {
    const query = `
      SELECT id FROM works 
      WHERE id = ANY($1::uuid[]) 
        AND (tenant_id = $2 OR is_global = TRUE)
    `;
    const result = await db.query(query, [workIds, tenantId]);
    const existingIds = new Set(result.rows.map(r => r.id));
    
    workIds.forEach(id => {
      if (!existingIds.has(id)) {
        deletedIds.push(`work-${id}`);
      }
    });
  }
  
  console.log(`🗑️ [Mixedbread Export] Найдено ${deletedIds.length} удалённых документов`);
  return deletedIds;
}

export default {
  exportMaterialsForTenant,
  exportWorksForTenant,
  exportAllForTenant,
  getDeletedDocumentIds
};
