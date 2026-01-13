/**
 * Additional Swagger Documentation
 * Документация для недостающих эндпоинтов
 * 
 * Покрывает: Estimate Templates, Permissions, Roles, Tenants, Work Completions, Search
 */

/**
 * @swagger
 * tags:
 *   - name: Estimate Templates
 *     description: Шаблоны смет для быстрого создания типовых работ
 *   - name: Permissions
 *     description: Управление разрешениями и правами доступа
 *   - name: Roles
 *     description: Управление ролями пользователей
 *   - name: Tenants
 *     description: Управление компаниями (тенантами)
 *   - name: Work Completions
 *     description: Отслеживание выполнения работ по сметам
 *   - name: Search
 *     description: Семантический и умный поиск по справочникам (AI-powered)
 *   - name: Contracts
 *     description: Управление договорами подряда
 *   - name: Admin
 *     description: Административные функции (super_admin only)
 */

// ==================== ESTIMATE TEMPLATES ====================

/**
 * @swagger
 * /api/estimate-templates:
 *   get:
 *     summary: Получить все шаблоны смет
 *     description: Возвращает список шаблонов текущего пользователя
 *     tags: [Estimate Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список шаблонов
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
 *                     $ref: '#/components/schemas/EstimateTemplate'
 *       401:
 *         description: Не авторизован
 *   post:
 *     summary: Создать шаблон из сметы
 *     description: Создаёт новый шаблон на основе существующей сметы
 *     tags: [Estimate Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estimateId
 *               - name
 *             properties:
 *               estimateId:
 *                 type: string
 *                 format: uuid
 *                 description: ID сметы для создания шаблона
 *               name:
 *                 type: string
 *                 description: Название шаблона
 *               description:
 *                 type: string
 *                 description: Описание шаблона
 *               category:
 *                 type: string
 *                 description: Категория (Ванная, Кухня, и т.д.)
 *     responses:
 *       201:
 *         description: Шаблон создан
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Смета не найдена
 */

/**
 * @swagger
 * /api/estimate-templates/{id}:
 *   get:
 *     summary: Получить шаблон по ID
 *     description: Возвращает полную информацию о шаблоне включая позиции
 *     tags: [Estimate Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID шаблона
 *     responses:
 *       200:
 *         description: Шаблон найден
 *       404:
 *         description: Шаблон не найден
 *   put:
 *     summary: Обновить шаблон
 *     description: Обновляет название, описание или категорию шаблона
 *     tags: [Estimate Templates]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Шаблон обновлён
 *       404:
 *         description: Шаблон не найден
 *   delete:
 *     summary: Удалить шаблон
 *     tags: [Estimate Templates]
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
 *         description: Шаблон удалён
 *       404:
 *         description: Шаблон не найден
 */

/**
 * @swagger
 * /api/estimate-templates/{id}/apply:
 *   post:
 *     summary: Применить шаблон к смете
 *     description: Создаёт работы и материалы из шаблона с актуальными ценами
 *     tags: [Estimate Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID шаблона
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estimateId
 *             properties:
 *               estimateId:
 *                 type: string
 *                 format: uuid
 *                 description: ID сметы для применения шаблона
 *     responses:
 *       200:
 *         description: Шаблон применён
 *       404:
 *         description: Шаблон или смета не найдены
 */

// ==================== PERMISSIONS ====================

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Получить все разрешения
 *     description: Возвращает список всех разрешений, группированных по ресурсам
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список разрешений
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
 *                       resource:
 *                         type: string
 *                         description: Название ресурса
 *                       permissions:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/Permission'
 *       403:
 *         description: Требуется роль admin
 */

/**
 * @swagger
 * /api/permissions/roles/{roleId}:
 *   get:
 *     summary: Получить разрешения роли
 *     description: Возвращает список разрешений для конкретной роли
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Разрешения роли
 *       403:
 *         description: Требуется роль admin
 *       404:
 *         description: Роль не найдена
 *   put:
 *     summary: Обновить разрешения роли
 *     description: Обновляет список разрешений и флаги is_hidden для роли
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
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
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     permissionId:
 *                       type: string
 *                       format: uuid
 *                     isHidden:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Разрешения обновлены
 *       403:
 *         description: Недостаточно прав
 */

/**
 * @swagger
 * /api/permissions/users/{userId}:
 *   get:
 *     summary: Получить разрешения пользователя
 *     description: Возвращает все разрешения пользователя через его роли
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Разрешения пользователя
 *       403:
 *         description: Недостаточно прав
 */

