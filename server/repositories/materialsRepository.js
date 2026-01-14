import db from '../config/database.js';

/**
 * Получить все материалы с фильтрацией
 */
export const findAll = async (params = {}, tenantId) => {
    const { isGlobal } = params;
    let query = 'SELECT * FROM materials';
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

    query += ' ORDER BY is_global DESC, sku ASC';

    const result = await db.query(query, queryParams);
    return result.rows;
};

/**
 * Создать новый материал
 */
export const create = async (materialData, tenantId) => {
    const {
        sku, name, image, unit, price, supplier, weight,
        category, productUrl, showImage, isGlobal
    } = materialData;

    const query = `
    INSERT INTO materials (
      sku, name, image, unit, price, supplier, weight, 
      category, product_url, show_image, is_global, tenant_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

    const values = [
        sku,
        name,
        image || '',
        unit,
        price || 0,
        supplier || '',
        weight || 0,
        category || '',
        productUrl || '',
        showImage !== false,
        isGlobal === true,
        isGlobal ? null : tenantId
    ];

    const result = await db.query(query, values);
    return result.rows[0];
};

/**
 * Удалить материал
 */
export const deleteMaterial = async (id, tenantId) => {
    const query = 'DELETE FROM materials WHERE id = $1 AND (tenant_id = $2 OR is_global = TRUE)';
    await db.query(query, [id, tenantId]);
};

export default {
    findAll,
    create,
    deleteMaterial
};
