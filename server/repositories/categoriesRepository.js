import db from '../config/database.js';

/**
 * Repository для работы с иерархическими категориями
 */

/**
 * Находит или создает категорию по цепочке имен
 * @param {string[]} levels - Массив имен уровней ['Строительство', 'Смеси', 'Гипс']
 * @param {Object} options - { tenantId, isGlobal, type }
 * @returns {Promise<{id: string, fullPath: string}>}
 */
export async function resolveHierarchy(levels, options = {}) {
    const { tenantId = null, isGlobal = false, type = 'material' } = options;

    let parentId = null;
    const pathParts = [];
    let lastCategoryId = null;

    for (const levelName of levels) {
        if (!levelName || levelName.trim() === '') continue;

        const name = levelName.trim();
        pathParts.push(name);

        // Ищем существующую категорию
        // Используем COALESCE для корректного сравнения NULL в tenant_id
        const findQuery = `
      SELECT id FROM categories 
      WHERE name = $1 
      AND (parent_id = $2 OR (parent_id IS NULL AND $2 IS NULL))
      AND type = $3
      AND (
        (is_global = true AND $4 = true) OR 
        (tenant_id = $5 AND is_global = false)
      )
      LIMIT 1
    `;

        const findResult = await db.query(findQuery, [name, parentId, type, isGlobal, tenantId]);

        if (findResult.rows.length > 0) {
            parentId = findResult.rows[0].id;
        } else {
            // Создаем новую категорию
            const insertQuery = `
        INSERT INTO categories (name, parent_id, type, tenant_id, is_global)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
            const insertResult = await db.query(insertQuery, [name, parentId, type, isGlobal ? null : tenantId, isGlobal]);
            parentId = insertResult.rows[0].id;
        }
        lastCategoryId = parentId;
    }

    return {
        id: lastCategoryId,
        fullPath: pathParts.join(' / ')
    };
}

/**
 * Получить список всех категорий (плоский или древовидный в будущем)
 */
export async function findAll(options = {}) {
    const { tenantId, type = 'material' } = options;
    const query = `
        SELECT * FROM categories 
        WHERE type = $1 
        AND (is_global = true OR tenant_id = $2)
        ORDER BY parent_id NULLS FIRST, name
    `;
    const result = await db.query(query, [type, tenantId]);
    return result.rows;
}

export default {
    resolveHierarchy,
    findAll
};
