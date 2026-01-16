/**
 * Pinecone Export Service
 * 
 * Экспорт материалов и работ для векторной индексации
 * Формат: { id, text, metadata }
 */

import pool from '../config/database.js';

// Максимальная длина текста для embedding (OpenAI лимит 8191 tokens, безопасно 768 chars)
const MAX_TEXT_LEN = 768;

/**
 * Форматирует текст документа (детерминированный порядок)
 * name. category. sku/key. supplier. unit
 */
function formatDocumentText(name, category, keyOrSku, supplier, unit, maxLength = MAX_TEXT_LEN) {
  const parts = [
    name,
    category,
    keyOrSku,
    supplier,
    unit
  ].filter(Boolean);

  let text = parts.join('. ');

  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + '...';
  }

  return text;
}

/**
 * Экспортирует материалы для индексации
 * @param {Object} options - { scope: 'global'|'tenant', tenantId, limit, offset }
 * @returns {Promise<Array>} - Массив документов { id, text, metadata }
 */
export async function exportMaterials(options = {}) {
  const { scope = 'global', tenantId = null, limit = null, offset = 0 } = options;

  console.log(`📤 [Export] Materials (scope: ${scope}, tenantId: ${tenantId}, limit: ${limit}, offset: ${offset})`);

  const conditions = [];
  const params = [];
  let paramCount = 0;

  // Scope filter
  if (scope === 'global') {
    conditions.push('m.is_global = true');
  } else if (scope === 'tenant' && tenantId) {
    conditions.push('m.is_global = false');
    conditions.push(`m.tenant_id = $${++paramCount}`);
    params.push(tenantId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = limit ? `LIMIT $${++paramCount} OFFSET $${++paramCount}` : '';

  if (limit) {
    params.push(limit, offset);
  }

  const query = `
    SELECT 
      m.id as db_id,
      m.name,
      m.unit,
      m.sku,
      m.tenant_id,
      m.is_global,
      m.category,
      m.category_full_path,
      m.supplier
    FROM materials m
    ${whereClause}
    ORDER BY m.id
    ${limitClause}
  `;

  const result = await pool.query(query, params);

  const documents = result.rows.map(row => {
    const id = `${scope}-material-${row.db_id}`;
    const text = formatDocumentText(
      row.name,
      row.category_full_path || row.category,
      row.sku,
      row.supplier,
      row.unit
    );

    return {
      id: id,
      text: text,
      metadata: {
        tenantId: row.tenant_id || '',
        type: 'material',
        dbId: String(row.db_id),
        category: row.category || '',
        categoryFullPath: row.category_full_path || '',
        supplier: row.supplier || '',
        unit: row.unit || '',
        isGlobal: row.is_global || false,
        scope: scope
      }
    };
  });

  console.log(`✅ [Export] Exported ${documents.length} materials`);

  return documents;
}

/**
 * Экспортирует работы для индексации
 * @param {Object} options - { scope: 'global'|'tenant', tenantId, limit, offset }
 * @returns {Promise<Array>} - Массив документов { id, text, metadata }
 */
export async function exportWorks(options = {}) {
  const { scope = 'global', tenantId = null, limit = null, offset = 0 } = options;

  console.log(`📤 [Export] Works (scope: ${scope}, tenantId: ${tenantId}, limit: ${limit}, offset: ${offset})`);

  const conditions = [];
  const params = [];
  let paramCount = 0;

  // Scope filter
  if (scope === 'global') {
    conditions.push('w.is_global = true');
  } else if (scope === 'tenant' && tenantId) {
    conditions.push('w.is_global = false');
    conditions.push(`w.tenant_id = $${++paramCount}`);
    params.push(tenantId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = limit ? `LIMIT $${++paramCount} OFFSET $${++paramCount}` : '';

  if (limit) {
    params.push(limit, offset);
  }

  const query = `
    SELECT 
      w.id as db_id,
      w.name,
      w.unit,
      w.code as key,
      w.tenant_id,
      w.is_global,
      w.category
    FROM works w
    ${whereClause}
    ORDER BY w.id
    ${limitClause}
  `;

  const result = await pool.query(query, params);

  const documents = result.rows.map(row => {
    const id = `${scope}-work-${row.db_id}`;
    const text = formatDocumentText(
      row.name,
      row.category,
      row.key,
      null, // works не имеют supplier
      row.unit
    );

    return {
      id: id,
      text: text,
      metadata: {
        tenantId: row.tenant_id || '',
        type: 'work',
        dbId: String(row.db_id),
        category: row.category || '',
        unit: row.unit || '',
        isGlobal: row.is_global || false,
        scope: scope
      }
    };
  });

  console.log(`✅ [Export] Exported ${documents.length} works`);

  return documents;
}

/**
 * Экспортирует все документы (materials + works)
 * @param {Object} options - { scope, tenantId }
 * @returns {Promise<Array>} - Массив документов
 */
export async function exportAll(options = {}) {
  console.log(`📦 [Export] All documents (scope: ${options.scope})`);

  const materials = await exportMaterials(options);
  const works = await exportWorks(options);

  const all = [...materials, ...works];

  console.log(`✅ [Export] Total: ${all.length} documents (${materials.length} materials, ${works.length} works)`);

  return all;
}

/**
 * Получает список всех tenant_id
 */
export async function getAllTenantIds() {
  const result = await pool.query('SELECT DISTINCT id FROM tenants ORDER BY id');
  return result.rows.map(row => row.id);
}

/**
 * Подсчитывает количество документов
 * @param {Object} options - { scope, tenantId }
 * @returns {Promise<Object>} - { materials, works, total }
 */
export async function countDocuments(options = {}) {
  const { scope = 'global', tenantId = null } = options;

  const conditions = [];
  const params = [];
  let paramCount = 0;

  if (scope === 'global') {
    conditions.push('is_global = true');
  } else if (scope === 'tenant' && tenantId) {
    conditions.push('is_global = false');
    conditions.push(`tenant_id = $${++paramCount}`);
    params.push(tenantId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const materialsResult = await pool.query(
    `SELECT COUNT(*) as count FROM materials ${whereClause}`,
    params
  );

  const worksResult = await pool.query(
    `SELECT COUNT(*) as count FROM works ${whereClause}`,
    params
  );

  const materials = parseInt(materialsResult.rows[0].count);
  const works = parseInt(worksResult.rows[0].count);

  return {
    materials: materials,
    works: works,
    total: materials + works
  };
}

export default {
  exportMaterials,
  exportWorks,
  exportAll,
  getAllTenantIds,
  countDocuments
};
