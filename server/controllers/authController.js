import { transaction, setSessionContext } from '../config/database.js';
import { hashPassword, comparePassword, validatePassword } from '../utils/password.js';
import { generateTokens, getRefreshTokenExpiration } from '../utils/jwt.js';
import emailService, { verifyEmailToken } from '../services/emailService.js';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { createDefaultRolesForTenant } from '../utils/createDefaultRoles.js';
import {
  catchAsync,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError
} from '../utils/errors.js';

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Регистрация новой компании и первого пользователя
 *     description: Создает новую компанию (tenant), первого пользователя с ролью admin и привязывает их. Email отправляется в нижнем регистре.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - email
 *               - password
 *               - fullName
 *             properties:
 *               companyName:
 *                 type: string
 *                 description: Название компании (должно быть уникальным)
 *                 example: "ООО Строймастер"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email пользователя (должен быть уникальным)
 *                 example: "admin@stroymaster.ru"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: Пароль (мин. 8 символов, буквы и цифры)
 *                 example: "SecurePass123"
 *               fullName:
 *                 type: string
 *                 description: Полное имя пользователя
 *                 example: "Иванов Иван Иванович"
 *               phone:
 *                 type: string
 *                 description: Телефон пользователя (опционально)
 *                 example: "+7 (999) 123-45-67"
 *     responses:
 *       201:
 *         description: Регистрация успешна, возвращает токены и данные пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Регистрация успешна"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     plan:
 *                       type: string
 *                       enum: [free, basic, premium]
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token (15 минут)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token (7 дней)
 *       400:
 *         description: Ошибка валидации данных
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingFields:
 *                 value:
 *                   success: false
 *                   message: "Заполните все обязательные поля"
 *               invalidEmail:
 *                 value:
 *                   success: false
 *                   message: "Неверный формат email"
 *               weakPassword:
 *                 value:
 *                   success: false
 *                   message: "Пароль должен содержать минимум 8 символов"
 *               emailExists:
 *                 value:
 *                   success: false
 *                   message: "Пользователь с таким email уже существует"
 *               companyExists:
 *                 value:
 *                   success: false
 *                   message: "Компания с таким названием уже существует"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const register = catchAsync(async (req, res) => {
  const { companyName, email, password, fullName, phone, skipEmailVerification } = req.body;

  // E2E Test Mode: если передан skipEmailVerification=true и мы в dev окружении,
  // пользователь создаётся с уже подтверждённым email
  const isTestMode = skipEmailVerification === true && process.env.NODE_ENV !== 'production';

  // Валидация входных данных
  if (!email || !password || !fullName) {
    return res.status(400).json({
      success: false,
      message: 'Заполните все обязательные поля'
    });
  }

  // Валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Неверный формат email'
    });
  }

  // Валидация пароля
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      success: false,
      message: passwordValidation.message
    });
  }

  // Выполняем регистрацию в транзакции
  const result = await transaction(async (client) => {
    // 1. Проверяем, что email не занят
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('Пользователь с таким email уже существует');
    }

    // 2. Определяем название компании (если не указано, используем email + timestamp)
    const finalCompanyName = companyName || `Company ${email.split('@')[0]}-${Date.now()}`;

    // 3. Проверяем, что название компании не занято
    const existingTenant = await client.query(
      'SELECT id FROM tenants WHERE name = $1',
      [finalCompanyName]
    );

    if (existingTenant.rows.length > 0) {
      throw new ConflictError('Компания с таким названием уже существует');
    }

    // 4. Создаем компанию
    const tenantResult = await client.query(
      `INSERT INTO tenants (name, plan, status)
         VALUES ($1, 'free', 'active')
         RETURNING id, name, plan, company_full_name, inn, ogrn, kpp, legal_address, actual_address,
                   bank_account, correspondent_account, bank_bik, bank_name,
                   director_name, accountant_name, created_at`,
      [finalCompanyName]
    );
    const tenant = tenantResult.rows[0];

    // 5. Хэшируем пароль
    const passHash = await hashPassword(password);

    // 6. Создаем пользователя
    // isTestMode передаётся из внешней области видимости (register функция)
    const userResult = await client.query(
      `INSERT INTO users (email, pass_hash, full_name, phone, status, email_verified, avatar_url)
         VALUES ($1, $2, $3, $4, 'active', $5, '/favicon.png')
         RETURNING id, email, full_name, phone, avatar_url, created_at, email_verified`,
      [email.toLowerCase(), passHash, fullName, phone || null, isTestMode]
    );
    const user = userResult.rows[0];

    // 6. Связываем пользователя с компанией (is_default = true)
    await client.query(
      `INSERT INTO user_tenants (tenant_id, user_id, is_default)
         VALUES ($1, $2, true)`,
      [tenant.id, user.id]
    );

    // 7. Создаём дефолтные роли для нового тенанта
    const defaultRoles = await createDefaultRolesForTenant(client, tenant.id);
    console.log(`✅ Создано ${defaultRoles.length} ролей для тенанта ${tenant.name}`);

    // 8. Получаем роль admin для этого тенанта
    const roleResult = await client.query(
      `SELECT id FROM roles WHERE key = 'admin' AND tenant_id = $1`,
      [tenant.id]
    );

    if (roleResult.rows.length === 0) {
      throw new NotFoundError('Роль admin не найдена для нового тенанта');
    }

    const adminRoleId = roleResult.rows[0].id;

    // 9. Назначаем роль admin пользователю
    await client.query(
      `INSERT INTO user_role_assignments (tenant_id, user_id, role_id)
         VALUES ($1, $2, $3)`,
      [tenant.id, user.id, adminRoleId]
    );

    // 10. НЕ создаем сессию и НЕ выдаем токены до подтверждения email
    // Пользователь должен сначала подтвердить email, потом войти через /login

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        companyFullName: tenant.company_full_name,
        inn: tenant.inn,
        ogrn: tenant.ogrn,
        kpp: tenant.kpp,
        legalAddress: tenant.legal_address,
        actualAddress: tenant.actual_address,
        bankAccount: tenant.bank_account,
        correspondentAccount: tenant.correspondent_account,
        bankBik: tenant.bank_bik,
        bankName: tenant.bank_name,
        directorName: tenant.director_name,
        accountantName: tenant.accountant_name
      }
      // НЕ возвращаем tokens - пользователь должен подтвердить email
    };
  });

  // E2E Test Mode: если isTestMode, сразу возвращаем токены и пропускаем email
  if (isTestMode) {
    console.log(`🧪 [Auth] E2E Test Mode: создан пользователь ${email} с подтверждённым email`);

    // Генерируем токены для теста (generateTokens уже импортирован в начале файла)
    // Сигнатура: generateTokens(userId, tenantId, email, roles = [], emailVerified = false, permissions = [])
    // Получаем назначенные роли и права для генерации токена
    const rolesResult = await query(
      `SELECT r.key, r.name
       FROM user_role_assignments ura
       JOIN roles r ON r.id = ura.role_id
       WHERE ura.user_id = $1 AND ura.tenant_id = $2`,
      [result.user.id, result.tenant.id]
    );

    const permissionsResult = await query(
      `SELECT DISTINCT p.key, p.resource, p.action
       FROM user_role_assignments ura
       JOIN role_permissions rp ON ura.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE ura.user_id = $1 AND ura.tenant_id = $2
       AND rp.is_hidden = false`,
      [result.user.id, result.tenant.id]
    );

    const tokens = generateTokens(
      result.user.id,
      result.tenant.id,
      result.user.email,
      rolesResult.rows,
      true, // emailVerified = true
      permissionsResult.rows
    );

    return res.status(201).json({
      success: true,
      message: 'Регистрация успешна! (Test Mode - email автоматически подтверждён)',
      requiresEmailVerification: false,
      data: {
        user: result.user,
        tenant: result.tenant,
        tokens
      }
    });
  }

  // Отправка письма подтверждения email (обычный режим)
  // ВАЖНО: В serverless (Vercel) нужно ЖДАТЬ отправки, иначе функция завершится раньше
  try {
    // Создаем токен верификации
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

    console.log(`📧 [Auth] Создание токена верификации для ${email}`);

    // Сохраняем в БД
    await query(
      `INSERT INTO email_verifications (user_id, email, token, expires_at)
         VALUES ($1, $2, $3, $4)`,
      [result.user.id, email.toLowerCase(), token, expiresAt]
    );

    console.log(`📧 [Auth] Токен сохранен в БД, отправляем email...`);

    // Отправляем email (ЖДЕМ завершения!)
    await emailService.sendVerificationEmail(
      email.toLowerCase(),
      token,
      fullName
    );

    console.log(`✅ [Auth] Письмо подтверждения успешно отправлено на ${email}`);
  } catch (emailError) {
    // Не падаем, если письмо не отправилось - пользователь сможет запросить повторно
    console.error('❌ [Auth] Ошибка отправки письма подтверждения:', emailError.message);
    console.error('❌ [Auth] Stack trace:', emailError.stack);
  }

  // Успешная регистрация - НЕ возвращаем токены до подтверждения email!
  res.status(201).json({
    success: true,
    message: 'Регистрация успешна! Проверьте вашу почту для подтверждения email.',
    requiresEmailVerification: true,
    data: {
      user: {
        email: result.user.email,
        fullName: result.user.fullName
      }
      // Токены НЕ возвращаем - пользователь должен сначала подтвердить email
    }
  });
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Вход пользователя в систему
 *     description: Аутентификация пользователя по email и паролю. Проверяет статус, верификацию email, выбирает компанию (tenant) и создает сессию. Возвращает access и refresh токены.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email пользователя
 *                 example: "admin@stroymaster.ru"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Пароль пользователя
 *                 example: "SecurePass123"
 *               tenantId:
 *                 type: string
 *                 format: uuid
 *                 description: ID компании (опционально, если пользователь в нескольких компаниях). Если не указан, выбирается is_default=true
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Успешный вход, возвращает токены и данные пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Вход выполнен успешно"
 *                 user:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         tenantId:
 *                           type: string
 *                           format: uuid
 *                           description: ID активной компании
 *                         tenantName:
 *                           type: string
 *                           description: Название компании
 *                         role:
 *                           type: string
 *                           description: Ключ роли (admin, manager, worker)
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token (15 минут)
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token (7 дней, также в httpOnly cookie)
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: "refreshToken=eyJhbGc...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800"
 *       400:
 *         description: Не указаны email или пароль
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Email и пароль обязательны"
 *       401:
 *         description: Неверный пароль
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Неверный пароль"
 *       403:
 *         description: Email не подтвержден или пользователь неактивен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               emailNotVerified:
 *                 value:
 *                   success: false
 *                   message: "Пожалуйста, подтвердите ваш email перед входом"
 *               userInactive:
 *                 value:
 *                   success: false
 *                   message: "Пользователь деактивирован"
 *       404:
 *         description: Пользователь или компания не найдены
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               userNotFound:
 *                 value:
 *                   success: false
 *                   message: "Пользователь не найден"
 *               tenantNotFound:
 *                 value:
 *                   success: false
 *                   message: "Компания не найдена"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const login = catchAsync(async (req, res) => {
  const { email, password, tenantId, rememberMe } = req.body;

  // Валидация
  if (!email || !password) {
    throw new BadRequestError('Email и пароль обязательны');
  }

  // Валидация формата email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new BadRequestError('Неверный формат email');
  }

  const result = await transaction(async (client) => {
    // 1. Находим пользователя
    const userResult = await client.query(
      `SELECT id, email, pass_hash, full_name, phone, avatar_url, status, email_verified
         FROM users
         WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      throw new UnauthorizedError('Неверный email или пароль');
    }

    const user = userResult.rows[0];

    // 2. Проверяем статус
    if (user.status !== 'active') {
      throw new UnauthorizedError('Аккаунт деактивирован');
    }

    // 3. Проверяем пароль
    const passwordMatch = await comparePassword(password, user.pass_hash);
    if (!passwordMatch) {
      throw new UnauthorizedError('Неверный email или пароль');
    }

    // 3.5. Проверяем является ли пользователь super_admin (может работать без tenant)
    const allUserRolesResult = await client.query(
      `SELECT DISTINCT r.key
         FROM user_role_assignments ura
         JOIN roles r ON r.id = ura.role_id
         WHERE ura.user_id = $1`,
      [user.id]
    );

    const userRoleKeys = allUserRolesResult.rows.map(row => row.key);
    const isSuperAdmin = userRoleKeys.includes('super_admin');

    // 4. Получаем компании пользователя
    const tenantsResult = await client.query(
      `SELECT t.id, t.name, t.plan, t.company_full_name, t.inn, t.ogrn, t.kpp,
                t.legal_address, t.actual_address,
                t.bank_account, t.correspondent_account, t.bank_bik, t.bank_name,
                t.director_name, t.accountant_name,
                ut.is_default
         FROM tenants t
         JOIN user_tenants ut ON t.id = ut.tenant_id
         WHERE ut.user_id = $1 AND t.status = 'active'
         ORDER BY ut.is_default DESC, t.created_at ASC`,
      [user.id]
    );

    // Для super_admin отсутствие tenant не является ошибкой
    if (!isSuperAdmin && tenantsResult.rows.length === 0) {
      throw new UnauthorizedError('У вас нет доступа ни к одной компании');
    }

    // 5. Выбираем тенант (указанный или дефолтный)
    let selectedTenant = null;
    let selectedTenantId = null;

    if (isSuperAdmin && tenantsResult.rows.length === 0) {
      // Super admin может работать без tenant
      selectedTenant = null;
      selectedTenantId = null;
    } else {
      // Для обычных пользователей и super_admin с tenants
      if (tenantId) {
        selectedTenant = tenantsResult.rows.find(t => t.id === tenantId);
        if (!selectedTenant) {
          throw new NotFoundError('Компания не найдена');
        }
      } else {
        selectedTenant = tenantsResult.rows[0]; // Первый (дефолтный)
      }
      selectedTenantId = selectedTenant?.id || null;
    }

    // 6. Получаем роли пользователя
    let rolesResult;
    if (isSuperAdmin && selectedTenantId === null) {
      // Super admin без tenant - получаем global роли
      rolesResult = await client.query(
        `SELECT r.key, r.name
           FROM user_role_assignments ura
           JOIN roles r ON r.id = ura.role_id
           WHERE ura.user_id = $1 AND ura.tenant_id IS NULL`,
        [user.id]
      );
    } else {
      // Обычный пользователь или super_admin с tenant
      // Для super_admin включаем ВСЕ роли (и tenant-specific, и global)
      if (isSuperAdmin) {
        rolesResult = await client.query(
          `SELECT r.key, r.name
             FROM user_role_assignments ura
             JOIN roles r ON r.id = ura.role_id
             WHERE ura.user_id = $1 AND (ura.tenant_id = $2 OR ura.tenant_id IS NULL)`,
          [user.id, selectedTenantId]
        );
      } else {
        rolesResult = await client.query(
          `SELECT r.key, r.name
             FROM user_role_assignments ura
             JOIN roles r ON r.id = ura.role_id
             WHERE ura.user_id = $1 AND ura.tenant_id = $2`,
          [user.id, selectedTenantId]
        );
      }
    }

    // 6.5. Получаем ВСЕ разрешения пользователя (через все его роли)
    let permissionsResult;
    if (isSuperAdmin && selectedTenantId === null) {
      // Super admin без tenant - получаем все разрешения
      permissionsResult = await client.query(
        `SELECT DISTINCT p.key, p.resource, p.action
           FROM user_role_assignments ura
           JOIN role_permissions rp ON ura.role_id = rp.role_id
           JOIN permissions p ON rp.permission_id = p.id
           WHERE ura.user_id = $1 AND ura.tenant_id IS NULL
           AND rp.is_hidden = false
           ORDER BY p.key`,
        [user.id]
      );
    } else {
      // Обычный пользователь или super_admin с tenant
      // Для super_admin включаем разрешения из ВСЕХ ролей (tenant + global)
      if (isSuperAdmin) {
        permissionsResult = await client.query(
          `SELECT DISTINCT p.key, p.resource, p.action
             FROM user_role_assignments ura
             JOIN role_permissions rp ON ura.role_id = rp.role_id
             JOIN permissions p ON rp.permission_id = p.id
             WHERE ura.user_id = $1 AND (ura.tenant_id = $2 OR ura.tenant_id IS NULL)
             AND rp.is_hidden = false
             ORDER BY p.key`,
          [user.id, selectedTenantId]
        );
      } else {
        permissionsResult = await client.query(
          `SELECT DISTINCT p.key, p.resource, p.action
             FROM user_role_assignments ura
             JOIN role_permissions rp ON ura.role_id = rp.role_id
             JOIN permissions p ON rp.permission_id = p.id
             WHERE ura.user_id = $1 AND ura.tenant_id = $2
             AND rp.is_hidden = false
             ORDER BY p.key`,
          [user.id, selectedTenantId]
        );
      }
    }

    console.log(`🔐 Login ${email}: найдено ${permissionsResult.rows.length} разрешений для JWT токена`);

    // 7. Генерируем токены (передаем роли, разрешения и email_verified)
    const tokens = generateTokens(user.id, selectedTenantId, user.email, rolesResult.rows, user.email_verified, permissionsResult.rows);

    // 8. Сохраняем refresh token с учетом "запомнить меня" (48 часов вместо 30 дней)
    const expiresAt = getRefreshTokenExpiration(rememberMe);
    await client.query(
      `INSERT INTO sessions (user_id, tenant_id, refresh_token, expires_at, device_info, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, selectedTenantId, tokens.refreshToken, expiresAt, req.headers['user-agent'], req.ip]
    );

    // 9. Обновляем last_login_at
    await client.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [user.id]
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified,
        fullName: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        isSuperAdmin: isSuperAdmin // ✅ Добавляем флаг супер-админа
      },
      // BUG-001 FIX: selectedTenant может быть null для super_admin без tenants
      tenant: selectedTenant ? {
        id: selectedTenant.id,
        name: selectedTenant.name,
        plan: selectedTenant.plan,
        companyFullName: selectedTenant.company_full_name,
        inn: selectedTenant.inn,
        ogrn: selectedTenant.ogrn,
        kpp: selectedTenant.kpp,
        legalAddress: selectedTenant.legal_address,
        actualAddress: selectedTenant.actual_address,
        bankAccount: selectedTenant.bank_account,
        correspondentAccount: selectedTenant.correspondent_account,
        bankBik: selectedTenant.bank_bik,
        bankName: selectedTenant.bank_name,
        directorName: selectedTenant.director_name,
        accountantName: selectedTenant.accountant_name
      } : null,
      tenants: tenantsResult.rows,
      roles: rolesResult.rows,
      tokens
    };
  });

  res.json({
    success: true,
    message: 'Вход выполнен успешно',
    data: result
  });
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Выход пользователя из системы
 *     description: Удаляет сессию пользователя из БД по refresh токену. После выхода токены становятся недействительными.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token из ответа /login или /refresh
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Выход успешно выполнен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Выход выполнен успешно"
 *       400:
 *         description: Refresh token не указан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Refresh token обязателен"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const logout = catchAsync(async (req, res) => {
  // Проверяем наличие req.body перед деструктуризацией
  if (!req.body) {
    throw new UnauthorizedError('Требуется авторизация');
  }

  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new BadRequestError('Refresh token обязателен');
  }

  // Удаляем сессию
  await transaction(async (client) => {
    await client.query(
      `DELETE FROM sessions WHERE refresh_token = $1`,
      [refreshToken]
    );
  });

  res.json({
    success: true,
    message: 'Выход выполнен успешно'
  });
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Обновление access токена
 *     description: Выдает новый access token используя действующий refresh token. Refresh token остается прежним. Проверяет существование сессии в БД и срок действия.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Действующий refresh token
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Новый access token выдан успешно
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 accessToken:
 *                   type: string
 *                   description: Новый access token (15 минут)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Refresh token не указан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Refresh token обязателен"
 *       401:
 *         description: Refresh token недействителен или истек
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidToken:
 *                 value:
 *                   success: false
 *                   message: "Недействительный refresh token"
 *               expiredToken:
 *                 value:
 *                   success: false
 *                   message: "Refresh token истек"
 *               sessionNotFound:
 *                 value:
 *                   success: false
 *                   message: "Сессия не найдена"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new BadRequestError('Refresh token обязателен');
  }

  const result = await transaction(async (client) => {
    // 1. Находим сессию
    const sessionResult = await client.query(
      `SELECT s.user_id, s.tenant_id, s.expires_at, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token = $1`,
      [refreshToken]
    );

    if (sessionResult.rows.length === 0) {
      throw new UnauthorizedError('Недействительный refresh token');
    }

    const session = sessionResult.rows[0];

    // 2. Проверяем, что токен не истёк
    if (new Date(session.expires_at) < new Date()) {
      // Удаляем истёкшую сессию
      await client.query(`DELETE FROM sessions WHERE refresh_token = $1`, [refreshToken]);
      throw new UnauthorizedError('Refresh token истёк');
    }

    // 2.5. Получаем email_verified пользователя
    const userResult = await client.query(
      `SELECT email_verified FROM users WHERE id = $1`,
      [session.user_id]
    );
    const emailVerified = userResult.rows[0]?.email_verified || false;

    // 2.6. Получаем роли пользователя
    const rolesResult = await client.query(
      `SELECT r.key, r.name
         FROM user_role_assignments ura
         JOIN roles r ON r.id = ura.role_id
         WHERE ura.user_id = $1 AND ura.tenant_id = $2`,
      [session.user_id, session.tenant_id]
    );

    // 2.7. Получаем разрешения пользователя
    const permissionsResult = await client.query(
      `SELECT DISTINCT p.key, p.resource, p.action
         FROM user_role_assignments ura
         JOIN role_permissions rp ON rp.role_id = ura.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE ura.user_id = $1 AND ura.tenant_id = $2`,
      [session.user_id, session.tenant_id]
    );

    // 3. Генерируем новые токены (с ролями, email_verified и разрешениями)
    const tokens = generateTokens(session.user_id, session.tenant_id, session.email, rolesResult.rows, emailVerified, permissionsResult.rows);

    // 4. Обновляем сессию с новым refresh token
    const newExpiresAt = getRefreshTokenExpiration();
    await client.query(
      `UPDATE sessions 
         SET refresh_token = $1, expires_at = $2, last_used_at = NOW()
         WHERE refresh_token = $3`,
      [tokens.refreshToken, newExpiresAt, refreshToken]
    );

    return tokens;
  });

  res.json({
    success: true,
    message: 'Токен обновлён',
    data: result
  });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Получение информации о текущем пользователе
 *     description: Возвращает данные пользователя, его роли в текущей компании и информацию о компании. Требует авторизации.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные текущего пользователя успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         lastLoginAt:
 *                           type: string
 *                           format: date-time
 *                           description: Время последнего входа
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: Дата регистрации
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                       description: Название компании
 *                     plan:
 *                       type: string
 *                       enum: [free, basic, premium]
 *                     status:
 *                       type: string
 *                       enum: [active, suspended, inactive]
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                         enum: [admin, manager, worker]
 *                         description: Ключ роли
 *                       name:
 *                         type: string
 *                         description: Название роли
 *                   example:
 *                     - key: "admin"
 *                       name: "Администратор"
 *       401:
 *         description: Токен не предоставлен или недействителен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Требуется авторизация"
 *       404:
 *         description: Пользователь не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Пользователь не найден"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getMe = catchAsync(async (req, res) => {
  const { userId, tenantId } = req.user;

  const result = await transaction(async (client) => {
    // Получаем данные пользователя
    const userResult = await client.query(
      `SELECT id, email, full_name, phone, avatar_url, last_login_at, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('Пользователь не найден');
    }

    const user = userResult.rows[0];

    // Проверяем является ли пользователь super_admin
    const allUserRolesResult = await client.query(
      `SELECT DISTINCT r.key
       FROM user_role_assignments ura
       JOIN roles r ON r.id = ura.role_id
       WHERE ura.user_id = $1`,
      [user.id]
    );
    const userRoleKeys = allUserRolesResult.rows.map(row => row.key);
    const isSuperAdmin = userRoleKeys.includes('super_admin');
    user.isSuperAdmin = isSuperAdmin;

    // Получаем текущую компанию
    const tenantResult = await client.query(
      `SELECT id, name, plan, status
       FROM tenants
       WHERE id = $1`,
      [tenantId]
    );

    const tenant = tenantResult.rows[0];

    // Получаем роли
    let rolesResult;
    if (isSuperAdmin) {
      rolesResult = await client.query(
        `SELECT r.key, r.name
         FROM user_role_assignments ura
         JOIN roles r ON r.id = ura.role_id
         WHERE ura.user_id = $1 AND (ura.tenant_id = $2 OR ura.tenant_id IS NULL)`,
        [userId, tenantId]
      );
    } else {
      rolesResult = await client.query(
        `SELECT r.key, r.name
         FROM user_role_assignments ura
         JOIN roles r ON r.id = ura.role_id
         WHERE ura.user_id = $1 AND ura.tenant_id = $2`,
        [userId, tenantId]
      );
    }

    // Получаем разрешения
    let permissionsResult;
    if (isSuperAdmin) {
      permissionsResult = await client.query(
        `SELECT DISTINCT p.key, p.name, p.resource, p.action
         FROM user_role_assignments ura
         JOIN role_permissions rp ON rp.role_id = ura.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE ura.user_id = $1 AND (ura.tenant_id = $2 OR ura.tenant_id IS NULL)`,
        [userId, tenantId]
      );
    } else {
      permissionsResult = await client.query(
        `SELECT DISTINCT p.key, p.name, p.resource, p.action
         FROM user_role_assignments ura
         JOIN role_permissions rp ON rp.role_id = ura.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE ura.user_id = $1 AND ura.tenant_id = $2`,
        [userId, tenantId]
      );
    }

    return {
      user,
      tenant,
      roles: rolesResult.rows,
      permissions: permissionsResult.rows
    };
  });

  res.json({
    success: true,
    data: result
  });
});

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     tags: [Authentication]
 *     summary: Подтверждение email по токену
 *     description: Подтверждает email пользователя по токену из письма
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Токен подтверждения из письма
 *     responses:
 *       200:
 *         description: Email успешно подтвержден
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         fullName:
 *                           type: string
 *       400:
 *         description: Недействительный или просроченный токен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
export const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new BadRequestError('Токен подтверждения обязателен');
  }

  console.log(`📧 [AuthController] Подтверждение email по токену`);

  const result = await verifyEmailToken(token);

  if (!result.success) {
    throw new BadRequestError(result.message);
  }

  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      user: result.user
    }
  });
});

export default {
  register,
  login,
  logout,
  refresh,
  getMe,
  verifyEmail
};
