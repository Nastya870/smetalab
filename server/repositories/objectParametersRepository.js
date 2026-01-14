/**
 * Repository для работы с параметрами объектов и проемами
 */

import db from '../config/database.js';
const pool = db.pool; // Извлекаем pool из экспортированного объекта

/**
 * Получить все параметры помещений для сметы
 * @param {string} estimateId - ID сметы
 * @param {string} tenantId - ID тенанта
 * @returns {Promise<Array>} - Массив параметров с проемами
 */
async function findByEstimateId(estimateId, tenantId) {
  const query = `
    SELECT 
      op.id,
      op.estimate_id,
      op.position_number,
      op.room_name,
      op.perimeter,
      op.height,
      op.floor_area,
      op.wall_area,
      op.ceiling_area,
      op.ceiling_slopes,
      op.doors_count,
      op.baseboards,
      op.total_window_slopes,
      op.created_at,
      op.updated_at,
      -- JSON с проемами
      (SELECT json_agg(json_build_object(
        'id', oo.id,
        'type', oo.opening_type,
        'position', oo.position_number,
        'height', oo.height,
        'width', oo.width,
        'slopeLength', oo.slope_length
      ) ORDER BY oo.opening_type, oo.position_number)
       FROM object_openings oo
       WHERE oo.parameter_id = op.id
      ) as openings
    FROM object_parameters op
    WHERE op.estimate_id = $1 AND op.tenant_id = $2
    ORDER BY op.position_number
  `;

  const result = await pool.query(query, [estimateId, tenantId]);
  console.log('📊 [findByEstimateId] Loaded parameters:', result.rows.map(r => ({
    id: r.id,
    room_name: r.room_name,
    floor_area: r.floor_area,
    wall_area: r.wall_area,
    total_window_slopes: r.total_window_slopes,
    ceiling_area: r.ceiling_area
  })));
  return result.rows;
}

/**
 * Получить параметр помещения по ID
 * @param {string} parameterId - ID параметра
 * @param {string} tenantId - ID тенанта
 * @returns {Promise<Object>} - Параметр с проемами
 */
async function findById(parameterId, tenantId) {
  const query = `
    SELECT 
      op.*,
      (SELECT json_agg(json_build_object(
        'id', oo.id,
        'type', oo.opening_type,
        'position', oo.position_number,
        'height', oo.height,
        'width', oo.width,
        'slopeLength', oo.slope_length
      ) ORDER BY oo.opening_type, oo.position_number)
       FROM object_openings oo
       WHERE oo.parameter_id = op.id
      ) as openings
    FROM object_parameters op
    WHERE op.id = $1 AND op.tenant_id = $2
  `;

  const result = await pool.query(query, [parameterId, tenantId]);

  if (result.rows.length === 0) {
    throw new Error('Параметр помещения не найден');
  }

  return result.rows[0];
}

/**
 * Сохранить все параметры помещений для сметы (bulk save)
 * Удаляет старые данные и создает новые в транзакции
 * 
 * ✅ ОПТИМИЗИРОВАНО: Использует UNNEST для batch insert вместо циклов
 * Было: ~50 запросов (10 помещений × 3 проёма + 10 SELECT)
 * Стало: 4 запроса (DELETE + INSERT parameters + INSERT openings + SELECT)
 * 
 * @param {string} estimateId - ID сметы
 * @param {Array} parameters - Массив параметров с проемами
 * @param {string} tenantId - ID тенанта
 * @param {string} userId - ID пользователя
 * @returns {Promise<Array>} - Созданные параметры
 */
