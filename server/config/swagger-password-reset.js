/**
 * Swagger/OpenAPI Documentation для Password Reset API
 * Smeta Pro - Функция восстановления пароля
 * Version: 1.9.0
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PasswordResetRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email пользователя для восстановления пароля
 *           example: "user@example.com"
 *       example:
 *         email: "user@example.com"
 * 
 *     PasswordResetForm:
 *       type: object
 *       required:
 *         - token
 *         - password
 *       properties:
 *         token:
 *           type: string
 *           description: Токен восстановления пароля из email
 *           example: "abc123def456ghi789jkl"
 *         password:
 *           type: string
 *           minLength: 8
 *           description: Новый пароль (минимум 8 символов, должен содержать заглавные/строчные буквы и цифры)
 *           example: "NewSecurePassword123"
 *       example:
 *         token: "abc123def456ghi789jkl"
 *         password: "NewSecurePassword123"
 * 
 *     TokenValidationRequest:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: Токен для проверки валидности
 *           example: "abc123def456ghi789jkl"
 *       example:
 *         token: "abc123def456ghi789jkl"
 * 
 *     PasswordResetSuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Письмо с инструкциями отправлено на указанный email"
 *       example:
 *         success: true
 *         message: "Если указанный email существует, на него отправлена ссылка для сброса пароля"
 * 
 *     PasswordChangeSuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Пароль успешно изменен"
 *         data:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *               format: email
 *               description: Email пользователя
 *               example: "user@example.com"
 *             resetAt:
 *               type: string
 *               format: date-time
 *               description: Время изменения пароля
 *               example: "2025-11-01T12:00:00Z"
 *       example:
 *         success: true
 *         message: "Пароль успешно изменен"
 *         data:
 *           email: "user@example.com"
 *           resetAt: "2025-11-01T12:00:00Z"
 * 
 *     TokenValidationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Токен действителен"
 *         data:
 *           type: object
 *           properties:
 *             valid:
 *               type: boolean
 *               description: Токен действителен?
 *               example: true
 *             email:
 *               type: string
 *               format: email
 *               description: Email пользователя
 *               example: "user@example.com"
 *             expiresAt:
 *               type: string
 *               format: date-time
 *               description: Время истечения токена
 *               example: "2025-11-01T13:00:00Z"
 *             timeRemaining:
 *               type: string
 *               description: Оставшееся время до истечения
 *               example: "45 минут"
 *       example:
 *         success: true
 *         message: "Токен действителен"
 *         data:
 *           valid: true
 *           email: "user@example.com"
 *           expiresAt: "2025-11-01T13:00:00Z"
 *           timeRemaining: "45 минут"
 * 
 *     PasswordResetError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           description: Описание ошибки
 *         error:
 *           type: string
 *           description: Код ошибки
 *       examples:
 *         invalidEmail:
 *           summary: Неверный email
 *           value:
 *             success: false
 *             message: "Укажите корректный email адрес"
 *             error: "INVALID_EMAIL"
 *         tokenExpired:
 *           summary: Токен истёк
 *           value:
 *             success: false
 *             message: "Ссылка для сброса пароля истекла. Запросите новую ссылку"
 *             error: "TOKEN_EXPIRED"
 *         tokenInvalid:
 *           summary: Неверный токен
 *           value:
 *             success: false
 *             message: "Неверная ссылка для сброса пароля"
 *             error: "INVALID_TOKEN"
 *         weakPassword:
 *           summary: Слабый пароль
 *           value:
 *             success: false
 *             message: "Пароль должен содержать минимум 8 символов, включая заглавные и строчные буквы, цифры"
 *             error: "WEAK_PASSWORD"
 * 
 * paths:
 *   /password/forgot:
 *     post:
 *       tags:
 *         - Password Reset
 *       summary: Запросить сброс пароля
 *       description: |
 *         Создает запрос на сброс пароля для указанного email.
 *         
 *         **Процесс восстановления:**
 *         1. Проверяется существование пользователя с указанным email
 *         2. Создается уникальный токен (UUID) со сроком действия 1 час
 *         3. Отправляется email с ссылкой для сброса пароля
 *         4. Токен сохраняется в базе данных
 *         
 *         **Безопасность:**
 *         - Всегда возвращается успешный ответ, даже если email не найден
 *         - Токен действует только 1 час
 *         - Одноразовое использование токена
 *         - Rate limiting: максимум 3 запроса в час на email
 *         
 *         **Примечание:** Эндпоинт не требует авторизации.
 *       operationId: requestPasswordReset
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PasswordResetRequest'
 *             examples:
 *               basicRequest:
 *                 summary: Стандартный запрос
 *                 value:
 *                   email: "user@example.com"
 *       responses:
 *         '200':
 *           description: Запрос обработан успешно
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/PasswordResetSuccessResponse'
 *         '400':
 *           description: Неверный запрос
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/PasswordResetError'
 *               examples:
 *                 invalidEmail:
 *                   $ref: '#/components/schemas/PasswordResetError/examples/invalidEmail'
 *         '429':
 *           description: Слишком много запросов
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/PasswordResetError'
 *               example:
 *                 success: false
 *                 message: "Слишком много запросов на сброс пароля. Попробуйте через час"
 *                 error: "RATE_LIMIT_EXCEEDED"
 *         '500':
 *           description: Ошибка сервера
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorResponse'
 * 
 *   /password/reset:
 *     post:
 *       tags:
 *         - Password Reset
 *       summary: Установить новый пароль
 *       description: |
 *         Устанавливает новый пароль пользователя по токену сброса.
 *         
 *         **Процесс сброса:**
 *         1. Проверяется валидность и срок действия токена
 *         2. Валидируется новый пароль (требования безопасности)
 *         3. Хэшируется и сохраняется новый пароль
 *         4. Удаляются все активные токены сброса пользователя
 *         5. Завершаются все активные сессии для безопасности
 *         
 *         **Требования к паролю:**
 *         - Минимум 8 символов
 *         - Содержит заглавные буквы (A-Z)
 *         - Содержит строчные буквы (a-z)
 *         - Содержит цифры (0-9)
 *         - Не должен совпадать с предыдущим паролем
 *         
 *         **Примечание:** Эндпоинт не требует авторизации.
 *       operationId: resetPassword
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PasswordResetForm'
 *             examples:
 *               validReset:
 *                 summary: Валидные данные для сброса
 *                 value:
 *                   token: "abc123def456ghi789jkl"
 *                   password: "NewSecurePassword123"
 *       responses:
 *         '200':
 *           description: Пароль успешно изменен
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/PasswordChangeSuccessResponse'
 *         '400':
 *           description: Неверные данные
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/PasswordResetError'
 *               examples:
 *                 tokenExpired:
 *                   $ref: '#/components/schemas/PasswordResetError/examples/tokenExpired'
 *                 tokenInvalid:
 *                   $ref: '#/components/schemas/PasswordResetError/examples/tokenInvalid'
 *                 weakPassword:
 *                   $ref: '#/components/schemas/PasswordResetError/examples/weakPassword'
 *         '500':
 *           description: Ошибка сервера
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorResponse'
 * 
 *   /password/validate-reset-token:
 *     post:
 *       tags:
 *         - Password Reset
 *       summary: Проверить токен сброса пароля
 *       description: |
 *         Проверяет валидность токена сброса пароля без его использования.
 *         
 *         **Применение:**
 *         - Проверка ссылки перед отображением формы сброса
 *         - Показ информации о сроке действия токена
 *         - UX: предотвращение ввода данных в недействительную форму
 *         
 *         **Возвращает информацию:**
 *         - Валидность токена
 *         - Email пользователя (если токен валиден)
 *         - Время истечения токена
 *         - Оставшееся время до истечения
 *         
 *         **Примечание:** Эндпоинт не требует авторизации.
 *       operationId: validateResetToken
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenValidationRequest'
 *             examples:
 *               validToken:
 *                 summary: Проверка токена
 *                 value:
 *                   token: "abc123def456ghi789jkl"
 *       responses:
 *         '200':
 *           description: Информация о токене
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/TokenValidationResponse'
 *               examples:
 *                 validToken:
 *                   summary: Токен действителен
 *                   value:
 *                     success: true
 *                     message: "Токен действителен"
 *                     data:
 *                       valid: true
 *                       email: "user@example.com"
 *                       expiresAt: "2025-11-01T13:00:00Z"
 *                       timeRemaining: "45 минут"
 *                 expiredToken:
 *                   summary: Токен истёк
 *                   value:
 *                     success: false
 *                     message: "Токен истёк"
 *                     data:
 *                       valid: false
 *                       email: null
 *                       expiresAt: "2025-11-01T11:00:00Z"
 *                       timeRemaining: "истёк"
 *         '400':
 *           description: Неверный запрос
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/PasswordResetError'
 *               examples:
 *                 tokenInvalid:
 *                   $ref: '#/components/schemas/PasswordResetError/examples/tokenInvalid'
 *         '500':
 *           description: Ошибка сервера
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorResponse'
 */

export default {};