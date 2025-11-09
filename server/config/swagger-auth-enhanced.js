/**
 * Swagger/OpenAPI Documentation для улучшенной аутентификации
 * Smeta Pro - Enhanced Authentication Features
 * Version: 1.9.0
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EnhancedLoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email пользователя
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           description: Пароль пользователя
 *           example: "userPassword123"
 *         rememberMe:
 *           type: boolean
 *           description: Запомнить пользователя (увеличивает время жизни токенов)
 *           default: false
 *           example: false
 *       example:
 *         email: "user@example.com"
 *         password: "userPassword123"
 *         rememberMe: false
 * 
 *     EnhancedLoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Вход выполнен успешно"
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             tokens:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT токен доступа
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken:
 *                   type: string
 *                   description: Токен обновления
 *                   example: "def456ghi789jkl012mno345pqr678stu901"
 *                 expiresIn:
 *                   type: number
 *                   description: Время жизни access токена в секундах
 *                   example: 3600
 *                 refreshExpiresIn:
 *                   type: number
 *                   description: Время жизни refresh токена в секундах
 *                   example: 604800
 *             emailVerified:
 *               type: boolean
 *               description: Email подтвержден?
 *               example: true
 *             requiresPasswordChange:
 *               type: boolean
 *               description: Требуется смена пароля?
 *               example: false
 *             lastLogin:
 *               type: string
 *               format: date-time
 *               description: Время последнего входа
 *               example: "2025-11-01T10:00:00Z"
 *       example:
 *         success: true
 *         message: "Вход выполнен успешно"
 *         data:
 *           user:
 *             id: "123e4567-e89b-12d3-a456-426614174000"
 *             email: "user@example.com"
 *             fullName: "Иван Петров"
 *             emailVerified: true
 *           tokens:
 *             accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             refreshToken: "def456ghi789jkl012mno345pqr678stu901"
 *             expiresIn: 3600
 *             refreshExpiresIn: 604800
 *           emailVerified: true
 *           requiresPasswordChange: false
 *           lastLogin: "2025-11-01T10:00:00Z"
 * 
 *     EmailVerificationRequest:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: Токен подтверждения email из письма
 *           example: "abc123def456ghi789jkl"
 *       example:
 *         token: "abc123def456ghi789jkl"
 * 
 *     EmailVerificationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Email успешно подтвержден"
 *         data:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *               format: email
 *               description: Подтверждённый email
 *               example: "user@example.com"
 *             verifiedAt:
 *               type: string
 *               format: date-time
 *               description: Время подтверждения
 *               example: "2025-11-01T12:00:00Z"
 *             autoLogin:
 *               type: boolean
 *               description: Автоматический вход выполнен?
 *               example: true
 *             tokens:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT токен (если autoLogin=true)
 *                 refreshToken:
 *                   type: string
 *                   description: Refresh токен (если autoLogin=true)
 *       example:
 *         success: true
 *         message: "Email успешно подтвержден"
 *         data:
 *           email: "user@example.com"
 *           verifiedAt: "2025-11-01T12:00:00Z"
 *           autoLogin: true
 *           tokens:
 *             accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             refreshToken: "def456ghi789jkl012mno345pqr678stu901"
 * 
 *     ResendVerificationRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email для повторной отправки письма подтверждения
 *           example: "user@example.com"
 *       example:
 *         email: "user@example.com"
 * 
 *     AuthenticationError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           description: Описание ошибки аутентификации
 *         error:
 *           type: string
 *           description: Код ошибки
 *       examples:
 *         invalidCredentials:
 *           summary: Неверные учетные данные
 *           value:
 *             success: false
 *             message: "Неверный email или пароль"
 *             error: "INVALID_CREDENTIALS"
 *         emailNotVerified:
 *           summary: Email не подтвержден
 *           value:
 *             success: false
 *             message: "Подтвердите email адрес для входа в систему"
 *             error: "EMAIL_NOT_VERIFIED"
 *         accountBlocked:
 *           summary: Аккаунт заблокирован
 *           value:
 *             success: false
 *             message: "Аккаунт временно заблокирован из-за множественных попыток входа"
 *             error: "ACCOUNT_BLOCKED"
 *         tokenExpired:
 *           summary: Токен истёк
 *           value:
 *             success: false
 *             message: "Токен подтверждения email истёк"
 *             error: "TOKEN_EXPIRED"
 * 
 * paths:
 *   /auth/verify-email:
 *     post:
 *       tags:
 *         - Email Verification
 *       summary: Подтвердить email адрес
 *       description: |
 *         Подтверждает email адрес пользователя по токену из письма.
 *         
 *         **Процесс подтверждения:**
 *         1. Проверяется валидность и срок действия токена
 *         2. Помечается email как подтверждённый
 *         3. Удаляется токен подтверждения
 *         4. Опционально выполняется автоматический вход
 *         
 *         **Безопасность:**
 *         - Токен действует 24 часа
 *         - Одноразовое использование
 *         - Автоматическое удаление после использования
 *         
 *         **Примечание:** Эндпоинт не требует авторизации.
 *       operationId: verifyEmail
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailVerificationRequest'
 *       responses:
 *         '200':
 *           description: Email успешно подтвержден
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/EmailVerificationResponse'
 *         '400':
 *           description: Неверный или истёкший токен
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/AuthenticationError'
 *               examples:
 *                 tokenExpired:
 *                   $ref: '#/components/schemas/AuthenticationError/examples/tokenExpired'
 *         '500':
 *           description: Ошибка сервера
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorResponse'
 * 
 *   /auth/resend-verification:
 *     post:
 *       tags:
 *         - Email Verification
 *       summary: Повторно отправить письмо подтверждения
 *       description: |
 *         Повторно отправляет письмо с токеном подтверждения email.
 *         
 *         **Функциональность:**
 *         - Создаёт новый токен подтверждения
 *         - Отправляет новое письмо
 *         - Деактивирует предыдущие токены
 *         
 *         **Ограничения:**
 *         - Rate limiting: максимум 3 запроса в час
 *         - Только для неподтверждённых email
 *         
 *         **Примечание:** Эндпоинт не требует авторизации.
 *       operationId: resendEmailVerification
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResendVerificationRequest'
 *       responses:
 *         '200':
 *           description: Письмо отправлено повторно
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   message:
 *                     type: string
 *                     example: "Письмо с подтверждением отправлено повторно"
 *         '400':
 *           description: Email уже подтвержден или не найден
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/AuthenticationError'
 *         '429':
 *           description: Слишком много запросов
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/AuthenticationError'
 *         '500':
 *           description: Ошибка сервера
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorResponse'
 */

export default {};