async function saveAll(estimateId, parameters, tenantId, userId) {
  const client = await pool.connect();

  try {
    console.log('🔄 [saveAll] Starting optimized batch save');
    console.log(`   Parameters count: ${parameters.length}`);
    await client.query('BEGIN');

    // Устанавливаем tenant_id для RLS политик
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new Error(`Invalid tenant_id format: ${tenantId}`);
    }
    await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);

    // 1. Удаляем старые параметры (CASCADE удалит и проемы)
    const deleteResult = await client.query(
      'DELETE FROM object_parameters WHERE estimate_id = $1 AND tenant_id = $2',
      [estimateId, tenantId]
    );
    console.log(`🗑️  [saveAll] Deleted ${deleteResult.rowCount} old parameters`);

    if (parameters.length === 0) {
      await client.query('COMMIT');
      return [];
    }

    // 2. Подготавливаем массивы для UNNEST (параметры)
    const paramTenantIds = [];
    const paramEstimateIds = [];
    const paramPositions = [];
    const paramRoomNames = [];
    const paramPerimeters = [];
    const paramHeights = [];
    const paramFloorAreas = [];
    const paramWallAreas = [];
    const paramCeilingAreas = [];
    const paramCeilingSlopes = [];
    const paramDoorsCounts = [];
    const paramBaseboards = [];
    const paramWindowSlopes = [];
    const paramCreatedBys = [];
    const paramUpdatedBys = [];

    parameters.forEach((param, index) => {
      paramTenantIds.push(tenantId);
      paramEstimateIds.push(estimateId);
      paramPositions.push(index + 1);
      paramRoomNames.push(param.roomName || '');
      paramPerimeters.push(param.perimeter || null);
      paramHeights.push(param.height || null);
      paramFloorAreas.push(param.floorArea || null);
      paramWallAreas.push(param.wallArea || null);
      paramCeilingAreas.push(param.ceilingArea || null);
      paramCeilingSlopes.push(param.ceilingSlopes || null);
      paramDoorsCounts.push(param.doorsCount || 0);
      paramBaseboards.push(param.baseboards || null);
      paramWindowSlopes.push(param.totalWindowSlopes || null);
      paramCreatedBys.push(userId);
      paramUpdatedBys.push(userId);
    });

    // 3. Batch INSERT параметров через UNNEST
    const insertParamsQuery = `
      INSERT INTO object_parameters (
        tenant_id, estimate_id, position_number, room_name,
        perimeter, height, floor_area, wall_area, ceiling_area,
        ceiling_slopes, doors_count, baseboards, total_window_slopes,
        created_by, updated_by
      )
      SELECT * FROM UNNEST(
        $1::uuid[], $2::uuid[], $3::int[], $4::text[],
        $5::numeric[], $6::numeric[], $7::numeric[], $8::numeric[], $9::numeric[],
        $10::numeric[], $11::int[], $12::numeric[], $13::numeric[],
        $14::uuid[], $15::uuid[]
      )
      RETURNING id, position_number
    `;

    const insertParamsResult = await client.query(insertParamsQuery, [
      paramTenantIds, paramEstimateIds, paramPositions, paramRoomNames,
      paramPerimeters, paramHeights, paramFloorAreas, paramWallAreas, paramCeilingAreas,
      paramCeilingSlopes, paramDoorsCounts, paramBaseboards, paramWindowSlopes,
      paramCreatedBys, paramUpdatedBys
    ]);

    console.log(`✅ [saveAll] Inserted ${insertParamsResult.rows.length} parameters in ONE query`);

    // Создаём маппинг position_number -> id для связи проёмов
    const positionToIdMap = {};
    insertParamsResult.rows.forEach(row => {
      positionToIdMap[row.position_number] = row.id;
    });

    // 4. Подготавливаем массивы для UNNEST (проёмы)
    const openingTenantIds = [];
    const openingParameterIds = [];
    const openingTypes = [];
    const openingPositions = [];
    const openingHeights = [];
    const openingWidths = [];

    parameters.forEach((param, paramIndex) => {
      const parameterId = positionToIdMap[paramIndex + 1];

      if (param.openings && Array.isArray(param.openings)) {
        param.openings.forEach(opening => {
          if (opening.height && opening.width && opening.height > 0 && opening.width > 0) {
            openingTenantIds.push(tenantId);
            openingParameterIds.push(parameterId);
            openingTypes.push(opening.type);
            openingPositions.push(opening.position);
            openingHeights.push(opening.height);
            openingWidths.push(opening.width);
          }
        });
      }
    });

    // 5. Batch INSERT проёмов через UNNEST (если есть)
    if (openingTenantIds.length > 0) {
      const insertOpeningsQuery = `
        INSERT INTO object_openings (
          tenant_id, parameter_id, opening_type, position_number, height, width
        )
        SELECT * FROM UNNEST(
          $1::uuid[], $2::uuid[], $3::text[], $4::int[], $5::numeric[], $6::numeric[]
        )
      `;

      await client.query(insertOpeningsQuery, [
        openingTenantIds, openingParameterIds, openingTypes,
        openingPositions, openingHeights, openingWidths
      ]);

      console.log(`✅ [saveAll] Inserted ${openingTenantIds.length} openings in ONE query`);
    }

    // 6. Загружаем результат с вычисленными полями (триггеры могли обновить total_window_slopes)
    const selectQuery = `
      SELECT 
        op.*,
        (SELECT json_agg(json_build_object(
          'id', oo.id,
          'type', oo.opening_type,
          'position', oo.position_number,
          'height', oo.height,
          'width', oo.width,
          'slopeLength', oo.slope_length
        ) ORDER BY oo.opening_type, oo.position_number)
         FROM object_openings oo
         WHERE oo.parameter_id = op.id
        ) as openings
      FROM object_parameters op
      WHERE op.estimate_id = $1 AND op.tenant_id = $2
      ORDER BY op.position_number
    `;

    const selectResult = await client.query(selectQuery, [estimateId, tenantId]);

    await client.query('COMMIT');

    console.log(`🎉 [saveAll] Completed! Total queries: 4 (DELETE + INSERT params + INSERT openings + SELECT)`);

    return selectResult.rows;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [saveAll] Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Обновить параметр помещения
 * @param {string} parameterId - ID параметра
 * @param {Object} data - Данные для обновления
 * @param {string} tenantId - ID тенанта
 * @param {string} userId - ID пользователя
 * @returns {Promise<Object>} - Обновленный параметр
 */
