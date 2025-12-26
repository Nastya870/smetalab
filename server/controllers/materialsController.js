import db from '../config/database.js';
import { 
  getCachedGlobalMaterials, 
  getCachedAllMaterials,
  invalidateMaterialsCache 
} from '../cache/referencesCache.js';

/**
 * Нормализует поисковый запрос для унифицированного поиска
 * - Приводит запятые к точкам (2,5 → 2.5)
 * - Нормализует x/х/×/* к латинской x (3х2,5 → 3x2.5)
 * - Сжимает пробелы
 * @param {string} query - исходный поисковый запрос
 * @returns {string} нормализованный запрос
 */
const normalizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') return '';
  return query
    .toLowerCase()
    .replace(/,/g, '.')           // запятые → точки
    .replace(/\s*[xх×\*]\s*/gi, 'x') // все варианты x → латинская x
    .replace(/\s+/g, ' ')         // сжимаем пробелы
    .trim();
};

/**
 * Контроллер для работы со справочником Материалов
 */

/**
 * @swagger
 * /materials:
 *   get:
 *     tags: [Materials]
 *     summary: Получить список материалов
 *     description: |
 *       Возвращает список материалов из справочника с поддержкой фильтрации и пагинации.
 *       
 *       **Типы материалов:**
 *       - **Глобальные** (is_global=true): Базовый справочник, доступен всем
 *       - **Тенантные** (is_global=false): Пользовательские материалы организации
 *       
 *       **Кэширование:**  
 *       При запросе глобальных материалов без фильтров используется кэш для ускорения.
 *       
 *       **Максимум записей:** 50000 на страницу (для полной выгрузки справочника)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Фильтр по категории
 *         example: "Отделочные материалы"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по SKU или названию (регистронезависимый)
 *         example: "штукатурка"
 *       - in: query
 *         name: supplier
 *         schema:
 *           type: string
 *         description: Фильтр по поставщику
 *         example: "ООО Стройматериалы"
 *       - in: query
 *         name: isGlobal
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: |
 *           Тип материалов:
 *           - true: только глобальные
 *           - false: только тенантные
 *           - не указано: глобальные + свои тенантные
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: sku
 *         description: Поле для сортировки
 *         example: "name"
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Порядок сортировки
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 50000
 *         description: Количество записей на страницу
 *     responses:
 *       200:
 *         description: Список материалов успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                   description: Количество материалов на текущей странице
 *                 total:
 *                   type: integer
 *                   description: Общее количество материалов (с учётом фильтров)
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Material'
 *                 cached:
 *                   type: boolean
 *                   description: Данные получены из кэша (только для глобальных без фильтров)
 *             example:
 *               success: true
 *               count: 50
 *               total: 1250
 *               page: 1
 *               pageSize: 50
 *               totalPages: 25
 *               cached: true
 *               data:
 *                 - id: "123e4567-e89b-12d3-a456-426614174001"
 *                   sku: "MAT-001"
 *                   name: "Штукатурка гипсовая"
 *                   category: "Отделочные материалы"
 *                   unit: "кг"
 *                   price: 15.50
 *                   supplier: "ООО Стройматериалы"
 *                   is_global: true
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const getAllMaterials = async (req, res) => {
  try {
    const { 
      category, 
      search, 
      supplier, 
      isGlobal, 
      sort = 'sku', 
      order = 'ASC',
      page = 1,
      pageSize = 50, // По умолчанию 50 записей на страницу
      skipCount = 'false' // Пропустить COUNT(*) для ускорения последующих запросов
    } = req.query;
    
    // Pagination parameters
    const pageNum = parseInt(page, 10);
    const pageSizeNum = Math.min(parseInt(pageSize, 10), 50000); // Максимум 50000 записей (для загрузки всех материалов в справочнике)
    const offset = (pageNum - 1) * pageSizeNum;
    
    // Если запрашиваются только глобальные материалы БЕЗ фильтров И без pagination - используем кеш
    const useCache = isGlobal === 'true' && !category && !search && !supplier && 
                     sort === 'sku' && order === 'ASC' && pageNum === 1 && pageSizeNum === 50;
    
    if (useCache) {
      const cachedData = await getCachedGlobalMaterials(async () => {
        const result = await db.query(
          'SELECT * FROM materials WHERE is_global = TRUE ORDER BY sku_number ASC LIMIT 50'
        );
        return result.rows;
      });
      
      // Получить total count для pagination
      const countResult = await db.query(
        'SELECT COUNT(*) as total FROM materials WHERE is_global = TRUE'
      );
      
      return res.status(200).json({
        success: true,
        count: cachedData.length,
        total: parseInt(countResult.rows[0].total, 10),
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(countResult.rows[0].total / pageSizeNum),
        data: cachedData,
        cached: true
      });
    }
    
    // ============================================
    // ОПТИМИЗИРОВАННЫЕ ЗАПРОСЫ с использованием partial covering indexes
    // Используем CTE (Common Table Expression) для подсчета и выборки в одном запросе
    // ============================================
    
    const params = [];
    let paramIndex = 1;
    
    // 🔍 DEBUG: Логирование для отладки
    console.log('[MATERIALS DEBUG]', {
      isGlobal,
      hasUser: !!req.user,
      tenantId: req.user?.tenantId,
      userId: req.user?.userId,
      search,
      category,
      supplier,
      pageSize: pageSizeNum
    });

    // Построение WHERE условий
    let whereConditions = [];
    
    // Фильтр по типу (оптимизированный для использования partial indexes)
    if (isGlobal === 'true') {
      // Использует idx_materials_global_only_covering
      whereConditions.push('is_global = TRUE');
    } else if (isGlobal === 'false') {
      // Использует idx_materials_tenant_only_covering
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
    
    // Фильтр по категории (использует idx_materials_category_btree)
    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    
    // Фильтр по поставщику (использует idx_materials_supplier_btree)
    if (supplier) {
      whereConditions.push(`supplier = $${paramIndex}`);
      params.push(supplier);
      paramIndex++;
    }
    
    // ✅ ОПТИМИЗИРОВАННЫЙ ПОИСК с pg_trgm индексами
    // Использует GIN индексы: idx_materials_name_trgm, idx_materials_sku_trgm
    // Производительность: ~10-50ms на 47k записей (было ~800-1200ms с ILIKE)
    if (search) {
      const searchLower = search.toLowerCase().trim();
      
      // Комбинированный подход для максимальной точности:
      // 1. LIKE для точных совпадений и префиксов (быстро через индекс)
      // 2. % (триграммы) для fuzzy search с пониженным порогом
      whereConditions.push(`(
        LOWER(name) LIKE $${paramIndex} OR 
        LOWER(name) LIKE $${paramIndex + 1} OR
        LOWER(sku) LIKE $${paramIndex} OR 
        LOWER(sku) LIKE $${paramIndex + 1} OR
        LOWER(supplier) LIKE $${paramIndex} OR
        similarity(LOWER(name), $${paramIndex + 2}) > 0.2 OR
        similarity(LOWER(sku), $${paramIndex + 2}) > 0.2
      )`);
      params.push(`%${searchLower}%`, `${searchLower}%`, searchLower);
      paramIndex += 3;
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';
    
    // Сортировка (глобальные сначала, затем по указанному полю)
    const allowedSortFields = ['sku', 'name', 'category', 'unit', 'price', 'supplier', 'weight', 'created_at', 'sku_number'];
    let sortField = allowedSortFields.includes(sort) ? sort : 'sku';
    // Если сортируем по sku, используем sku_number для правильной числовой сортировки
    if (sortField === 'sku') {
      sortField = 'sku_number';
    }
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    // ✅ СОРТИРОВКА ПО РЕЛЕВАНТНОСТИ при поиске
    // При активном поиске сортируем по similarity (триграммное сходство)
    let orderByClause;
    if (search && search.trim().length > 0) {
      const searchLower = search.toLowerCase().trim();
      // Добавляем параметры для сортировки
      params.push(searchLower); // Для CASE WHEN LOWER(sku) = $N
      const skuParamIndex = paramIndex;
      paramIndex++;
      
      params.push(`${searchLower}%`); // Для CASE WHEN LOWER(name) LIKE $N
      const nameParamIndex = paramIndex;
      paramIndex++;
      
      params.push(searchLower); // Для similarity(LOWER(name), $N)
      const simParamIndex = paramIndex;
      paramIndex++;
      
      // Сортируем по релевантности: сначала точные совпадения в SKU, затем в названии, затем по сходству
      orderByClause = `
        ORDER BY 
          CASE WHEN LOWER(sku) = $${skuParamIndex} THEN 1 ELSE 2 END,
          CASE WHEN LOWER(name) LIKE $${nameParamIndex} THEN 1 ELSE 2 END,
          similarity(LOWER(name), $${simParamIndex}) DESC,
          is_global DESC,
          ${sortField} ${sortOrder}
      `;
    } else {
      orderByClause = `ORDER BY is_global DESC, ${sortField} ${sortOrder}`;
    }
    
    // ============================================
    // ОПТИМИЗИРОВАННЫЙ ЗАПРОС - явное указание колонок для covering index
    // ============================================
    // Пропускаем COUNT(*) OVER() для последующих запросов (ускорение в 10x)
    const shouldSkipCount = skipCount === 'true' && pageNum > 1;
    
    const query = shouldSkipCount 
      ? `
        SELECT 
          id, sku, sku_number, name, unit, price, weight,
          supplier, category, image, product_url, 
          show_image, auto_calculate, is_global,
          tenant_id, created_at, updated_at
        FROM materials
        ${whereClause}
        ${orderByClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
      `
      : `
        SELECT 
          id, sku, sku_number, name, unit, price, weight,
          supplier, category, image, product_url, 
          show_image, auto_calculate, is_global,
          tenant_id, created_at, updated_at,
          COUNT(*) OVER() as total_count
        FROM materials
        ${whereClause}
        ${orderByClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
      `;
    
    params.push(pageSizeNum, offset);
    
    console.log('[MATERIALS QUERY]', { 
      isGlobal,
      category,
      supplier,
      search,
      pageSize: pageSizeNum,
      paramsCount: params.length
    });
    
    // ⏱️ Performance tracking
    const queryStartTime = Date.now();
    const result = await db.query(query, params);
    const queryDuration = Date.now() - queryStartTime;
    
    // Логируем EXPLAIN для первого запроса чтобы увидеть используется ли индекс
    if (queryDuration > 500) {
      console.warn(`[MATERIALS SLOW QUERY] ${queryDuration}ms - checking query plan...`);
      try {
        const explainResult = await db.query(`EXPLAIN (ANALYZE, BUFFERS) ${query}`, params);
        console.log('[MATERIALS QUERY PLAN]');
        explainResult.rows.forEach(row => console.log(row['QUERY PLAN']));
      } catch (err) {
        console.error('[MATERIALS EXPLAIN ERROR]', err.message);
      }
    }
    
    // Извлечь total из первой строки (если есть данные)
    // Для последующих запросов (skipCount=true) возвращаем null, фронтенд использует кэшированное значение
    const total = shouldSkipCount 
      ? null 
      : (result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0);
    
    // Удалить total_count из результатов (технический столбец)
    const transformStartTime = Date.now();
    const data = shouldSkipCount
      ? result.rows
      : result.rows.map(row => {
          const { total_count, ...rest } = row;
          return rest;
        });
    const transformDuration = Date.now() - transformStartTime;
    
    console.log(`[MATERIALS PERFORMANCE] Query: ${queryDuration}ms, Rows: ${data.length}, Total: ${total}`);
    console.log(`[MATERIALS PERFORMANCE] Transform: ${transformDuration}ms, Total: ${queryDuration + transformDuration}ms`);
    
    res.status(200).json({
      success: true,
      count: data.length,
      total: total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
      data: data,
      cached: false,
      performance: {
        queryTime: `${queryDuration}ms`,
        totalTime: `${queryDuration + transformDuration}ms`
      }
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка материалов',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /materials/{id}:
 *   get:
 *     tags: [Materials]
 *     summary: Получить материал по ID
 *     description: Возвращает подробную информацию о конкретном материале
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID материала
 *         example: "123e4567-e89b-12d3-a456-426614174001"
 *     responses:
 *       200:
 *         description: Материал найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Material'
 *             example:
 *               success: true
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174001"
 *                 sku: "MAT-001"
 *                 name: "Штукатурка гипсовая"
 *                 unit: "кг"
 *                 price: 15.50
 *                 category: "Отделочные материалы"
 *                 supplier: "ООО Стройматериалы"
 *                 is_global: true
 *       404:
 *         description: Материал не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Материал не найден"
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    
    // 🔒 Tenant Isolation: глобальные материалы доступны всем, тенантные - только своей компании
    let query, params;
    if (tenantId) {
      query = 'SELECT * FROM materials WHERE id = $1 AND (is_global = TRUE OR tenant_id = $2)';
      params = [id, tenantId];
    } else {
      // Неавторизованные видят только глобальные
      query = 'SELECT * FROM materials WHERE id = $1 AND is_global = TRUE';
      params = [id];
    }
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Материал не найден'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении материала',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /materials:
 *   post:
 *     tags: [Materials]
 *     summary: Создать новый материал
 *     description: |
 *       Создает новый материал в справочнике.
 *       
 *       **Типы материалов:**
 *       - **Глобальный** (isGlobal=true): Доступен всем, только для админа
 *       - **Тенантный** (isGlobal=false): Только для текущей организации
 *       
 *       **Автоматический расчёт:**  
 *       Если autoCalculate=true, указывается consumption (расход на ед. работы).
 *       Система автоматически рассчитает количество материала.
 *       
 *       **Уникальность:** SKU должен быть уникальным
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - name
 *               - unit
 *               - price
 *               - supplier
 *               - category
 *             properties:
 *               sku:
 *                 type: string
 *                 description: Артикул (должен быть уникальным)
 *                 example: "MAT-123"
 *               name:
 *                 type: string
 *                 description: Название материала
 *                 example: "Краска акриловая белая"
 *               unit:
 *                 type: string
 *                 description: Единица измерения
 *                 example: "л"
 *               price:
 *                 type: number
 *                 description: Цена за единицу
 *                 example: 450
 *               supplier:
 *                 type: string
 *                 description: Поставщик
 *                 example: "ООО Стройматериалы"
 *               category:
 *                 type: string
 *                 description: Категория материала
 *                 example: "Лакокрасочные материалы"
 *               image:
 *                 type: string
 *                 description: URL изображения
 *               weight:
 *                 type: number
 *                 description: Вес единицы (кг)
 *                 example: 5.2
 *               productUrl:
 *                 type: string
 *                 description: Ссылка на карточку товара у поставщика
 *               showImage:
 *                 type: boolean
 *                 default: true
 *                 description: Показывать изображение в интерфейсе
 *               isGlobal:
 *                 type: boolean
 *                 default: false
 *                 description: Глобальный материал (только для админа)
 *               autoCalculate:
 *                 type: boolean
 *                 default: false
 *                 description: Автоматический расчёт количества
 *               consumption:
 *                 type: number
 *                 description: Расход на единицу работы (обязателен если autoCalculate=true)
 *                 example: 0.15
 *           example:
 *             sku: "MAT-456"
 *             name: "Краска акриловая белая 10л"
 *             unit: "л"
 *             price: 450
 *             supplier: "ООО Краски и Эмали"
 *             category: "Лакокрасочные материалы"
 *             weight: 12.5
 *             autoCalculate: true
 *             consumption: 0.2
 *     responses:
 *       201:
 *         description: Материал успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Material'
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingFields:
 *                 value:
 *                   success: false
 *                   message: "Обязательные поля: SKU, название, единица измерения, цена, поставщик, категория"
 *               missingConsumption:
 *                 value:
 *                   success: false
 *                   message: "Для автоматического расчёта необходимо указать расход (consumption > 0)"
 *       401:
 *         description: Требуется аутентификация (для тенантных материалов)
 *       409:
 *         description: SKU уже существует
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Материал с таким SKU уже существует"
 *       500:
 *         description: Ошибка сервера
 */
