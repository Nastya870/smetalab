/**
 * Repository для работы с иерархией работ (work_hierarchy)
 */

import db from '../config/database.js';

/**
 * Получить все элементы определенного уровня
 * @param {string} level - 'phase', 'section', 'subsection'
 * @param {string} parentValue - Значение родительского элемента (для section/subsection)
 * @param {string} tenantId - ID компании
 */
export async function findByLevel(level, parentValue = null, tenantId = null) {
  let query = `
    SELECT 
      id,
      level,
      parent_value,
      value,
      code,
      sort_order,
      is_global,
      tenant_id,
      created_at,
      updated_at
    FROM work_hierarchy
    WHERE level = $1
  `;
  
  const params = [level];
  let paramCount = 1;

  // Фильтр по родительскому элементу
  if (parentValue) {
    paramCount++;
    query += ` AND parent_value = $${paramCount}`;
    params.push(parentValue);
  } else if (level !== 'phase') {
    // Для section/subsection требуется parent_value
    query += ` AND parent_value IS NULL`;
  }

  // Фильтр по tenant (глобальные + свои)
  if (tenantId) {
    paramCount++;
    query += ` AND (is_global = true OR tenant_id = $${paramCount})`;
    params.push(tenantId);
  } else {
    // Только глобальные для неавторизованных
    query += ` AND is_global = true`;
  }

  query += ` ORDER BY sort_order ASC, code ASC, value ASC`;

  const result = await db.query(query, params);
  return result.rows;
}

/**
 * Получить полное дерево иерархии
 * @param {string} tenantId - ID компании
 */
export async function getFullTree(tenantId = null) {
  // Получаем все фазы
  const phases = await findByLevel('phase', null, tenantId);
  
  // Для каждой фазы получаем разделы
  for (const phase of phases) {
    phase.sections = await findByLevel('section', phase.value, tenantId);
    
    // Для каждого раздела получаем подразделы
    for (const section of phase.sections) {
      section.subsections = await findByLevel('subsection', section.value, tenantId);
    }
  }
  
  return phases;
}

/**
 * Получить элемент по ID
 */
export async function findById(id, tenantId = null) {
  let query = `
    SELECT * FROM work_hierarchy
    WHERE id = $1
  `;
  
  const params = [id];
  
  if (tenantId) {
    query += ` AND (is_global = true OR tenant_id = $2)`;
    params.push(tenantId);
  } else {
    query += ` AND is_global = true`;
  }

  const result = await db.query(query, params);
  return result.rows[0];
}

/**
 * Создать элемент иерархии
 */
export async function create(data, tenantId) {
  const query = `
    INSERT INTO work_hierarchy (
      level,
      parent_value,
      value,
      code,
      sort_order,
      is_global,
      tenant_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const values = [
    data.level,
    data.parent_value || null,
    data.value,
    data.code || null,
    data.sort_order || 0,
    data.is_global || false,
    data.is_global ? null : tenantId // Глобальные элементы без tenant_id
  ];

  const result = await db.query(query, values);
  return result.rows[0];
}

/**
 * Обновить элемент иерархии
 */
export async function update(id, data, tenantId) {
  const query = `
    UPDATE work_hierarchy
    SET
      value = COALESCE($1, value),
      code = COALESCE($2, code),
      sort_order = COALESCE($3, sort_order),
      parent_value = COALESCE($4, parent_value),
      updated_at = NOW()
    WHERE id = $5
      AND tenant_id = $6
    RETURNING *
  `;

  const values = [
    data.value,
    data.code,
    data.sort_order,
    data.parent_value,
    id,
    tenantId
  ];

  const result = await db.query(query, values);

  if (result.rows.length === 0) {
    throw new Error('Элемент не найден или нет доступа');
  }

  return result.rows[0];
}

/**
 * Удалить элемент иерархии
 */
export async function deleteItem(id, tenantId) {
  // Проверяем, есть ли дочерние элементы
  const checkQuery = `
    SELECT COUNT(*) as count
    FROM work_hierarchy
    WHERE parent_value = (SELECT value FROM work_hierarchy WHERE id = $1)
  `;
  
  const checkResult = await db.query(checkQuery, [id]);
  
  if (parseInt(checkResult.rows[0].count) > 0) {
    throw new Error('Невозможно удалить элемент с дочерними элементами');
  }

  const query = `
    DELETE FROM work_hierarchy
    WHERE id = $1
      AND tenant_id = $2
    RETURNING *
  `;

  const result = await db.query(query, [id, tenantId]);

  if (result.rows.length === 0) {
    throw new Error('Элемент не найден или нет доступа');
  }

  return result.rows[0];
}

/**
 * Получить уникальные значения для autocomplete
 * @param {string} level - 'phase', 'section', 'subsection'
 * @param {string} searchTerm - Поисковый запрос
 * @param {string} tenantId - ID компании
 */
export async function getAutocompleteOptions(level, searchTerm = '', tenantId = null) {
  let query = `
    SELECT DISTINCT 
      value,
      code,
      sort_order
    FROM work_hierarchy
    WHERE level = $1
  `;

  const params = [level];
  let paramCount = 1;

  // Поиск
  if (searchTerm) {
    paramCount++;
    query += ` AND (value ILIKE $${paramCount} OR code ILIKE $${paramCount})`;
    params.push(`%${searchTerm}%`);
  }

  // Tenant filter
  if (tenantId) {
    paramCount++;
    query += ` AND (is_global = true OR tenant_id = $${paramCount})`;
    params.push(tenantId);
  } else {
    query += ` AND is_global = true`;
  }

  query += ` ORDER BY sort_order ASC, code ASC, value ASC LIMIT 50`;

  const result = await db.query(query, params);
  return result.rows.map(row => ({
    label: row.value,
    code: row.code,
    value: row.value
  }));
}

/**
 * Получить статистику по иерархии
 */
export async function getStatistics(tenantId = null) {
  let query = `
    SELECT 
      level,
      COUNT(*) as count,
      SUM(CASE WHEN is_global THEN 1 ELSE 0 END) as global_count,
      SUM(CASE WHEN is_global = false THEN 1 ELSE 0 END) as tenant_count
    FROM work_hierarchy
  `;

  const params = [];
  
  if (tenantId) {
    query += ` WHERE is_global = true OR tenant_id = $1`;
    params.push(tenantId);
  } else {
    query += ` WHERE is_global = true`;
  }

  query += ` GROUP BY level`;

  const result = await db.query(query, params);
  return result.rows;
}

export default {
  findByLevel,
  getFullTree,
  findById,
  create,
  update,
  deleteItem,
  getAutocompleteOptions,
  getStatistics
};
