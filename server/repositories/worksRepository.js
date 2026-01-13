import db from '../config/database.js';

/**
 * Получить все работы с фильтрацией
 */
export const findAll = async (params = {}, tenantId) => {
    const { isGlobal } = params;
    let query = 'SELECT * FROM works';
    const queryParams = [];
    const whereConditions = [];

    if (isGlobal === 'true') {
        whereConditions.push('is_global = TRUE');
    } else if (isGlobal === 'false') {
        whereConditions.push('is_global = FALSE');
        if (tenantId) {
            whereConditions.push('tenant_id = $' + (queryParams.length + 1));
            queryParams.push(tenantId);
        }
    } else {
        if (tenantId) {
            whereConditions.push('(is_global = TRUE OR tenant_id = $' + (queryParams.length + 1) + ')');
            queryParams.push(tenantId);
        } else {
            whereConditions.push('is_global = TRUE');
        }
    }

    if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' ORDER BY is_global DESC, code ASC';

    const result = await db.query(query, queryParams);
    return result.rows;
};

/**
 * Создать новую работу
 */
export const create = async (workData, tenantId) => {
    const {
        code, name, category, unit, basePrice,
        phase, section, subsection, isGlobal
    } = workData;

    const query = `
    INSERT INTO works (
      code, name, phase, section, subsection, 
      unit, base_price, is_global, tenant_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

    const values = [
        code,
        name,
        phase || category || null,
        section || null,
        subsection || null,
        unit,
        basePrice || 0,
        isGlobal === true,
        isGlobal ? null : tenantId
    ];

    const result = await db.query(query, values);
    return result.rows[0];
};

/**
 * Удалить работу
 */
export const deleteWork = async (id, tenantId) => {
    const query = 'DELETE FROM works WHERE id = $1 AND (tenant_id = $2 OR is_global = TRUE)';
    await db.query(query, [id, tenantId]);
};

export default {
    findAll,
    create,
    deleteWork
};
