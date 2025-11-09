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
 * @param {string} estimateId - ID сметы
 * @param {Array} parameters - Массив параметров с проемами
 * @param {string} tenantId - ID тенанта
 * @param {string} userId - ID пользователя
 * @returns {Promise<Array>} - Созданные параметры
 */
async function saveAll(estimateId, parameters, tenantId, userId) {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting transaction for saveAll');
    await client.query('BEGIN');

    // Устанавливаем tenant_id для RLS политик
    // SET LOCAL не поддерживает параметризованные запросы, но tenantId это UUID - безопасно
    console.log('🔐 Setting RLS tenant_id:', tenantId);
    
    // Проверяем что tenantId это валидный UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new Error(`Invalid tenant_id format: ${tenantId}`);
    }
    
    await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);

    // 1. Удаляем старые параметры (CASCADE удалит и проемы)
    console.log('🗑️  Deleting old parameters for estimate:', estimateId);
    const deleteResult = await client.query(
      'DELETE FROM object_parameters WHERE estimate_id = $1 AND tenant_id = $2',
      [estimateId, tenantId]
    );
    console.log('🗑️  Deleted rows:', deleteResult.rowCount);

    const createdParameters = [];

    // 2. Создаем новые параметры
    console.log('📝 Creating', parameters.length, 'new parameters');
    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i];
      console.log(`  - Parameter ${i + 1}:`, param.roomName);
      
      // Вставляем параметр помещения
      const paramQuery = `
        INSERT INTO object_parameters (
          tenant_id, estimate_id, position_number, room_name,
          perimeter, height, floor_area, wall_area, ceiling_area,
          ceiling_slopes, doors_count, baseboards,
          created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const paramValues = [
        tenantId,
        estimateId,
        i + 1, // position_number
        param.roomName || '',
        param.perimeter || null,
        param.height || null,
        param.floorArea || null,
        param.wallArea || null,
        param.ceilingArea || null,
        param.ceilingSlopes || null,
        param.doorsCount || 0,
        param.baseboards || null,
        userId,
        userId
      ];

      console.log(`💾 Inserting parameter ${i + 1}:`, {
        tenant_id: paramValues[0],
        estimate_id: paramValues[1],
        position_number: paramValues[2],
        room_name: paramValues[3],
        perimeter: paramValues[4],
        height: paramValues[5],
        floor_area: paramValues[6],
        wall_area: paramValues[7],
        ceiling_area: paramValues[8],
        ceiling_slopes: paramValues[9],
        doors_count: paramValues[10],
        baseboards: paramValues[11],
        created_by: paramValues[12],
        updated_by: paramValues[13]
      });

      const paramResult = await client.query(paramQuery, paramValues);
      const createdParam = paramResult.rows[0];

      // 3. Создаем проемы для этого параметра
      const openings = [];
      
      if (param.openings && Array.isArray(param.openings)) {
        console.log(`🚪 Creating ${param.openings.length} openings for parameter ${createdParam.id}`);
        
        for (const opening of param.openings) {
          const openingQuery = `
            INSERT INTO object_openings (
              tenant_id, parameter_id, opening_type, position_number,
              height, width
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *, slope_length as "slopeLength"
          `;

          const openingValues = [
            tenantId,
            createdParam.id,
            opening.type,
            opening.position,
            opening.height,
            opening.width
          ];

          console.log(`  🔹 Opening:`, {
            tenant_id: openingValues[0],
            parameter_id: openingValues[1],
            opening_type: openingValues[2],
            position_number: openingValues[3],
            height: openingValues[4],
            width: openingValues[5]
          });

          const openingResult = await client.query(openingQuery, openingValues);
          openings.push(openingResult.rows[0]);
        }
      }

      // Получаем обновленное значение total_window_slopes после вставки проемов
      const updatedParam = await client.query(
        'SELECT * FROM object_parameters WHERE id = $1',
        [createdParam.id]
      );

      createdParameters.push({
        ...updatedParam.rows[0],
        openings
      });
    }

    await client.query('COMMIT');
    return createdParameters;

  } catch (error) {
    await client.query('ROLLBACK');
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
