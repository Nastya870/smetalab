/**
 * Work Materials Controller
 * Управление связями между работами и материалами
 */

import { query } from '../config/database.js';

/**
 * @swagger
 * /work-materials:
 *   get:
 *     tags: [Work Materials]
 *     summary: Получить все связи работ и материалов
 *     description: Возвращает список связей между работами и материалами с фильтрацией
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Фильтр по ID работы
 *       - in: query
 *         name: materialId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Фильтр по ID материала
 *       - in: query
 *         name: isRequired
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Фильтр по обязательности материала
 *     responses:
 *       200:
 *         description: Список связей получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       work_id:
 *                         type: string
 *                       material_id:
 *                         type: string
 *                       quantity_per_unit:
 *                         type: number
 *                       is_required:
 *                         type: boolean
 *                       work_code:
 *                         type: string
 *                       work_name:
 *                         type: string
 *                       material_name:
 *                         type: string
 *                       material_price:
 *                         type: number
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const getAllWorkMaterials = async (req, res) => {
  try {
    const { workId, materialId, isRequired } = req.query;
    const tenantId = req.user?.tenantId;

    let queryText = `
      SELECT 
        wm.*,
        w.code as work_code,
        w.name as work_name,
        w.unit as work_unit,
        m.name as material_name,
        m.unit as material_unit,
        m.price as material_price,
        m.category as material_category
      FROM work_materials wm
      JOIN works w ON wm.work_id = w.id
      JOIN materials m ON wm.material_id = m.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (tenantId) {
      queryText += ` AND wm.tenant_id = $${paramCount}`;
      params.push(tenantId);
      paramCount++;
    }

    if (workId) {
      queryText += ` AND wm.work_id = $${paramCount}`;
      params.push(workId);
      paramCount++;
    }

    if (materialId) {
      queryText += ` AND wm.material_id = $${paramCount}`;
      params.push(materialId);
      paramCount++;
    }

    if (isRequired !== undefined) {
      queryText += ` AND wm.is_required = $${paramCount}`;
      params.push(isRequired === 'true');
      paramCount++;
    }

    queryText += ' ORDER BY wm.id';

    const result = await query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching work-materials:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении связей работ и материалов',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /work-materials/by-work/{workId}:
 *   get:
 *     tags: [Work Materials]
 *     summary: Получить материалы для работы
 *     description: Возвращает все материалы, используемые в конкретной работе
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Список материалов получен
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const getMaterialsByWork = async (req, res) => {
  try {
    const { workId } = req.params;
    const tenantId = req.user?.tenantId;

    // Загружаем материалы работы с фильтрацией по tenant_id
    // Разрешаем глобальные материалы (tenant_id IS NULL) + материалы текущего тенанта
    const result = await query(
      `
      SELECT 
        wm.*,
        m.name as material_name,
        m.sku as material_sku,
        m.unit as material_unit,
        m.price as material_price,
        m.category as material_category,
        m.supplier,
        m.image,
        m.tenant_id
      FROM work_materials wm
      JOIN materials m ON wm.material_id = m.id
      WHERE wm.work_id = $1
        AND (m.tenant_id IS NULL OR m.tenant_id = $2)
      ORDER BY wm.is_required DESC, m.name
      `,
      [workId, tenantId]
    );

    res.json({
      success: true,
      workId: parseInt(workId),
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching materials for work:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении материалов для работы',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /work-materials/by-material/{materialId}:
 *   get:
 *     tags: [Work Materials]
 *     summary: Получить работы, использующие материал
 *     description: Возвращает все работы, в которых используется данный материал
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: materialId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Список работ получен
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const getWorksByMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const tenantId = req.user?.tenantId;

    const result = await query(
      `
      SELECT 
        wm.*,
        w.code as work_code,
        w.name as work_name,
        w.unit as work_unit,
        w.base_price as work_price,
        w.category as work_category
      FROM work_materials wm
      JOIN works w ON wm.work_id = w.id
      WHERE wm.material_id = $1
        ${tenantId ? 'AND wm.tenant_id = $2' : ''}
      ORDER BY w.code
      `,
      tenantId ? [materialId, tenantId] : [materialId]
    );

    res.json({
      success: true,
      materialId: parseInt(materialId),
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching works for material:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении работ для материала',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /work-materials:
 *   post:
 *     tags: [Work Materials]
 *     summary: Создать связь работа-материал
 *     description: Создаёт новую связь между работой и материалом с указанием расхода
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workId
 *               - materialId
 *             properties:
 *               workId:
 *                 type: string
 *                 format: uuid
 *               materialId:
 *                 type: string
 *                 format: uuid
 *               consumption:
 *                 type: number
 *                 description: Расход материала на ед. работы
 *                 default: 1.0
 *               isRequired:
 *                 type: boolean
 *                 default: true
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Связь успешно создана
 *       400:
 *         description: Некорректные данные
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const createWorkMaterial = async (req, res) => {
  try {
    const { workId, materialId, consumption, isRequired, notes } = req.body;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!workId || !materialId) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать workId и materialId'
      });
    }

    const result = await query(
      `
      INSERT INTO work_materials (
        work_id, material_id, consumption, is_required, notes,
        tenant_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        workId,
        materialId,
        consumption || 1.0,
        isRequired !== false,
        notes || null,
        tenantId,
        userId
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Связь работа-материал создана',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating work-material:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании связи',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /work-materials/{id}:
 *   put:
 *     tags: [Work Materials]
 *     summary: Обновить связь работа-материал
 *     description: Обновляет параметры связи (расход, обязательность)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               consumption:
 *                 type: number
 *               isRequired:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Связь обновлена
 *       404:
 *         description: Связь не найдена
 *       500:
 *         description: Ошибка сервера
 */
