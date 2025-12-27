/**
 * Controller для работы с шаблонами смет
 * Обрабатывает CRUD операции и применение шаблонов к сметам
 */

import db from '../config/database.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Получить все шаблоны текущего пользователя (tenant)
 * GET /api/estimate-templates
 */
export async function getTemplates(req, res) {
  try {
    const { tenantId } = req.user;

    const query = `
      SELECT 
        et.*,
        u.email as created_by_email,
        (SELECT COUNT(*) FROM estimate_template_works WHERE template_id = et.id) as works_count,
        (SELECT COUNT(*) FROM estimate_template_materials WHERE template_id = et.id) as materials_count
      FROM estimate_templates et
      LEFT JOIN users u ON et.created_by = u.id
      WHERE et.tenant_id = $1
      ORDER BY et.created_at DESC
    `;

    const result = await db.query(query, [tenantId]);

    res.status(StatusCodes.OK).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error getting templates:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при получении шаблонов',
      error: error.message
    });
  }
}

/**
 * Получить один шаблон по ID с полными данными (работы и материалы)
 * GET /api/estimate-templates/:id
 */
export async function getTemplateById(req, res) {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    // Получаем шаблон
    const templateQuery = `
      SELECT et.*, u.email as created_by_email
      FROM estimate_templates et
      LEFT JOIN users u ON et.created_by = u.id
      WHERE et.id = $1 AND et.tenant_id = $2
    `;
    const templateResult = await db.query(templateQuery, [id, tenantId]);

    if (templateResult.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Шаблон не найден'
      });
    }

    const template = templateResult.rows[0];

    // Получаем работы шаблона
    const worksQuery = `
      SELECT 
        etw.*,
        w.code, w.name, w.unit, w.base_price
      FROM estimate_template_works etw
      JOIN works w ON etw.work_id = w.id
      WHERE etw.template_id = $1
      ORDER BY etw.sort_order, etw.created_at
    `;
    const worksResult = await db.query(worksQuery, [id]);

    // Получаем все материалы шаблона с привязкой к работам
    const materialsQuery = `
      SELECT 
        etm.*,
        m.sku, m.name, m.unit, m.price, m.supplier,
        etw.work_id
      FROM estimate_template_materials etm
      JOIN materials m ON etm.material_id = m.id
      LEFT JOIN estimate_template_works etw ON etm.template_work_id = etw.id
      WHERE etm.template_id = $1
      ORDER BY etm.sort_order, etm.created_at
    `;
    const materialsResult = await db.query(materialsQuery, [id]);

    // Группируем материалы по работам
    const works = worksResult.rows.map(work => ({
      ...work,
      materials: materialsResult.rows.filter(mat => mat.work_id === work.work_id)
    }));

    // Общее количество материалов
    const totalMaterials = materialsResult.rows.length;

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        ...template,
        works: works,
        totalWorks: worksResult.rows.length,
        totalMaterials: totalMaterials
      }
    });
  } catch (error) {
    console.error('❌ Error getting template by ID:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при получении шаблона',
      error: error.message
    });
  }
}

/**
 * Создать новый шаблон из существующей сметы
 * POST /api/estimate-templates
 * Body: { estimateId, name, description, category }
 */