/**
 * @swagger
 * /api/permissions/check-visibility:
 *   get:
 *     summary: Проверить видимость UI элемента
 *     description: Проверяет, должен ли элемент быть видим для текущего пользователя
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *         description: Название ресурса (например, 'users', 'projects')
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Действие (например, 'create', 'delete')
 *     responses:
 *       200:
 *         description: Результат проверки
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 visible:
 *                   type: boolean
 *                 hasPermission:
 *                   type: boolean
 */

// ==================== ROLES ====================

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Получить все роли
 *     description: Возвращает список всех доступных ролей для тенанта
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список ролей
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
 *                     $ref: '#/components/schemas/Role'
 *       403:
 *         description: Требуется разрешение roles.read
 */

// ==================== TENANTS ====================

/**
 * @swagger
 * /api/tenants/{id}:
 *   get:
 *     summary: Получить информацию о компании
 *     description: Возвращает данные тенанта включая настройки
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID тенанта
 *     responses:
 *       200:
 *         description: Данные компании
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tenant'
 *       403:
 *         description: Нет доступа к этому тенанту
 *       404:
 *         description: Тенант не найден
 *   put:
 *     summary: Обновить данные компании
 *     description: Обновляет информацию о тенанте
 *     tags: [Tenants]
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
 *               name:
 *                 type: string
 *                 description: Название компании
 *               settings:
 *                 type: object
 *                 description: Настройки компании
 *     responses:
 *       200:
 *         description: Данные обновлены
 *       403:
 *         description: Нет прав на редактирование
 */

/**
 * @swagger
 * /api/tenants/{id}/logo:
 *   post:
 *     summary: Загрузить логотип компании
 *     description: Загружает изображение логотипа для тенанта
 *     tags: [Tenants]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Файл логотипа (PNG, JPG, SVG)
 *     responses:
 *       200:
 *         description: Логотип загружен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 logoUrl:
 *                   type: string
 *                   description: URL загруженного логотипа
 *       400:
 *         description: Некорректный файл
 */

// ==================== WORK COMPLETIONS ====================

/**
 * @swagger
 * /api/estimates/{estimateId}/work-completions:
 *   get:
 *     summary: Получить выполненные работы сметы
 *     description: Возвращает список всех записей о выполнении работ для сметы
 *     tags: [Work Completions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Список выполненных работ
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
 *                     $ref: '#/components/schemas/WorkCompletion'
 *       404:
 *         description: Смета не найдена
 *   post:
 *     summary: Создать/обновить выполнение работы
 *     description: Добавляет или обновляет запись о проценте выполнения работы
 *     tags: [Work Completions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
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
 *             required:
 *               - estimateItemId
 *               - completedPercent
 *             properties:
 *               estimateItemId:
 *                 type: string
 *                 format: uuid
 *                 description: ID позиции сметы
 *               completedPercent:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Процент выполнения (0-100)
 *               notes:
 *                 type: string
 *                 description: Примечания к выполнению
 *     responses:
 *       200:
 *         description: Запись создана/обновлена
 *       400:
 *         description: Некорректные данные
 */

/**
 * @swagger
 * /api/estimates/{estimateId}/work-completions/batch:
 *   post:
 *     summary: Массовое обновление выполнения
 *     description: Обновляет процент выполнения для нескольких позиций сразу
 *     tags: [Work Completions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
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
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     estimateItemId:
 *                       type: string
 *                       format: uuid
 *                     completedPercent:
 *                       type: number
 *     responses:
 *       200:
 *         description: Записи обновлены
 */

/**
 * @swagger
 * /api/estimates/{estimateId}/work-completions/{estimateItemId}:
 *   delete:
 *     summary: Удалить запись о выполнении
 *     description: Удаляет запись о проценте выполнения для позиции
 *     tags: [Work Completions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: estimateItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Запись удалена
 *       404:
 *         description: Запись не найдена
 */

// ==================== SEARCH ====================

/**
 * @swagger
 * /api/search:
 *   post:
 *     summary: Универсальный семантический поиск
 *     description: |
 *       AI-powered поиск по справочникам материалов, работ и контрагентов.
 *       Использует OpenAI embeddings и Pinecone для семантического понимания запросов.
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - entity
 *             properties:
 *               entity:
 *                 type: string
 *                 enum: [materials, works, counterparties, estimate_items]
 *                 description: Тип сущности для поиска
 *               query:
 *                 type: string
 *                 description: Поисковый запрос
 *                 example: "цемент для стяжки пола"
 *               threshold:
 *                 type: number
 *                 default: 0.5
 *                 description: Минимальный порог релевантности (0-1)
 *               limit:
 *                 type: integer
 *                 default: 50
 *                 description: Максимальное количество результатов
 *     responses:
 *       200:
 *         description: Результаты поиска
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       score:
 *                         type: number
 *                         description: Релевантность (0-1)
 */

