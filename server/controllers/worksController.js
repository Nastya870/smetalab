import db from '../config/database.js';
import { 
  getCachedGlobalWorks, 
  getCachedAllWorks,
  invalidateWorksCache 
} from '../cache/referencesCache.js';
import { catchAsync, BadRequestError, NotFoundError, ConflictError } from '../utils/errors.js';

/**
 * Контроллер для работы со справочником Работ
 */

/**
 * @swagger
 * /works:
 *   get:
 *     tags: [Works]
 *     summary: Получить список работ
 *     description: |
 *       Возвращает список работ из справочника с поддержкой фильтрации и пагинации.
 *       
 *       **Типы работ:**
 *       - **Глобальные** (is_global=true): Базовый справочник, доступен всем
 *       - **Тенантные** (is_global=false): Пользовательские работы организации
 *       
 *       **Максимум записей:** 25000 на страницу для полной выгрузки
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Фильтр по категории
 *         example: "Отделочные работы"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по коду или названию (регистронезависимый)
 *         example: "штукатурка"
 *       - in: query
 *         name: isGlobal
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: |
 *           Тип работ:
 *           - true: только глобальные
 *           - false: только тенантные
 *           - не указано: глобальные + свои тенантные
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: code
 *         description: Поле для сортировки
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 25000
 *     responses:
 *       200:
 *         description: Список работ успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Work'
 *             example:
 *               success: true
 *               count: 50
 *               total: 850
 *               page: 1
 *               pageSize: 50
 *               totalPages: 17
 *               data:
 *                 - id: "123e4567-e89b-12d3-a456-426614174002"
 *                   code: "WRK-001"
 *                   name: "Штукатурка стен"
 *                   category: "Отделочные работы"
 *                   unit: "м²"
 *                   price: 500
 *                   is_global: true
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const getAllWorks = catchAsync(async (req, res) => {
  const { 
    category, 
    search, 
    isGlobal, 
    sort = 'code', 
    order = 'ASC',
    page = 1,
    pageSize = 50 // По умолчанию 50 записей на страницу
  } = req.query;
    
    // Pagination parameters
    const pageNum = parseInt(page, 10);
    const pageSizeNum = Math.min(parseInt(pageSize, 10), 25000); // Максимум 25000 записей (для больших справочников)
    const offset = (pageNum - 1) * pageSizeNum;
    
    // ОТКЛЮЧЕН КЕШ для корректной pagination
    // Кеш работал только для первых 50 записей, игнорируя параметры page/pageSize
    // Теперь все запросы используют стандартную логику с поддержкой pagination
    
    // ============================================
    // ОПТИМИЗИРОВАННЫЕ ЗАПРОСЫ с использованием partial indexes
    // Используем CTE (Common Table Expression) для подсчета и выборки в одном запросе
    // ============================================
    
    const params = [];
    let paramIndex = 1;
    
    // 🔍 DEBUG: Логирование для отладки
    console.log('[WORKS DEBUG]', {
      isGlobal,
      hasUser: !!req.user,
      tenantId: req.user?.tenantId,
      userId: req.user?.userId,
      search,
      category,
      pageSize: pageSizeNum
    });

    // Построение WHERE условий
    let whereConditions = [];
    
    // Фильтр по типу (оптимизированный для использования partial indexes)
    if (isGlobal === 'true') {
      // Использует idx_works_global_only_covering
      whereConditions.push('is_global = TRUE');
    } else if (isGlobal === 'false') {
      // Использует idx_works_tenant_only_covering
      whereConditions.push('is_global = FALSE');
      if (req.user && req.user.tenantId) {
        whereConditions.push(`tenant_id = $${paramIndex}`);
        params.push(req.user.tenantId);
        paramIndex++;
      } else {
        whereConditions.push('tenant_id IS NULL');
      }
    } else {
      // Смешанный режим: глобальные + тенантные
      if (req.user && req.user.tenantId) {
        whereConditions.push(`(is_global = TRUE OR tenant_id = $${paramIndex})`);
        params.push(req.user.tenantId);
        paramIndex++;
      } else {
        whereConditions.push('is_global = TRUE');
      }
    }
    
    // Фильтр по категории
    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    
    // Поиск по коду или названию (использует idx_works_code_trgm и idx_works_name_trgm)
    if (search) {
      whereConditions.push(`(code ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';
    
    // Сортировка
    const allowedSortFields = ['code', 'name', 'category', 'unit', 'base_price', 'created_at'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'code';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    // ============================================
    // ОПТИМИЗИРОВАННЫЙ ЗАПРОС с CTE (COUNT + SELECT в одном запросе)
    // ============================================
    const query = `
      WITH data_cte AS (
        SELECT 
          id, code, name, unit, base_price, 
          phase, section, subsection, is_global,
          created_at, updated_at,
          COUNT(*) OVER() as total_count
        FROM works
        ${whereClause}
        ORDER BY is_global DESC, ${sortField} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      )
      SELECT * FROM data_cte;
    `;
    
    params.push(pageSizeNum, offset);
    
    console.log('[WORKS QUERY]', { query: query.trim(), params });
    
    // Выполнить оптимизированный запрос с CTE
    const queryStart = Date.now();
    const result = await db.query(query, params);
    const queryTime = Date.now() - queryStart;
    
    // Извлечь total из первой строки (если есть данные)
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
    
    console.log(`[WORKS PERFORMANCE] Query: ${queryTime}ms, Rows: ${result.rows.length}, Total: ${total}`);
    
    // Преобразуем snake_case в camelCase для совместимости с фронтендом
    const transformStart = Date.now();
    const transformedData = result.rows.map(row => {
      const { total_count, ...rest } = row; // Удаляем технический столбец
      return {
        ...rest,
        basePrice: parseFloat(rest.base_price) || 0,
        isGlobal: rest.is_global !== undefined ? rest.is_global : false,
        tenantId: rest.tenant_id,
        createdBy: rest.created_by,
        createdAt: rest.created_at,
        updatedAt: rest.updated_at
      };
    });
    const transformTime = Date.now() - transformStart;
    
    console.log(`[WORKS PERFORMANCE] Transform: ${transformTime}ms, Total: ${queryTime + transformTime}ms`);
    
  res.status(200).json({
    success: true,
    count: transformedData.length,
    total: total,
    page: pageNum,
    pageSize: pageSizeNum,
    totalPages: Math.ceil(total / pageSizeNum),
    data: transformedData,
    cached: false
  });
});

/**
 * @swagger
 * /works/{id}:
 *   get:
 *     tags: [Works]
 *     summary: Получить работу по ID
 *     description: Возвращает подробную информацию о конкретной работе
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID работы
 *     responses:
 *       200:
 *         description: Работа найдена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Work'
 *       404:
 *         description: Работа не найдена
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const getWorkById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;
  
  // 🔒 Tenant Isolation: глобальные работы доступны всем, тенантные - только своей компании
  let query, params;
  if (tenantId) {
    query = 'SELECT * FROM works WHERE id = $1 AND (is_global = TRUE OR tenant_id = $2)';
    params = [id, tenantId];
  } else {
    // Неавторизованные видят только глобальные
    query = 'SELECT * FROM works WHERE id = $1 AND is_global = TRUE';
    params = [id];
  }
  
  const result = await db.query(query, params);
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Работа не найдена');
  }
  
  res.status(200).json({
    success: true,
    data: result.rows[0]
  });
});

/**
 * @swagger
 * /works:
 *   post:
 *     tags: [Works]
 *     summary: Создать новую работу
 *     description: |
 *       Создает новую работу в справочнике.
 *       
 *       **Типы работ:**
 *       - **Глобальная** (isGlobal=true): Доступна всем, только для админа
 *       - **Тенантная** (isGlobal=false): Только для текущей организации
 *       
 *       **Уникальность:** Код работы должен быть уникальным
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - category
 *               - unit
 *               - basePrice
 *             properties:
 *               code:
 *                 type: string
 *                 description: Уникальный код работы
 *                 example: "WRK-001"
 *               name:
 *                 type: string
 *                 description: Название работы
 *                 example: "Штукатурка стен по маякам"
 *               category:
 *                 type: string
 *                 description: Категория работы
 *                 example: "Отделочные работы"
 *               unit:
 *                 type: string
 *                 description: Единица измерения
 *                 example: "м²"
 *               basePrice:
 *                 type: number
 *                 description: Базовая цена за единицу
 *                 example: 500
 *               isGlobal:
 *                 type: boolean
 *                 default: false
 *                 description: Глобальная работа (только для админа)
 *           example:
 *             code: "WRK-125"
 *             name: "Покраска потолка в 2 слоя"
 *             category: "Малярные работы"
 *             unit: "м²"
 *             basePrice: 350
 *             isGlobal: false
 *     responses:
 *       201:
 *         description: Работа успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Work'
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Все поля обязательны для заполнения"
 *       401:
 *         description: Требуется аутентификация (для тенантных работ)
 *       409:
 *         description: Код уже существует
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Работа с таким кодом уже существует"
 *       500:
 *         description: Ошибка сервера
 */