export const updateWorkMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { consumption, isRequired, notes } = req.body;
    const userId = req.user?.id;

    const result = await query(
      `
      UPDATE work_materials
      SET 
        consumption = COALESCE($1, consumption),
        is_required = COALESCE($2, is_required),
        notes = COALESCE($3, notes),
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $4
      WHERE id = $5
      RETURNING *
      `,
      [consumption, isRequired, notes, userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Связь не найдена'
      });
    }

    res.json({
      success: true,
      message: 'Связь обновлена',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating work-material:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении связи',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /work-materials/{id}:
 *   delete:
 *     tags: [Work Materials]
 *     summary: Удалить связь работа-материал
 *     description: Удаляет связь между работой и материалом
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Связь удалена
 *       404:
 *         description: Связь не найдена
 *       500:
 *         description: Ошибка сервера
 */
export const deleteWorkMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM work_materials WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Связь не найдена'
      });
    }

    res.json({
      success: true,
      message: 'Связь удалена',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting work-material:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении связи',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /work-materials/batch:
 *   post:
 *     tags: [Work Materials]
 *     summary: Получить материалы для нескольких работ
 *     description: Возвращает материалы для массива работ (оптимизированный запрос)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workIds
 *             properties:
 *               workIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Материалы получены
 *       400:
 *         description: Некорректный запрос
 *       500:
 *         description: Ошибка сервера
 */
export const getMaterialsForMultipleWorks = async (req, res) => {
  try {
    const { workIds } = req.body;
    const tenantId = req.user?.tenantId;

    if (!workIds || !Array.isArray(workIds) || workIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'workIds должен быть непустым массивом'
      });
    }

    // ⚡ Один запрос для всех работ
    const result = await query(
      `
      SELECT 
        wm.work_id,
        wm.material_id,
        wm.consumption,
        wm.is_required,
        m.name as material_name,
        m.sku as material_sku,
        m.unit as material_unit,
        m.price as material_price,
        m.category as material_category,
        m.supplier,
        m.image,
        m.tenant_id
      FROM work_materials wm
      JOIN materials m ON wm.material_id = m.id
      WHERE wm.work_id = ANY($1)
        AND (m.tenant_id IS NULL OR m.tenant_id = $2)
      ORDER BY wm.work_id, wm.is_required DESC, m.name
      `,
      [workIds, tenantId]
    );

    // Группируем по work_id
    const grouped = {};
    result.rows.forEach(row => {
      if (!grouped[row.work_id]) {
        grouped[row.work_id] = [];
      }
      grouped[row.work_id].push(row);
    });

    // Для работ без материалов возвращаем пустой массив
    workIds.forEach(workId => {
      if (!grouped[workId]) {
        grouped[workId] = [];
      }
    });

    res.json({
      success: true,
      count: result.rows.length,
      workIds: workIds,
      data: grouped
    });
  } catch (error) {
    console.error('Error fetching materials for multiple works:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении материалов для работ',
      error: error.message
    });
  }
};