async function update(parameterId, data, tenantId, userId) {
  const query = `
    UPDATE object_parameters
    SET
      room_name = COALESCE($1, room_name),
      perimeter = COALESCE($2, perimeter),
      height = COALESCE($3, height),
      floor_area = COALESCE($4, floor_area),
      wall_area = COALESCE($5, wall_area),
      ceiling_area = COALESCE($6, ceiling_area),
      ceiling_slopes = COALESCE($7, ceiling_slopes),
      doors_count = COALESCE($8, doors_count),
      baseboards = COALESCE($9, baseboards),
      updated_by = $10,
      updated_at = NOW()
    WHERE id = $11 AND tenant_id = $12
    RETURNING *
  `;

  const values = [
    data.roomName,
    data.perimeter,
    data.height,
    data.floorArea,
    data.wallArea,
    data.ceilingArea,
    data.ceilingSlopes,
    data.doorsCount,
    data.baseboards,
    userId,
    parameterId,
    tenantId
  ];

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    throw new Error('Параметр помещения не найден или нет доступа');
  }

  return result.rows[0];
}

/**
 * Удалить параметр помещения
 * @param {string} parameterId - ID параметра
 * @param {string} tenantId - ID тенанта
 * @returns {Promise<void>}
 */
async function deleteParameter(parameterId, tenantId) {
  const query = `
    DELETE FROM object_parameters
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `;

  const result = await pool.query(query, [parameterId, tenantId]);

  if (result.rows.length === 0) {
    throw new Error('Параметр помещения не найден или нет доступа');
  }
}

/**
 * Получить статистику по параметрам сметы
 * @param {string} estimateId - ID сметы
 * @param {string} tenantId - ID тенанта
 * @returns {Promise<Object>} - Статистика
 */
async function getStatistics(estimateId, tenantId) {
  const query = `
    SELECT 
      COUNT(*)::INTEGER as rooms_count,
      COALESCE(SUM(floor_area), 0) as total_floor_area,
      COALESCE(SUM(wall_area), 0) as total_wall_area,
      COALESCE(SUM(ceiling_area), 0) as total_ceiling_area,
      COALESCE(SUM(total_window_slopes), 0) as total_window_slopes,
      (SELECT COUNT(*) FROM object_openings oo 
       JOIN object_parameters p ON oo.parameter_id = p.id 
       WHERE p.estimate_id = $1 AND p.tenant_id = $2 AND oo.opening_type = 'window') as total_windows_count,
      (SELECT COUNT(*) FROM object_openings oo 
       JOIN object_parameters p ON oo.parameter_id = p.id 
       WHERE p.estimate_id = $1 AND p.tenant_id = $2 AND oo.opening_type = 'portal') as total_portals_count
    FROM object_parameters
    WHERE estimate_id = $1 AND tenant_id = $2
  `;

  const result = await pool.query(query, [estimateId, tenantId]);
  return result.rows[0];
}

export default {
  findByEstimateId,
  findById,
  saveAll,
  update,
  deleteParameter,
  getStatistics
};