export const createWork = catchAsync(async (req, res) => {
  const { code, name, category, phase, section, subsection, unit, basePrice, isGlobal } = req.body;
  
  // Поддержка обратной совместимости: category -> phase
  const workPhase = phase || category || null;
  
  // Валидация
  if (!code || !name || !unit || basePrice === undefined) {
    throw new BadRequestError('Обязательные поля: code, name, unit, basePrice');
  }
  
  // Проверка уникальности кода
  const existing = await db.query(
    'SELECT id FROM works WHERE code = $1',
    [code]
  );
  
  if (existing.rows.length > 0) {
    throw new ConflictError('Работа с таким кодом уже существует');
  }
  
  // Проверка прав для создания глобальных работ
  // TODO: В будущем проверять роль пользователя (только админ может создавать глобальные)
  if (isGlobal === true) {
    console.log('⚠️ Создание глобальной работы (в production только для админа)');
  }
  
  let tenant_id = null;
  let created_by = null;
  
  // Для тенантных работ получаем tenant_id из req.user (от auth middleware)
  if (isGlobal !== true) {
    if (!req.user || !req.user.userId || !req.user.tenantId) {
      throw new BadRequestError('Требуется аутентификация для создания тенантной работы');
    }
    
    // Используем данные из JWT токена
    tenant_id = req.user.tenantId;
    created_by = req.user.userId;
    
    console.log('[CREATE WORK]', { 
      tenant_id, 
      created_by, 
      code,
      isGlobal: false 
    });
  }
  
  // Создание работы
  const result = await db.query(
    `INSERT INTO works (code, name, phase, section, subsection, unit, base_price, is_global, tenant_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [code, name, workPhase, section || null, subsection || null, unit, basePrice, isGlobal === true, tenant_id, created_by]
  );
  
  // Инвалидация кеша после создания
  invalidateWorksCache(tenant_id);
  
  res.status(201).json({
    success: true,
    message: `Работа успешно создана${isGlobal ? ' (глобальная)' : ''}`,
    data: result.rows[0]
  });
});

/**
 * @swagger
 * /works/{id}:
 *   put:
 *     tags: [Works]
 *     summary: Обновить работу
 *     description: |
 *       Обновляет информацию о работе.
 *       
 *       **Ограничения:**
 *       - Код должен оставаться уникальным
 *       - Глобальные работы может редактировать только админ (в production)
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               unit:
 *                 type: string
 *               basePrice:
 *                 type: number
 *           example:
 *             basePrice: 550
 *             category: "Отделочные работы (премиум)"
 *     responses:
 *       200:
 *         description: Работа успешно обновлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Work'
 *       404:
 *         description: Работа не найдена
 *       409:
 *         description: Код уже используется другой работой
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const updateWork = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;
  // Поддержка обратной совместимости: category -> phase
  const { code, name, category, phase, section, subsection, unit, basePrice } = req.body;
  const workPhase = phase || category;
  
  if (!tenantId) {
    throw new BadRequestError('Требуется аутентификация для обновления работы');
  }
  
  // 🔒 Tenant Isolation: проверка существования и прав доступа
  const existing = await db.query(
    'SELECT id, is_global, tenant_id FROM works WHERE id = $1 AND (is_global = TRUE OR tenant_id = $2)',
    [id, tenantId]
  );
  
  if (existing.rows.length === 0) {
    throw new NotFoundError('Работа не найдена или у вас нет прав для её редактирования');
  }
  
  // Запрет редактирования глобальных работ обычными пользователями
  if (existing.rows[0].is_global && req.user?.isSuperAdmin !== true) {
    return res.status(403).json({
      success: false,
      message: 'Только суперадминистратор может редактировать глобальные работы'
    });
  }
  
  // Проверка уникальности кода (если код изменился)
  if (code) {
    const codeCheck = await db.query(
      'SELECT id FROM works WHERE code = $1 AND id != $2',
      [code, id]
    );
    
    if (codeCheck.rows.length > 0) {
      throw new ConflictError('Работа с таким кодом уже существует');
    }
  }
  
  // Обновление работы (используем phase/section/subsection вместо category)
  const result = await db.query(
    `UPDATE works 
     SET code = COALESCE($1, code),
         name = COALESCE($2, name),
         phase = COALESCE($3, phase),
         section = COALESCE($4, section),
         subsection = COALESCE($5, subsection),
         unit = COALESCE($6, unit),
         base_price = COALESCE($7, base_price),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8
     RETURNING *`,
    [code, name, workPhase, section, subsection, unit, basePrice, id]
  );
  
  // Инвалидация кеша после обновления
  invalidateWorksCache(result.rows[0].tenant_id);
  
  res.status(200).json({
    success: true,
    message: 'Работа успешно обновлена',
    data: result.rows[0]
  });
});

/**
 * @swagger
 * /works/{id}/price:
 *   patch:
 *     tags: [Works]
 *     summary: Обновить базовую цену работы
 *     description: |
 *       Обновляет только базовую цену (base_price) работы в справочнике.
 *       
 *       **⚠️ Важно:**
 *       - Изменение влияет только на справочник работ
 *       - Существующие сметы НЕ обновляются автоматически
 *       - Новые сметы будут использовать обновлённую цену
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID работы
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - basePrice
 *             properties:
 *               basePrice:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 150.00
 *     responses:
 *       200:
 *         description: Цена успешно обновлена
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Работа не найдена
 *       401:
 *         description: Не авторизован
 */
export const updateWorkPrice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { basePrice } = req.body;
  const tenantId = req.user?.tenantId;
  
  // Валидация
  if (!tenantId) {
    throw new BadRequestError('Требуется аутентификация для обновления цены');
  }
  
  if (basePrice === undefined || basePrice === null) {
    throw new BadRequestError('Поле basePrice обязательно');
  }
  
  const price = parseFloat(basePrice);
  if (isNaN(price) || price < 0) {
    throw new BadRequestError('Некорректное значение цены');
  }
  
  // 🔒 Tenant Isolation: проверка существования и прав доступа
  const existing = await db.query(
    'SELECT id, is_global, tenant_id, name, code FROM works WHERE id = $1 AND (is_global = TRUE OR tenant_id = $2)',
    [id, tenantId]
  );
  
  if (existing.rows.length === 0) {
    throw new NotFoundError('Работа не найдена или у вас нет прав для её редактирования');
  }
  
  // Запрет редактирования глобальных работ обычными пользователями
  if (existing.rows[0].is_global && req.user?.isSuperAdmin !== true) {
    return res.status(403).json({
      success: false,
      message: 'Только суперадминистратор может редактировать глобальные работы'
    });
  }
  
  // Обновление только цены
  const result = await db.query(
    `UPDATE works 
     SET base_price = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [price, id]
  );
  
  // Инвалидация кеша после обновления
  invalidateWorksCache(result.rows[0].tenant_id);
  
  res.status(200).json({
    success: true,
    message: `Базовая цена работы "${existing.rows[0].name}" обновлена на ${price} ₽`,
    data: result.rows[0]
  });
});