export async function createTemplate(req, res) {
  const client = await db.pool.connect();
  
  try {
    const { estimateId, name, description, category } = req.body;
    const { tenantId, userId } = req.user;

    if (!estimateId || !name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Необходимо указать estimateId и name'
      });
    }

    await client.query('BEGIN');

    // Создаем шаблон
    const templateQuery = `
      INSERT INTO estimate_templates (tenant_id, name, description, category, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const templateResult = await client.query(templateQuery, [
      tenantId,
      name,
      description || null,
      category || null,
      userId
    ]);

    const templateId = templateResult.rows[0].id;

    // Копируем работы из сметы (из estimate_items) и получаем маппинг старых ID на новые
    const copyWorksQuery = `
      INSERT INTO estimate_template_works (
        template_id, work_id, quantity, phase, section, subsection, sort_order
      )
      SELECT 
        $1, work_id, quantity, phase, section, subsection, ROW_NUMBER() OVER (ORDER BY position_number)
      FROM estimate_items
      WHERE estimate_id = $2 AND work_id IS NOT NULL
      RETURNING id, work_id, (SELECT id FROM estimate_items WHERE estimate_id = $2 AND work_id = estimate_template_works.work_id AND item_type = 'work' LIMIT 1) as source_item_id
    `;
    const worksResult = await client.query(copyWorksQuery, [templateId, estimateId]);

    console.log(`📋 Copied ${worksResult.rowCount} works from estimate`);

    // Создаём маппинг: estimate_item_id -> template_work_id
    const itemToWorkMap = {};
    worksResult.rows.forEach(row => {
      if (row.source_item_id) {
        itemToWorkMap[row.source_item_id] = row.id;
      }
    });

    console.log(`🗺️ Created mapping for ${Object.keys(itemToWorkMap).length} items:`, itemToWorkMap);

    // Копируем материалы из estimate_item_materials с привязкой к работам
    let materialsCount = 0;
    
    if (Object.keys(itemToWorkMap).length > 0) {
      // Сначала проверим сколько материалов есть в оригинальной смете
      const checkMaterialsQuery = `
        SELECT eim.estimate_item_id, COUNT(*) as materials_count
        FROM estimate_item_materials eim
        WHERE eim.estimate_item_id = ANY($1::uuid[])
        GROUP BY eim.estimate_item_id
      `;
      const sourceItemIds = Object.keys(itemToWorkMap);
      const checkResult = await client.query(checkMaterialsQuery, [sourceItemIds]);
      console.log(`📊 Materials per work in estimate:`, checkResult.rows);

      const copyMaterialsQuery = `
        INSERT INTO estimate_template_materials (
          template_id, template_work_id, material_id, quantity, sort_order
        )
        SELECT 
          $1,
          $2,
          eim.material_id,
          eim.quantity,
          ROW_NUMBER() OVER (ORDER BY eim.created_at)
        FROM estimate_item_materials eim
        WHERE eim.estimate_item_id = $3
        RETURNING id, material_id
      `;

      // Вставляем материалы для каждой работы
      for (const [sourceItemId, templateWorkId] of Object.entries(itemToWorkMap)) {
        console.log(`📦 Copying materials for item ${sourceItemId} -> template_work ${templateWorkId}`);
        const matResult = await client.query(copyMaterialsQuery, [templateId, templateWorkId, sourceItemId]);
        console.log(`  ✅ Copied ${matResult.rowCount} materials:`, matResult.rows.map(r => r.material_id));
        materialsCount += matResult.rowCount;
      }
    }

    console.log(`📦 Copied ${materialsCount} materials from estimate`);

    await client.query('COMMIT');

    console.log(`✅ Template created: ${name}, Works: ${worksResult.rowCount}, Materials: ${materialsCount}`);

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: {
        template: templateResult.rows[0],
        worksCount: worksResult.rowCount,
        materialsCount: materialsCount
      },
      message: 'Шаблон успешно создан'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating template:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Шаблон с таким названием уже существует'
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при создании шаблона',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * Обновить шаблон
 * PUT /api/estimate-templates/:id
 * Body: { name, description, category }
 */
export async function updateTemplate(req, res) {
  try {
    const { id } = req.params;
    const { name, description, category } = req.body;
    const { tenantId } = req.user;

    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Необходимо указать name'
      });
    }

    const query = `
      UPDATE estimate_templates
      SET 
        name = $1,
        description = $2,
        category = $3,
        updated_at = NOW()
      WHERE id = $4 AND tenant_id = $5
      RETURNING *
    `;

    const result = await db.query(query, [name, description, category, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Шаблон не найден'
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: result.rows[0],
      message: 'Шаблон успешно обновлен'
    });
  } catch (error) {
    console.error('❌ Error updating template:', error);

    if (error.code === '23505') {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Шаблон с таким названием уже существует'
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при обновлении шаблона',
      error: error.message
    });
  }
}

/**
 * Удалить шаблон
 * DELETE /api/estimate-templates/:id
 */
export async function deleteTemplate(req, res) {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const query = `
      DELETE FROM estimate_templates
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, name
    `;

    const result = await db.query(query, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Шаблон не найден'
      });
    }

    console.log(`✅ Template deleted: ${result.rows[0].name}`);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Шаблон успешно удален'
    });
  } catch (error) {
    console.error('❌ Error deleting template:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при удалении шаблона',
      error: error.message
    });
  }
}

/**
 * Применить шаблон к смете (создать работы и материалы)
 * POST /api/estimate-templates/:id/apply
 * Body: { estimateId }
 */
export async function applyTemplate(req, res) {
  const client = await db.pool.connect();

  try {
    const { id: templateId } = req.params;
    
    // Добавляем отладочное логирование
    console.log('🔍 applyTemplate - req.body:', req.body);
    console.log('🔍 applyTemplate - typeof req.body:', typeof req.body);
    console.log('🔍 applyTemplate - req.headers:', req.headers);
    
    const { estimateId } = req.body;
    const { tenantId } = req.user;

    if (!estimateId) {
      console.error('❌ estimateId is missing or undefined');
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Необходимо указать estimateId'
      });
    }

    await client.query('BEGIN');

    // Проверяем существование шаблона
    const templateCheck = await client.query(
      'SELECT id FROM estimate_templates WHERE id = $1 AND tenant_id = $2',
      [templateId, tenantId]
    );

    if (templateCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Шаблон не найден'
      });
    }

    // Проверяем существование сметы
    const estimateCheck = await client.query(
      'SELECT id FROM estimates WHERE id = $1',
      [estimateId]
    );

    if (estimateCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Смета не найдена'
      });
    }

    // Копируем работы из шаблона в смету (в estimate_items с актуальными ценами)
    // И получаем маппинг template_work_id -> estimate_item_id для последующего копирования материалов
    const copyWorksQuery = `
      INSERT INTO estimate_items (
        estimate_id, work_id, item_type, name, code, unit, quantity, 
        unit_price, phase, section, subsection, position_number, source_type
      )
      SELECT 
        $1,
        etw.work_id,
        'work',
        w.name,
        w.code,
        w.unit,
        etw.quantity,
        w.base_price,
        etw.phase,
        etw.section,
        etw.subsection,
        etw.sort_order,
        'tenant'
      FROM estimate_template_works etw
      JOIN works w ON etw.work_id = w.id
      WHERE etw.template_id = $2
      ORDER BY etw.sort_order
      RETURNING id, work_id, (
        SELECT id FROM estimate_template_works 
        WHERE template_id = $2 AND work_id = estimate_items.work_id 
        LIMIT 1
      ) as template_work_id
    `;
    
    console.log('� Copying works from template:', templateId, 'to estimate:', estimateId);
    
    const worksResult = await client.query(copyWorksQuery, [estimateId, templateId]);

    console.log(`📝 Copied ${worksResult.rowCount} works from template to estimate_items`);

    // Создаём маппинг: template_work_id -> estimate_item_id
    const workToItemMap = {};
    worksResult.rows.forEach(row => {
      if (row.template_work_id) {
        workToItemMap[row.template_work_id] = row.id;
      }
    });

    console.log(`🗺️  Created mapping for ${Object.keys(workToItemMap).length} works`);

    // Копируем материалы из шаблона в estimate_item_materials с привязкой к работам
    // 🔥 АВТОМАТИЧЕСКИЙ РАСЧЁТ КОЭФФИЦИЕНТА РАСХОДА
    let materialsCount = 0;
    
    if (Object.keys(workToItemMap).length > 0) {
      // Получаем данные работы для расчёта коэффициента расхода
      const copyMaterialsQuery = `
        INSERT INTO estimate_item_materials (
          estimate_item_id, material_id, quantity, unit_price, consumption_coefficient, auto_calculate
        )
        SELECT 
          $1,
          etm.material_id,
          etm.quantity,
          m.price,
          CASE 
            WHEN etw.quantity > 0 THEN etm.quantity / etw.quantity
            ELSE 1.0
          END,
          true
        FROM estimate_template_materials etm
        JOIN materials m ON etm.material_id = m.id
        JOIN estimate_template_works etw ON etm.template_work_id = etw.id
        WHERE etm.template_work_id = $2
      `;

      // Вставляем материалы для каждой работы
      for (const [templateWorkId, estimateItemId] of Object.entries(workToItemMap)) {
        const matResult = await client.query(copyMaterialsQuery, [estimateItemId, templateWorkId]);
        materialsCount += matResult.rowCount;
        if (matResult.rowCount > 0) {
          console.log(`  📦 Added ${matResult.rowCount} materials to work ${estimateItemId} with auto-calculated coefficient`);
        }
      }
    }

    console.log(`📦 Total materials copied: ${materialsCount}`);

    await client.query('COMMIT');

    console.log(`✅ Template applied to estimate ${estimateId}: Works: ${worksResult.rowCount}, Materials: ${materialsCount}`);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        worksAdded: worksResult.rowCount,
        materialsAdded: materialsCount
      },
      message: `Шаблон применен: добавлено работ - ${worksResult.rowCount}, материалов - ${materialsCount}`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error applying template:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Ошибка при применении шаблона',
      error: error.message
    });
  } finally {
    client.release();
  }
}