/**
 * @swagger
 * /api/search/pinecone:
 *   post:
 *     summary: Гибридный поиск (keyword + semantic)
 *     description: |
 *       Комбинирует точный поиск по ключевым словам с семантическим пониманием.
 *       Автоматически выбирает оптимальную стратегию на основе запроса.
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Поисковый запрос
 *               limit:
 *                 type: integer
 *                 default: 10
 *               type:
 *                 type: string
 *                 enum: [material, work, all]
 *                 default: all
 *               scope:
 *                 type: string
 *                 enum: [global, tenant, all]
 *                 default: all
 *               mode:
 *                 type: string
 *                 enum: [hybrid, semantic, auto]
 *                 default: auto
 *                 description: Режим поиска (auto автоматически выбирает лучший)
 *     responses:
 *       200:
 *         description: Результаты гибридного поиска
 */

/**
 * @swagger
 * /api/search/smart:
 *   post:
 *     summary: Умный поиск с GPT
 *     description: |
 *       Использует GPT для понимания контекста строительных задач.
 *       Автоматически расширяет запрос синонимами и связанными терминами.
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Поисковый запрос
 *                 example: "ремонт ванной комнаты"
 *               type:
 *                 type: string
 *                 enum: [material, work]
 *                 default: material
 *               limit:
 *                 type: integer
 *                 default: 20
 *               scope:
 *                 type: string
 *                 enum: [global, tenant, all]
 *                 default: all
 *     responses:
 *       200:
 *         description: Результаты умного поиска
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 query:
 *                   type: string
 *                   description: Исходный запрос
 *                 expandedKeywords:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Расширенные ключевые слова от GPT
 *                 count:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 */

/**
 * @swagger
 * /api/search/pinecone/stats:
 *   get:
 *     summary: Статистика Pinecone индекса
 *     description: Возвращает информацию о векторном индексе
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика индекса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalVectors:
 *                       type: integer
 *                       description: Общее количество векторов
 *                     dimension:
 *                       type: integer
 *                       description: Размерность векторов
 *                     namespaces:
 *                       type: object
 *                       description: Статистика по namespace
 */

// ==================== ADDITIONAL SCHEMAS ====================

/**
 * @swagger
 * components:
 *   schemas:
 *     EstimateTemplate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           description: Название шаблона
 *         description:
 *           type: string
 *         category:
 *           type: string
 *           description: Категория (Ванная, Кухня и т.д.)
 *         createdBy:
 *           type: string
 *           format: uuid
 *         itemsCount:
 *           type: integer
 *           description: Количество позиций в шаблоне
 *         createdAt:
 *           type: string
 *           format: date-time
 * 
 *     Permission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         key:
 *           type: string
 *           description: Ключ разрешения (например, 'users.create')
 *         name:
 *           type: string
 *           description: Название на русском
 *         description:
 *           type: string
 *         resource:
 *           type: string
 *           description: Ресурс (users, projects, etc.)
 *         action:
 *           type: string
 *           description: Действие (create, read, update, delete, manage)
 * 
 *     Role:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         key:
 *           type: string
 *           description: Ключ роли (admin, project_manager, etc.)
 *         name:
 *           type: string
 *           description: Название роли на русском
 *         description:
 *           type: string
 *         level:
 *           type: integer
 *           description: Уровень роли (1-99)
 *         isSystem:
 *           type: boolean
 *           description: Системная роль (нельзя удалить)
 * 
 *     Tenant:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           description: Название компании
 *         logoUrl:
 *           type: string
 *           description: URL логотипа
 *         settings:
 *           type: object
 *           description: JSON с настройками компании
 *         createdAt:
 *           type: string
 *           format: date-time
 * 
 *     WorkCompletion:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         estimateItemId:
 *           type: string
 *           format: uuid
 *         completedPercent:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *         notes:
 *           type: string
 *         completedAt:
 *           type: string
 *           format: date-time
 *         completedBy:
 *           type: string
 *           format: uuid
 */

export default {};