/**
 * @swagger
 * /works/{id}:
 *   delete:
 *     tags: [Works]
 *     summary: Удалить работу
 *     description: |
 *       Удаляет работу из справочника.
 *       
 *       **⚠️ Внимание:**
 *       - Операция необратима
 *       - Глобальные работы может удалять только админ (в production)
 *       - Проверьте связанные сметы перед удалением
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
 *         description: Работа успешно удалена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Work'
 *       404:
 *         description: Работа не найдена
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const deleteWork = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;
  
  if (!tenantId) {
    throw new BadRequestError('Требуется аутентификация для удаления работы');
  }
  
  // 🔒 Tenant Isolation: проверка существования работы и прав доступа
  const existing = await db.query(
    'SELECT id, code, name, is_global, tenant_id FROM works WHERE id = $1 AND (is_global = TRUE OR tenant_id = $2)',
    [id, tenantId]
  );
  
  if (existing.rows.length === 0) {
    throw new NotFoundError('Работа не найдена или у вас нет прав для её удаления');
  }
  
  // Запрет удаления глобальных работ обычными пользователями
  if (existing.rows[0].is_global && req.user?.isSuperAdmin !== true) {
    return res.status(403).json({
      success: false,
      message: 'Только суперадминистратор может удалять глобальные работы'
    });
  }
  
  // Удаление работы
  const deletedWork = existing.rows[0];
  await db.query('DELETE FROM works WHERE id = $1', [id]);
  
  // Инвалидация кеша после удаления
  const tenantCheck = await db.query(
    'SELECT tenant_id FROM works WHERE id = $1',
    [id]
  );
  const tenant_id = tenantCheck.rows.length > 0 ? tenantCheck.rows[0].tenant_id : null;
  invalidateWorksCache(tenant_id);
  
  res.status(200).json({
    success: true,
    message: `Работа успешно удалена${deletedWork.is_global ? ' (глобальная)' : ''}`,
    data: deletedWork
  });
});

/**
 * @swagger
 * /works/stats:
 *   get:
 *     tags: [Works]
 *     summary: Получить статистику по работам
 *     description: |
 *       Возвращает аналитические данные по работам в справочнике.
 *       
 *       **Включает:**
 *       - Статистика по категориям (кол-во, цены)
 *       - Общая статистика (всего работ, мин/макс/средняя цена)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     byCategory:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           min_price:
 *                             type: number
 *                           max_price:
 *                             type: number
 *                           avg_price:
 *                             type: number
 *                     total:
 *                       type: object
 *                       properties:
 *                         total_works:
 *                           type: integer
 *                         min_price:
 *                           type: number
 *                         max_price:
 *                           type: number
 *                         avg_price:
 *                           type: number
 *             example:
 *               success: true
 *               data:
 *                 byCategory:
 *                   - category: "Отделочные работы"
 *                     count: 85
 *                     min_price: 150.00
 *                     max_price: 1200.00
 *                     avg_price: 485.50
 *                 total:
 *                   total_works: 850
 *                   min_price: 50.00
 *                   max_price: 5000.00
 *                   avg_price: 625.75
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const getWorksStats = catchAsync(async (req, res) => {
  const categoryStats = await db.query(`
    SELECT 
      category,
      COUNT(*) as count,
      MIN(base_price) as min_price,
      MAX(base_price) as max_price,
      AVG(base_price)::numeric(10,2) as avg_price
    FROM works
    GROUP BY category
    ORDER BY category
  `);
  
  const totalStats = await db.query(`
    SELECT 
      COUNT(*) as total_works,
      MIN(base_price) as min_price,
      MAX(base_price) as max_price,
      AVG(base_price)::numeric(10,2) as avg_price
    FROM works
  `);
  
  res.status(200).json({
    success: true,
    data: {
      byCategory: categoryStats.rows,
      total: totalStats.rows[0]
    }
  });
});

/**
 * @swagger
 * /works/categories:
 *   get:
 *     tags: [Works]
 *     summary: Получить список категорий работ
 *     description: Возвращает все уникальные категории работ с количеством в каждой
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список категорий успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                       count:
 *                         type: integer
 *             example:
 *               success: true
 *               data:
 *                 - category: "Малярные работы"
 *                   count: 42
 *                 - category: "Отделочные работы"
 *                   count: 85
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const getWorkCategories = catchAsync(async (req, res) => {
  const result = await db.query(`
    SELECT DISTINCT category, COUNT(*) as count
    FROM works
    GROUP BY category
    ORDER BY category
  `);
  
  res.status(200).json({
    success: true,
    data: result.rows
  });
});

export default {
  getAllWorks,
  getWorkById,
  createWork,
  updateWork,
  updateWorkPrice,
  deleteWork,
  getWorksStats,
  getWorkCategories
};
