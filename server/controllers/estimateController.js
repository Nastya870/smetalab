import { query, transaction, setSessionContext } from '../config/database.js';

/**
 * GET /api/estimates
 * Получение списка смет текущей компании
 */
export const getEstimates = async (req, res) => {
  try {
    const { userId, tenantId } = req.user;
    const { status, limit = 50, offset = 0, search } = req.query;

    // Устанавливаем контекст для RLS
    await setSessionContext(userId, tenantId);

    let queryText = `
      SELECT 
        e.*,
        u.full_name as creator_name,
        a.full_name as approver_name,
        COUNT(ei.id) as items_count
      FROM estimates e
      JOIN users u ON e.created_by = u.id
      LEFT JOIN users a ON e.approved_by = a.id
      LEFT JOIN estimate_items ei ON e.id = ei.estimate_id
      WHERE e.tenant_id = $1
    `;
    
    const params = [tenantId];
    let paramIndex = 2;

    // Фильтр по статусу
    if (status) {
      queryText += ` AND e.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Поиск
    if (search) {
      queryText += ` AND (
        e.title ILIKE $${paramIndex} OR
        e.number ILIKE $${paramIndex} OR
        e.client_name ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    queryText += `
      GROUP BY e.id, u.full_name, a.full_name
      ORDER BY e.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, params);

    // Получаем общее количество
    let countQuery = 'SELECT COUNT(*) as total FROM estimates WHERE tenant_id = $1';
    const countParams = [tenantId];
    
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }
    
    const countResult = await query(countQuery, countParams);

    res.json({
      success: true,
      data: {
        estimates: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get estimates error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении смет'
    });
  }
};

/**
 * GET /api/estimates/:id
 * Получение конкретной сметы с позициями
 */
export const getEstimate = async (req, res) => {
  try {
    const { userId, tenantId } = req.user;
    const { id } = req.params;

    await setSessionContext(userId, tenantId);

    // Получаем смету
    const estimateResult = await query(
      `SELECT 
        e.*,
        u.full_name as creator_name,
        u.email as creator_email,
        a.full_name as approver_name
      FROM estimates e
      JOIN users u ON e.created_by = u.id
      LEFT JOIN users a ON e.approved_by = a.id
      WHERE e.id = $1 AND e.tenant_id = $2`,
      [id, tenantId]
    );

    if (estimateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Смета не найдена'
      });
    }

    // Получаем позиции сметы
    const itemsResult = await query(
      `SELECT * FROM estimate_items
       WHERE estimate_id = $1
       ORDER BY position_number`,
      [id]
    );

    res.json({
      success: true,
      data: {
        estimate: estimateResult.rows[0],
        items: itemsResult.rows
      }
    });

  } catch (error) {
    console.error('Get estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении сметы'
    });
  }
};

/**
 * POST /api/estimates
 * Создание новой сметы
 */
export const createEstimate = async (req, res) => {
  try {
    const { userId, tenantId } = req.user;
    const {
      title,
      description,
      client_name,
      client_contact,
      project_name,
      project_address,
      estimate_date,
      valid_until,
      currency = 'RUB',
      notes,
      tags,
      items = [] // Массив позиций сметы
    } = req.body;

    // Валидация
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Название сметы обязательно'
      });
    }

    const result = await transaction(async (client) => {
      await setSessionContext(userId, tenantId, client);

      // Генерируем номер сметы
      const numberResult = await client.query(
        'SELECT generate_estimate_number($1) as number',
        [tenantId]
      );
      const estimateNumber = numberResult.rows[0].number;

      // Создаем смету
      const estimateResult = await client.query(
        `INSERT INTO estimates (
          tenant_id, created_by, number, title, description,
          client_name, client_contact, project_name, project_address,
          estimate_date, valid_until, currency, notes, tags, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'draft')
        RETURNING *`,
        [
          tenantId, userId, estimateNumber, title, description,
          client_name, client_contact, project_name, project_address,
          estimate_date, valid_until, currency, notes, tags
        ]
      );

      const estimate = estimateResult.rows[0];

      // Добавляем позиции, если они есть
      const createdItems = [];
      if (items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemResult = await client.query(
            `INSERT INTO estimate_items (
              estimate_id, position_number, item_type, name, description,
              unit, quantity, unit_price, overhead_percent, profit_percent, tax_percent,
              final_price, notes, is_optional
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`,
            [
              estimate.id,
              i + 1,
              item.item_type || 'work',
              item.name,
              item.description,
              item.unit,
              item.quantity,
              item.unit_price,
              item.overhead_percent || 0,
              item.profit_percent || 0,
              item.tax_percent || 0,
              item.final_price || (item.quantity * item.unit_price),
              item.notes,
              item.is_optional || false
            ]
          );
          createdItems.push(itemResult.rows[0]);
        }
      }

      return { estimate, items: createdItems };
    });

    res.status(201).json({
      success: true,
      message: 'Смета успешно создана',
      data: result
    });

  } catch (error) {
    console.error('Create estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании сметы'
    });
  }
};

/**
 * PUT /api/estimates/:id
 * Обновление сметы
 */
export const updateEstimate = async (req, res) => {
  try {
    const { userId, tenantId } = req.user;
    const { id } = req.params;
    const updates = req.body;

    await setSessionContext(userId, tenantId);

    // Проверяем существование сметы
    const existingResult = await query(
      'SELECT * FROM estimates WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Смета не найдена'
      });
    }

    // Формируем запрос обновления
    const allowedFields = [
      'title', 'description', 'client_name', 'client_contact',
      'project_name', 'project_address', 'estimate_date', 'valid_until',
      'currency', 'notes', 'tags', 'status'
    ];

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Нет полей для обновления'
      });
    }

    values.push(id, tenantId);

    const result = await query(
      `UPDATE estimates 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    res.json({
      success: true,
      message: 'Смета успешно обновлена',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении сметы'
    });
  }
};

/**
 * DELETE /api/estimates/:id
 * Удаление сметы
 */
export const deleteEstimate = async (req, res) => {
  try {
    const { userId, tenantId } = req.user;
    const { id } = req.params;

    await setSessionContext(userId, tenantId);

    const result = await query(
      'DELETE FROM estimates WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Смета не найдена'
      });
    }

    res.json({
      success: true,
      message: 'Смета успешно удалена'
    });

  } catch (error) {
    console.error('Delete estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении сметы'
    });
  }
};