export const createMaterial = async (req, res) => {
  try {
    const { 
      sku, 
      name, 
      image, 
      unit, 
      price, 
      supplier, 
      weight, 
      category, 
      productUrl, 
      showImage,
      isGlobal, // Новый параметр для создания глобальных материалов
      autoCalculate, // ✅ Флаг автоматического расчёта
      consumption // ✅ Расход материала на единицу работы
    } = req.body;
    
    // Валидация обязательных полей
    if (!sku || !name || !unit || price === undefined || !supplier || !category) {
      return res.status(400).json({
        success: false,
        message: 'Обязательные поля: SKU, название, единица измерения, цена, поставщик, категория'
      });
    }

    // ✅ Валидация: если autoCalculate = true, consumption обязателен
    if (autoCalculate === true && (!consumption || consumption <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Для автоматического расчёта необходимо указать расход (consumption > 0)'
      });
    }
    
    // Проверка уникальности SKU
    const existing = await db.query(
      'SELECT id FROM materials WHERE sku = $1',
      [sku]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Материал с таким SKU уже существует'
      });
    }
    
    // Проверка прав для создания глобальных материалов
    // TODO: В будущем проверять роль пользователя (только админ может создавать глобальные)
    if (isGlobal === true) {
      // Пока разрешаем всем создавать глобальные для тестирования
      // В production: if (!req.user || req.user.role !== 'admin') { return 403 }
      console.log('⚠️ Создание глобального материала (в production только для админа)');
    }
    
    let tenant_id = null;
    let created_by = null;
    
    // Для тенантных материалов получаем tenant_id из req.user (от auth middleware)
    if (isGlobal !== true) {
      if (!req.user || !req.user.userId || !req.user.tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Требуется аутентификация для создания тенантного материала'
        });
      }
      
      // Используем данные из JWT токена
      tenant_id = req.user.tenantId;
      created_by = req.user.userId;
      
      console.log('[CREATE MATERIAL]', { 
        tenant_id, 
        created_by, 
        sku,
        isGlobal: false 
      });
    }
    
    // Создание материала
    const result = await db.query(
      `INSERT INTO materials (
        sku, name, image, unit, price, supplier, weight, 
        category, product_url, show_image, is_global, tenant_id, created_by,
        auto_calculate, consumption
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        sku, 
        name, 
        image || '', 
        unit, 
        price, 
        supplier, 
        weight || 0, 
        category, 
        productUrl || '', 
        showImage !== false,
        isGlobal === true, // Флаг глобального материала
        tenant_id, // NULL для глобальных
        created_by, // NULL для глобальных
        autoCalculate !== false, // ✅ По умолчанию true
        consumption || 0 // ✅ Расход (0 для ручных материалов)
      ]
    );
    
    // Инвалидация кеша после создания
    invalidateMaterialsCache(tenant_id);
    
    res.status(201).json({
      success: true,
      message: `Материал успешно создан${isGlobal ? ' (глобальный)' : ''}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании материала',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /materials/{id}:
 *   put:
 *     tags: [Materials]
 *     summary: Обновить материал
 *     description: |
 *       Обновляет информацию о материале.
 *       
 *       **Ограничения:**
 *       - SKU должен оставаться уникальным
 *       - Глобальные материалы может редактировать только админ (в production)
 *       - Если autoCalculate=true, consumption обязателен
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID материала
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sku:
 *                 type: string
 *               name:
 *                 type: string
 *               unit:
 *                 type: string
 *               price:
 *                 type: number
 *               supplier:
 *                 type: string
 *               category:
 *                 type: string
 *               image:
 *                 type: string
 *               weight:
 *                 type: number
 *               productUrl:
 *                 type: string
 *               showImage:
 *                 type: boolean
 *               autoCalculate:
 *                 type: boolean
 *               consumption:
 *                 type: number
 *           example:
 *             price: 475
 *             supplier: "Новый поставщик"
 *             autoCalculate: true
 *             consumption: 0.18
 *     responses:
 *       200:
 *         description: Материал успешно обновлён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Material'
 *       404:
 *         description: Материал не найден
 *       409:
 *         description: SKU уже используется другим материалом
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const { 
      sku, 
      name, 
      image, 
      unit, 
      price, 
      supplier, 
      weight, 
      category, 
      productUrl, 
      showImage,
      autoCalculate, // ✅ Флаг автоматического расчёта
      consumption // ✅ Расход материала
    } = req.body;
    
    // 🔒 Tenant Isolation: проверка существования и прав доступа
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        message: 'Требуется аутентификация для обновления материала'
      });
    }
    
    const existing = await db.query(
      'SELECT id, is_global, tenant_id FROM materials WHERE id = $1 AND (is_global = TRUE OR tenant_id = $2)',
      [id, tenantId]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Материал не найден или у вас нет прав для его редактирования'
      });
    }
    
    // Запрет редактирования глобальных материалов обычными пользователями
    if (existing.rows[0].is_global && req.user?.isSuperAdmin !== true) {
      return res.status(403).json({
        success: false,
        message: 'Только суперадминистратор может редактировать глобальные материалы'
      });
    }
    
    // Проверка уникальности SKU (если SKU изменился)
    if (sku) {
      const skuCheck = await db.query(
        'SELECT id FROM materials WHERE sku = $1 AND id != $2',
        [sku, id]
      );
      
      if (skuCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Материал с таким SKU уже существует'
        });
      }
    }
    
    // ✅ Валидация: если autoCalculate = true, consumption обязателен
    if (autoCalculate === true && consumption !== undefined && consumption <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Для автоматического расчёта необходимо указать расход (consumption > 0)'
      });
    }

    // Обновление материала
    const result = await db.query(
      `UPDATE materials 
       SET sku = COALESCE($1, sku),
           name = COALESCE($2, name),
           image = COALESCE($3, image),
           unit = COALESCE($4, unit),
           price = COALESCE($5, price),
           supplier = COALESCE($6, supplier),
           weight = COALESCE($7, weight),
           category = COALESCE($8, category),
           product_url = COALESCE($9, product_url),
           show_image = COALESCE($10, show_image),
           auto_calculate = COALESCE($11, auto_calculate),
           consumption = COALESCE($12, consumption),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [sku, name, image, unit, price, supplier, weight, category, productUrl, showImage, 
       autoCalculate, consumption, id]
    );
    
    // Инвалидация кеша после обновления
    invalidateMaterialsCache(result.rows[0].tenant_id);
    
    res.status(200).json({
      success: true,
      message: 'Материал успешно обновлен',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении материала',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /materials/{id}:
 *   delete:
 *     tags: [Materials]
 *     summary: Удалить материал
 *     description: |
 *       Удаляет материал из справочника.
 *       
 *       **⚠️ Внимание:**
 *       - Операция необратима
 *       - Глобальные материалы может удалять только админ (в production)
 *       - Проверьте связанные работы перед удалением
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID материала
 *     responses:
 *       200:
 *         description: Материал успешно удалён
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
 *                   $ref: '#/components/schemas/Material'
 *       404:
 *         description: Материал не найден
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        message: 'Требуется аутентификация для удаления материала'
      });
    }
    
    // 🔒 Tenant Isolation: проверка существования материала и прав доступа
    const existing = await db.query(
      'SELECT id, sku, name, is_global, tenant_id FROM materials WHERE id = $1 AND (is_global = TRUE OR tenant_id = $2)',
      [id, tenantId]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Материал не найден или у вас нет прав для его удаления'
      });
    }
    
    // Запрет удаления глобальных материалов обычными пользователями
    if (existing.rows[0].is_global && req.user?.isSuperAdmin !== true) {
      return res.status(403).json({
        success: false,
        message: 'Только суперадминистратор может удалять глобальные материалы'
      });
    }
    
    // Удаление материала
    const deletedMaterial = existing.rows[0];
    await db.query('DELETE FROM materials WHERE id = $1', [id]);
    
    // Инвалидация кеша после удаления
    // Извлекаем tenant_id из удаленной записи (если была тенантная)
    const tenantCheck = await db.query(
      'SELECT tenant_id FROM materials WHERE id = $1',
      [id]
    );
    const tenant_id = tenantCheck.rows.length > 0 ? tenantCheck.rows[0].tenant_id : null;
    invalidateMaterialsCache(tenant_id);
    
    res.status(200).json({
      success: true,
      message: `Материал успешно удален${deletedMaterial.is_global ? ' (глобальный)' : ''}`,
      data: deletedMaterial
    });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении материала',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /materials/stats:
 *   get:
 *     tags: [Materials]
 *     summary: Получить статистику по материалам
 *     description: |
 *       Возвращает аналитические данные по материалам в справочнике.
 *       
 *       **Включает:**
 *       - Статистика по категориям (кол-во, цены, общая стоимость)
 *       - ТОП-10 поставщиков по количеству материалов
 *       - Общая статистика (всего материалов, категорий, поставщиков)
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
 *                           total_value:
 *                             type: number
 *                     bySupplier:
 *                       type: array
 *                       description: ТОП-10 поставщиков
 *                       items:
 *                         type: object
 *                         properties:
 *                           supplier:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           avg_price:
 *                             type: number
 *                     total:
 *                       type: object
 *                       properties:
 *                         total_materials:
 *                           type: integer
 *                         total_categories:
 *                           type: integer
 *                         total_suppliers:
 *                           type: integer
 *                         min_price:
 *                           type: number
 *                         max_price:
 *                           type: number
 *                         avg_price:
 *                           type: number
 *                         with_images:
 *                           type: integer
 *                           description: Количество материалов с изображениями
 *             example:
 *               success: true
 *               data:
 *                 byCategory:
 *                   - category: "Отделочные материалы"
 *                     count: 125
 *                     min_price: 5.50
 *                     max_price: 850.00
 *                     avg_price: 235.75
 *                     total_value: 29468.75
 *                 bySupplier:
 *                   - supplier: "ООО Стройматериалы"
 *                     count: 87
 *                     avg_price: 198.50
 *                 total:
 *                   total_materials: 1250
 *                   total_categories: 15
 *                   total_suppliers: 42
 *                   min_price: 1.50
 *                   max_price: 15000.00
 *                   avg_price: 325.80
 *                   with_images: 945
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const getMaterialsStats = async (req, res) => {
  try {
    const categoryStats = await db.query(`
      SELECT 
        category,
        COUNT(*) as count,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price)::numeric(10,2) as avg_price,
        SUM(weight * price)::numeric(10,2) as total_value
      FROM materials
      GROUP BY category
      ORDER BY category
    `);
    
    const supplierStats = await db.query(`
      SELECT 
        supplier,
        COUNT(*) as count,
        AVG(price)::numeric(10,2) as avg_price
      FROM materials
      GROUP BY supplier
      ORDER BY count DESC
      LIMIT 10
    `);
    
    const totalStats = await db.query(`
      SELECT 
        COUNT(*) as total_materials,
        COUNT(DISTINCT category) as total_categories,
        COUNT(DISTINCT supplier) as total_suppliers,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price)::numeric(10,2) as avg_price,
        SUM(CASE WHEN show_image AND image != '' THEN 1 ELSE 0 END) as with_images
      FROM materials
    `);
    
    res.status(200).json({
      success: true,
      data: {
        byCategory: categoryStats.rows,
        bySupplier: supplierStats.rows,
        total: totalStats.rows[0]
      }
    });
  } catch (error) {
    console.error('Error fetching materials stats:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /materials/categories:
 *   get:
 *     tags: [Materials]
 *     summary: Получить список категорий
 *     description: Возвращает все уникальные категории материалов с количеством в каждой
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
 *                 - category: "Лакокрасочные материалы"
 *                   count: 85
 *                 - category: "Отделочные материалы"
 *                   count: 125
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const getMaterialCategories = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM materials
      GROUP BY category
      ORDER BY category
    `);
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка категорий',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /materials/suppliers:
 *   get:
 *     tags: [Materials]
 *     summary: Получить список поставщиков
 *     description: Возвращает всех уникальных поставщиков с количеством материалов от каждого
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список поставщиков успешно получен
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
 *                       supplier:
 *                         type: string
 *                       count:
 *                         type: integer
 *             example:
 *               success: true
 *               data:
 *                 - supplier: "ООО Краски и Эмали"
 *                   count: 62
 *                 - supplier: "ООО Стройматериалы"
 *                   count: 145
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
export const getMaterialSuppliers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT supplier, COUNT(*) as count
      FROM materials
      GROUP BY supplier
      ORDER BY supplier
    `);
    
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка поставщиков',
      error: error.message
    });
  }
};

/**
 * @swagger
 * /materials/bulk:
 *   post:
 *     tags: [Materials]
 *     summary: Массовый импорт материалов
 *     description: |
 *       Импортирует множество материалов за один запрос (например, из CSV).
 *       
 *       **Режимы импорта:**
 *       - **add** (по умолчанию): Добавить к существующим материалам
 *       - **replace**: Удалить все существующие и загрузить новые
 *       
 *       **Ограничения:**
 *       - Каждый материал должен иметь: sku, name, category, unit, price
 *       - Для тенантных материалов требуется аутентификация
 *       - Глобальный импорт доступен только админу
 *       
 *       **Отчёт:**  
 *       Возвращает статистику импорта: успешно, с ошибками, пропущено
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - materials
 *             properties:
 *               materials:
 *                 type: array
 *                 description: Массив материалов для импорта
 *                 items:
 *                   type: object
 *                   required:
 *                     - sku
 *                     - name
 *                     - category
 *                     - unit
 *                     - price
 *                   properties:
 *                     sku:
 *                       type: string
 *                     name:
 *                       type: string
 *                     category:
 *                       type: string
 *                     unit:
 *                       type: string
 *                     price:
 *                       type: number
 *                     supplier:
 *                       type: string
 *                     image:
 *                       type: string
 *                     weight:
 *                       type: number
 *                     productUrl:
 *                       type: string
 *                     autoCalculate:
 *                       type: boolean
 *                     consumption:
 *                       type: number
 *               mode:
 *                 type: string
 *                 enum: [add, replace]
 *                 default: add
 *                 description: Режим импорта
 *               isGlobal:
 *                 type: boolean
 *                 default: false
 *                 description: Импорт глобальных материалов (только админ)
 *           example:
 *             mode: "add"
 *             isGlobal: false
 *             materials:
 *               - sku: "MAT-001"
 *                 name: "Штукатурка гипсовая"
 *                 category: "Отделочные материалы"
 *                 unit: "кг"
 *                 price: 15.50
 *                 supplier: "ООО Стройматериалы"
 *               - sku: "MAT-002"
 *                 name: "Краска акриловая"
 *                 category: "Лакокрасочные материалы"
 *                 unit: "л"
 *                 price: 450
 *                 supplier: "ООО Краски и Эмали"
 *     responses:
 *       200:
 *         description: Импорт завершён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     skipped:
 *                       type: integer
 *                 failedItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       index:
 *                         type: integer
 *                       sku:
 *                         type: string
 *                       error:
 *                         type: string
 *             example:
 *               success: true
 *               message: "Импорт завершён"
 *               summary:
 *                 total: 100
 *                 successful: 95
 *                 failed: 3
 *                 skipped: 2
 *               failedItems:
 *                 - index: 15
 *                   sku: "MAT-015"
 *                   error: "Дубликат SKU"
 *       400:
 *         description: Некорректные данные
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Необходимо передать массив материалов"
 *       401:
 *         description: Требуется аутентификация (для тенантных материалов)
 *       500:
 *         description: Ошибка сервера
 */
// Максимальное количество элементов в одном bulk import запросе
const BULK_IMPORT_LIMIT = 500;

export const bulkImportMaterials = async (req, res) => {
  try {
    const { materials, mode = 'add', isGlobal = false } = req.body;

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо передать массив материалов'
      });
    }

    // 🛡️ Защита от DoS: лимит на количество элементов
    if (materials.length > BULK_IMPORT_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Превышен лимит импорта: максимум ${BULK_IMPORT_LIMIT} материалов за раз. Получено: ${materials.length}`
      });
    }

    console.log(`[BULK IMPORT] Начало импорта ${materials.length} материалов, mode: ${mode}, isGlobal: ${isGlobal}`);

    let tenant_id = null;
    let created_by = null;

    // Для тенантных материалов получаем tenant_id из req.user
    if (isGlobal !== true) {
      if (!req.user || !req.user.userId || !req.user.tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Требуется аутентификация для импорта тенантных материалов'
        });
      }
      tenant_id = req.user.tenantId;
      created_by = req.user.userId;
    }

    // Если режим replace - удаляем существующие материалы
    if (mode === 'replace') {
      if (isGlobal) {
        await db.query('DELETE FROM materials WHERE is_global = TRUE');
        console.log('[BULK IMPORT] Удалены все глобальные материалы');
      } else {
        await db.query('DELETE FROM materials WHERE tenant_id = $1', [tenant_id]);
        console.log(`[BULK IMPORT] Удалены все материалы tenant_id: ${tenant_id}`);
      }
    }

    const successfulImports = [];
    const failedImports = [];

    // Импортируем каждый материал
    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      
      try {
        // Валидация
        if (!material.sku || !material.name || !material.category || !material.unit || material.price === undefined) {
          throw new Error('Отсутствуют обязательные поля');
        }

        // ✅ Валидация autoCalculate + consumption
        if (material.autoCalculate === true && (!material.consumption || material.consumption <= 0)) {
          throw new Error('Для автоматического расчёта необходимо указать расход (consumption > 0)');
        }

        // Проверка существования SKU
        const existing = await db.query(
          'SELECT id FROM materials WHERE sku = $1',
          [material.sku]
        );

        if (existing.rows.length > 0 && mode === 'add') {
          throw new Error(`Материал с SKU ${material.sku} уже существует`);
        }

        // Вставка материала
        const result = await db.query(
          `INSERT INTO materials (
            sku, name, image, unit, price, supplier, weight, 
            category, product_url, show_image, is_global, tenant_id, created_by,
            auto_calculate, consumption
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           RETURNING *`,
          [
            material.sku,
            material.name,
            material.image || '',
            material.unit,
            material.price,
            material.supplier || '',
            material.weight || 0,
            material.category,
            material.productUrl || '',
            material.showImage !== false,
            isGlobal === true,
            tenant_id,
            created_by,
            material.autoCalculate !== false, // ✅ По умолчанию true
            material.consumption || 0 // ✅ Расход
          ]
        );

        successfulImports.push({
          sku: material.sku,
          name: material.name,
          id: result.rows[0].id
        });

      } catch (error) {
        failedImports.push({
          sku: material.sku,
          name: material.name,
          error: error.message
        });
      }
    }

    // Инвалидация кеша
    invalidateMaterialsCache(tenant_id);

    console.log(`[BULK IMPORT] Успешно: ${successfulImports.length}, Ошибок: ${failedImports.length}`);

    res.status(201).json({
      success: true,
      message: `Импорт завершён: ${successfulImports.length} материалов добавлено, ${failedImports.length} ошибок`,
      successCount: successfulImports.length,
      errorCount: failedImports.length,
      successfulImports,
      failedImports
    });

  } catch (error) {
    console.error('[BULK IMPORT] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при импорте материалов',
      error: error.message
    });
  }
};

export default {
  getAllMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialsStats,
  getMaterialCategories,
  getMaterialSuppliers,
  bulkImportMaterials // ✅ Добавили
};
