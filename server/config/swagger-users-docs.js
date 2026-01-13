/**
 * Swagger JSDoc комментарии для Users модуля
 * Скопируйте эти комментарии в соответствующие функции в usersController.js
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Получить пользователя по ID
 *     description: Возвращает полную информацию о пользователе включая роли. Только для администраторов.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID пользователя
 *     responses:
 *       200:
 *         description: Пользователь найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Доступ запрещен
 *       404:
 *         description: Пользователь не найден
 */

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Создать нового пользователя
 *     description: Создает нового пользователя в компании с указанными ролями. Только для администраторов.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Петров Петр Петрович"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "petrov@example.com"
 *               phone:
 *                 type: string
 *                 example: "+7 (999) 123-45-67"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               roleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Массив ID ролей
 *     responses:
 *       201:
 *         description: Пользователь создан
 *       400:
 *         description: Ошибка валидации
 *       403:
 *         description: Доступ запрещен
 *       409:
 *         description: Email уже существует
 */

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Обновить пользователя
 *     description: Обновляет данные пользователя (имя, телефон, email). Только для администраторов.
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
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Пользователь обновлен
 *       403:
 *         description: Доступ запрещен
 *       404:
 *         description: Пользователь не найден
 */

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Удалить пользователя
 *     description: Удаляет пользователя из системы (мягкое удаление - status='deleted'). Только для администраторов.
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
 *         description: Пользователь удален
 *       403:
 *         description: Доступ запрещен
 *       404:
 *         description: Пользователь не найден
 */

/**
 * @swagger
 * /users/{id}/roles:
 *   post:
 *     tags: [Users]
 *     summary: Назначить роли пользователю
 *     description: Заменяет роли пользователя на указанные. Только для администраторов.
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
 *             required:
 *               - roleIds
 *             properties:
 *               roleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Массив ID ролей для назначения
 *                 example: ["550e8400-e29b-41d4-a716-446655440000"]
 *     responses:
 *       200:
 *         description: Роли успешно назначены
 *       403:
 *         description: Доступ запрещен
 *       404:
 *         description: Пользователь не найден
 */

/**
 * @swagger
 * /users/roles:
 *   get:
 *     tags: [Users]
 *     summary: Получить все доступные роли
 *     description: Возвращает список всех ролей в системе (admin, manager, worker). Только для администраторов.
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       key:
 *                         type: string
 *                         enum: [admin, manager, worker]
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *       403:
 *         description: Доступ запрещен
 */

/**
 * @swagger
 * /users/{id}/deactivate:
 *   post:
 *     tags: [Users]
 *     summary: Деактивировать пользователя
 *     description: Устанавливает status='inactive'. Пользователь не сможет войти в систему. Только для администраторов.
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
 *         description: Пользователь деактивирован
 *       403:
 *         description: Доступ запрещен
 *       404:
 *         description: Пользователь не найден
 */

/**
 * @swagger
 * /users/{id}/activate:
 *   post:
 *     tags: [Users]
 *     summary: Активировать пользователя
 *     description: Устанавливает status='active'. Пользователь снова сможет войти. Только для администраторов.
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
 *         description: Пользователь активирован
 *       403:
 *         description: Доступ запрещен
 *       404:
 *         description: Пользователь не найден
 */

/**
 * @swagger
 * /users/{id}/avatar:
 *   post:
 *     tags: [Users]
 *     summary: Загрузить аватар пользователя
 *     description: Загружает изображение аватара (base64), сохраняет в БД. Максимум 5MB.
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
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: byte
 *                 description: Base64 encoded image
 *                 example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *     responses:
 *       200:
 *         description: Аватар успешно загружен
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
 *                   type: object
 *                   properties:
 *                     avatar_url:
 *                       type: string
 *       400:
 *         description: Неверный формат изображения
 *       403:
 *         description: Доступ запрещен
 */
