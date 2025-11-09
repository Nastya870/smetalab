import db from '../config/database.js';

/**
 * Получить все выполненные работы для сметы
 */
export const getWorkCompletions = async (req, res) => {
  const { estimateId } = req.params;
  const tenantId = req.user.tenantId;

  try {
    // ⭐ Добавили JOIN с work_completion_acts для получения act_number
    const result = await db.query(
      `SELECT 
        wc.id,
        wc.estimate_id,
        wc.estimate_item_id,
        wc.completed,
        wc.actual_quantity,
        wc.actual_total,
        wc.completion_date,
        wc.notes,
        wc.last_act_id,
        wca.act_number,
        wca.act_type,
        wc.created_at,
        wc.updated_at
      FROM work_completions wc
      LEFT JOIN work_completion_acts wca ON wc.last_act_id = wca.id
      WHERE wc.estimate_id = $1 AND wc.tenant_id = $2
      ORDER BY wc.created_at ASC`,
      [estimateId, tenantId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching work completions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch work completions',
      message: error.message
    });
  }
};

/**
 * Сохранить или обновить выполнение работы
 */
export const upsertWorkCompletion = async (req, res) => {
  const { estimateId } = req.params;
  const { estimateItemId, completed, actualQuantity, actualTotal, notes } = req.body;
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  try {
    // Проверяем, существует ли запись
    const existing = await db.query(
      `SELECT id FROM work_completions 
       WHERE estimate_id = $1 AND estimate_item_id = $2 AND tenant_id = $3`,
      [estimateId, estimateItemId, tenantId]
    );

    let result;

    if (existing.rows.length > 0) {
      // UPDATE существующей записи
      result = await db.query(
        `UPDATE work_completions
         SET completed = $1,
             actual_quantity = $2,
             actual_total = $3,
             completion_date = CASE WHEN $1 = true THEN NOW() ELSE completion_date END,
             notes = $4,
             updated_by = $5,
             updated_at = NOW()
         WHERE estimate_id = $6 AND estimate_item_id = $7 AND tenant_id = $8
         RETURNING *`,
        [completed, actualQuantity, actualTotal, notes, userId, estimateId, estimateItemId, tenantId]
      );
    } else {
      // INSERT новой записи
      result = await db.query(
        `INSERT INTO work_completions (
          estimate_id,
          estimate_item_id,
          tenant_id,
          completed,
          actual_quantity,
          actual_total,
          completion_date,
          notes,
          created_by,
          updated_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          estimateId,
          estimateItemId,
          tenantId,
          completed,
          actualQuantity,
          actualTotal,
          completed ? new Date() : null,
          notes,
          userId,
          userId
        ]
      );
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Work completion saved successfully'
    });
  } catch (error) {
    console.error('Error saving work completion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save work completion',
      message: error.message
    });
  }
};

/**
 * Пакетное сохранение выполненных работ
 */
export const batchUpsertWorkCompletions = async (req, res) => {
  const { estimateId } = req.params;
  const { completions } = req.body; // Массив объектов с данными
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  try {
    await db.query('BEGIN');

    const results = [];

    for (const completion of completions) {
      const { estimateItemId, completed, actualQuantity, actualTotal, notes } = completion;

      // Проверяем существование
      const existing = await db.query(
        `SELECT id FROM work_completions 
         WHERE estimate_id = $1 AND estimate_item_id = $2 AND tenant_id = $3`,
        [estimateId, estimateItemId, tenantId]
      );

      let result;

      if (existing.rows.length > 0) {
        // UPDATE
        result = await db.query(
          `UPDATE work_completions
           SET completed = $1,
               actual_quantity = $2,
               actual_total = $3,
               completion_date = CASE WHEN $1 = true THEN NOW() ELSE completion_date END,
               notes = $4,
               updated_by = $5,
               updated_at = NOW()
           WHERE estimate_id = $6 AND estimate_item_id = $7 AND tenant_id = $8
           RETURNING *`,
          [completed, actualQuantity, actualTotal, notes, userId, estimateId, estimateItemId, tenantId]
        );
      } else {
        // INSERT
        result = await db.query(
          `INSERT INTO work_completions (
            estimate_id,
            estimate_item_id,
            tenant_id,
            completed,
            actual_quantity,
            actual_total,
            completion_date,
            notes,
            created_by,
            updated_by
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            estimateId,
            estimateItemId,
            tenantId,
            completed,
            actualQuantity,
            actualTotal,
            completed ? new Date() : null,
            notes,
            userId,
            userId
          ]
        );
      }

      results.push(result.rows[0]);
    }

    await db.query('COMMIT');

    res.json({
      success: true,
      data: results,
      message: `${results.length} work completions saved successfully`
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error batch saving work completions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch save work completions',
      message: error.message
    });
  }
};

/**
 * Удалить выполнение работы
 */
export const deleteWorkCompletion = async (req, res) => {
  const { estimateId, estimateItemId } = req.params;
  const tenantId = req.user.tenantId;

  try {
    await db.query(
      `DELETE FROM work_completions
       WHERE estimate_id = $1 AND estimate_item_id = $2 AND tenant_id = $3`,
      [estimateId, estimateItemId, tenantId]
    );

    res.json({
      success: true,
      message: 'Work completion deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting work completion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete work completion',
      message: error.message
    });
  }
};

export default {
  getWorkCompletions,
  upsertWorkCompletion,
  batchUpsertWorkCompletions,
  deleteWorkCompletion
};
