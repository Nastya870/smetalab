import db from '../config/database.js';
import bcrypt from 'bcrypt';
import { generateEmailVerificationToken, sendVerificationEmail } from '../services/emailService.js';
import { validatePassword } from '../utils/password.js';
import { catchAsync, BadRequestError, NotFoundError, ConflictError, UnauthorizedError } from '../utils/errors.js';

/**
 * Контроллер для управления пользователями (только для администраторов)
 */

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Получить всех пользователей компании
 *     description: Возвращает список всех пользователей текущей компании (tenant) с пагинацией, поиском и информацией о ролях. Только для администраторов.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по имени или email
 *         example: "Иванов"
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
 *           default: 25
 *           maximum: 100
 *         description: Количество записей на странице
 *     responses:
 *       200:
 *         description: Список пользователей успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/User'
 *                           - type: object
 *                             properties:
 *                               roles:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     key:
 *                                       type: string
 *                                     name:
 *                                       type: string
 *                               status:
 *                                 type: string
 *                                 enum: [active, inactive, suspended]
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                               lastLoginAt:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *       401:
 *         description: Не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Доступ запрещен (не администратор)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Доступ запрещен. Требуются права администратора."
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getAllUsers = catchAsync(async (req, res) => {
  const { search, page = 1, pageSize = 25 } = req.query;
  const tenantId = req.user?.tenantId;
  const userId = req.user?.userId;

  if (!tenantId || !userId) {
    throw new UnauthorizedError('Требуется аутентификация');
  }

  // Проверка прав администратора
  const adminCheck = await db.query(
    `SELECT EXISTS(
        SELECT 1 FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1 
        AND ura.tenant_id = $2
        AND r.key IN ('admin', 'super_admin')
      ) as "isAdmin"`,
    [userId, tenantId]
  );

  if (!adminCheck.rows[0]?.isAdmin) {
    throw new UnauthorizedError('Доступ запрещен. Требуются права администратора.');
  }

  // Pagination
  const pageNum = parseInt(page, 10);
  const pageSizeNum = Math.min(parseInt(pageSize, 10), 100);
  const offset = (pageNum - 1) * pageSizeNum;

  // Build query
  let query = `
      SELECT
        u.id,
        u.email,
        u.full_name as "fullName",
        u.phone,
        u.status,
        u.email_verified as "emailVerified",
        u.created_at as "createdAt",
        u.updated_at as "updatedAt",
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', r.id,
              'name', r.key,
              'displayName', r.name
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) as roles
      FROM users u
      JOIN user_tenants ut ON u.id = ut.user_id
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id AND ura.tenant_id = $1
      LEFT JOIN roles r ON ura.role_id = r.id
      WHERE ut.tenant_id = $1
    `;

  const params = [tenantId];
  let paramCount = 1;

  // Search filter
  if (search) {
    paramCount++;
    query += ` AND (
        LOWER(u.full_name) LIKE LOWER($${paramCount}) 
        OR LOWER(u.email) LIKE LOWER($${paramCount})
      )`;
    params.push(`%${search}%`);
  }

  query += ` GROUP BY u.id, u.email, u.full_name, u.phone, u.status, u.email_verified, u.created_at, u.updated_at`;
  query += ` ORDER BY u.full_name ASC, u.email ASC`;
  query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(pageSizeNum, offset);

  // Get users
  const result = await db.query(query, params);

  // Transform status to isActive for frontend compatibility
  const users = result.rows.map(user => ({
    ...user,
    isActive: user.status === 'active'
  }));

  // Get total count
  let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      JOIN user_tenants ut ON u.id = ut.user_id
      WHERE ut.tenant_id = $1
    `;
  const countParams = [tenantId];

  if (search) {
    countQuery += ` AND (
        LOWER(u.full_name) LIKE LOWER($2) 
        OR LOWER(u.email) LIKE LOWER($2)
      )`;
    countParams.push(`%${search}%`);
  }

  const countResult = await db.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].total, 10);

  res.status(200).json({
    success: true,
    data: users,
    total,
    page: pageNum,
    pageSize: pageSizeNum,
    totalPages: Math.ceil(total / pageSizeNum)
  });
});

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
export const getUserById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;
  const userId = req.user?.userId;

  if (!tenantId || !userId) {
    throw new UnauthorizedError('Требуется аутентификация');
  }

  // Проверка прав администратора
  const adminCheck = await db.query(
    `SELECT EXISTS(
        SELECT 1 FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1 
        AND ura.tenant_id = $2
        AND r.key IN ('admin', 'super_admin')
      ) as "isAdmin"`,
    [userId, tenantId]
  );

  if (!adminCheck.rows[0]?.isAdmin) {
    throw new UnauthorizedError('Доступ запрещен');
  }

  const result = await db.query(
    `SELECT
        u.id,
        u.email,
        u.full_name as "fullName",
        u.phone,
        u.status,
        u.email_verified as "emailVerified",
        u.created_at as "createdAt",
        u.updated_at as "updatedAt",
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', r.id,
              'name', r.key,
              'displayName', r.name
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) as roles
      FROM users u
      JOIN user_tenants ut ON u.id = ut.user_id
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id AND ura.tenant_id = $1
      LEFT JOIN roles r ON ura.role_id = r.id
      WHERE u.id = $2 AND ut.tenant_id = $1
      GROUP BY u.id, u.email, u.full_name, u.phone, u.status, u.email_verified, u.created_at, u.updated_at`,
    [tenantId, id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Пользователь не найден');
  }

  const user = result.rows[0];
  user.isActive = user.status === 'active';

  res.status(200).json({
    success: true,
    data: user
  });
});

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
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               roleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Пользователь создан
 *       409:
 *         description: Email уже существует
 */
export const createUser = catchAsync(async (req, res) => {
  const { fullName, email, phone, password, roleIds, requireEmailVerification = false } = req.body;
  const tenantId = req.user?.tenantId;
  const userId = req.user?.userId;

  if (!tenantId || !userId) {
    throw new UnauthorizedError('Требуется аутентификация');
  }

  // Проверка прав администратора
  const adminCheck = await db.query(
    `SELECT EXISTS(
        SELECT 1 FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1 
        AND ura.tenant_id = $2
        AND r.key IN ('admin', 'super_admin')
      ) as "isAdmin"`,
    [userId, tenantId]
  );

  if (!adminCheck.rows[0]?.isAdmin) {
    throw new UnauthorizedError('Доступ запрещен');
  }

  // Validation
  if (!fullName || !email || !password) {
    throw new BadRequestError('Заполните обязательные поля: fullName, email, password');
  }

  // BUG-005 FIX: Валидация сложности пароля
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new BadRequestError(passwordValidation.message);
  }

  // Check if email already exists
  const existingUser = await db.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingUser.rows.length > 0) {
    throw new ConflictError('Пользователь с таким email уже существует');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  // По умолчанию пользователи, созданные админами, не требуют подтверждения email
  // Админ может явно указать requireEmailVerification: true если нужна верификация
  const emailVerified = !requireEmailVerification;

  const userResult = await db.query(
    `INSERT INTO users (email, pass_hash, full_name, phone, status, email_verified, avatar_url)
       VALUES ($1, $2, $3, $4, 'active', $5, '/favicon.png')
       RETURNING id, email, full_name as "fullName", phone, avatar_url as "avatar", status, email_verified as "emailVerified", created_at as "createdAt"`,
    [email.toLowerCase(), passwordHash, fullName, phone || null, emailVerified]
  );

  const newUser = userResult.rows[0];
  newUser.isActive = newUser.status === 'active';

  // Add user to tenant
  await db.query(
    'INSERT INTO user_tenants (user_id, tenant_id) VALUES ($1, $2)',
    [newUser.id, tenantId]
  );

  // Assign roles if provided
  if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
    for (const roleId of roleIds) {
      await db.query(
        `INSERT INTO user_role_assignments (user_id, role_id, tenant_id, assigned_by)
           VALUES ($1, $2, $3, $4)`,
        [newUser.id, roleId, tenantId, userId]
      );
    }
  }

  // Отправляем письмо подтверждения если требуется
  if (requireEmailVerification) {
    try {
      console.log(`📧 Отправляем письмо подтверждения для ${email}`);
      const verificationToken = await generateEmailVerificationToken(newUser.id);
      await sendVerificationEmail(email, verificationToken, fullName);
      console.log(`✅ Письмо подтверждения отправлено на ${email}`);
    } catch (emailError) {
      console.error('❌ Ошибка отправки письма подтверждения:', emailError);
      // Не останавливаем создание пользователя из-за ошибки email
    }
  }

  res.status(201).json({
    success: true,
    message: requireEmailVerification
      ? 'Пользователь создан. На указанный email отправлено письмо с подтверждением.'
      : 'Пользователь успешно создан',
    data: newUser
  });
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Обновить пользователя
 *     description: Обновляет данные пользователя (имя, email, телефон, пароль). Только для администраторов.
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
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Пользователь обновлен
 *       403:
 *         description: Доступ запрещен
 */
export const updateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { fullName, email, phone, password } = req.body;
  const tenantId = req.user?.tenantId;
  const userId = req.user?.userId;

  if (!tenantId || !userId) {
    throw new UnauthorizedError('Требуется аутентификация');
  }

  // Проверка прав администратора
  const adminCheck = await db.query(
    `SELECT EXISTS(
        SELECT 1 FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1 
        AND ura.tenant_id = $2
        AND r.key IN ('admin', 'super_admin')
      ) as "isAdmin"`,
    [userId, tenantId]
  );

  if (!adminCheck.rows[0]?.isAdmin) {
    throw new UnauthorizedError('Доступ запрещен');
  }

  // Check if user exists in tenant
  const userCheck = await db.query(
    `SELECT u.id FROM users u
       JOIN user_tenants ut ON u.id = ut.user_id
       WHERE u.id = $1 AND ut.tenant_id = $2`,
    [id, tenantId]
  );

  if (userCheck.rows.length === 0) {
    throw new NotFoundError('Пользователь не найден');
  }

  // Build update query
  const updates = [];
  const params = [];
  let paramCount = 0;

  if (fullName !== undefined) {
    paramCount++;
    updates.push(`full_name = $${paramCount}`);
    params.push(fullName);
  }

  if (email !== undefined) {
    // Check if new email is unique
    const emailCheck = await db.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email.toLowerCase(), id]
    );

    if (emailCheck.rows.length > 0) {
      throw new ConflictError('Email уже используется другим пользователем');
    }

    paramCount++;
    updates.push(`email = $${paramCount}`);
    params.push(email.toLowerCase());
  }

  if (phone !== undefined) {
    paramCount++;
    updates.push(`phone = $${paramCount}`);
    params.push(phone || null);
  }

  if (password) {
    const passwordHash = await bcrypt.hash(password, 10);
    paramCount++;
    updates.push(`pass_hash = $${paramCount}`);
    params.push(passwordHash);
  }

  if (updates.length === 0) {
    throw new BadRequestError('Нет данных для обновления');
  }

  paramCount++;
  updates.push(`updated_at = NOW()`);
  params.push(id);

  const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, full_name as "fullName", phone, status as "status", updated_at as "updatedAt"
    `;

  const result = await db.query(query, params);

  const updatedUser = result.rows[0];
  updatedUser.isActive = updatedUser.status === 'active';

  res.status(200).json({
    success: true,
    message: 'Пользователь успешно обновлен',
    data: updatedUser
  });
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Удалить пользователя
 *     description: Удаляет пользователя (мягкое удаление - status='deleted'). Только для администраторов.
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
 */
export const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;
  const userId = req.user?.userId;

  if (!tenantId || !userId) {
    throw new UnauthorizedError('Требуется аутентификация');
  }

  // Проверка прав администратора
  const adminCheck = await db.query(
    `SELECT EXISTS(
        SELECT 1 FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1 
        AND ura.tenant_id = $2
        AND r.key IN ('admin', 'super_admin')
      ) as "isAdmin"`,
    [userId, tenantId]
  );

  if (!adminCheck.rows[0]?.isAdmin) {
    throw new UnauthorizedError('Доступ запрещен');
  }

  // Prevent self-deletion
  if (id === userId) {
    throw new BadRequestError('Вы не можете удалить свой собственный аккаунт');
  }

  // Check if user exists
  const userCheck = await db.query(
    `SELECT u.id FROM users u
       JOIN user_tenants ut ON u.id = ut.user_id
       WHERE u.id = $1 AND ut.tenant_id = $2`,
    [id, tenantId]
  );

  if (userCheck.rows.length === 0) {
    throw new NotFoundError('Пользователь не найден');
  }

  // Delete user role assignments for this tenant
  await db.query(
    'DELETE FROM user_role_assignments WHERE user_id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  // Remove user from tenant
  await db.query(
    'DELETE FROM user_tenants WHERE user_id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  // Check if user has other tenants
  const tenantsCheck = await db.query(
    'SELECT COUNT(*) as count FROM user_tenants WHERE user_id = $1',
    [id]
  );

  // If no other tenants, delete user completely
  if (parseInt(tenantsCheck.rows[0].count, 10) === 0) {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
  }

  res.status(200).json({
    success: true,
    message: 'Пользователь успешно удален'
  });
});

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
 *             properties:
 *               roleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Роли назначены
 *       403:
 *         description: Доступ запрещен
 */
export const assignRoles = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { roleIds } = req.body;
  const tenantId = req.user?.tenantId;
  const userId = req.user?.userId;

  if (!tenantId || !userId) {
    throw new UnauthorizedError('Требуется аутентификация');
  }

  // Получаем роли текущего пользователя
  const userRolesResult = await db.query(
    `SELECT r.key 
       FROM user_role_assignments ura
       JOIN roles r ON ura.role_id = r.id
       WHERE ura.user_id = $1`,
    [userId]
  );

  const userRoles = userRolesResult.rows.map(row => row.key);
  const isSuperAdmin = userRoles.includes('super_admin');
  const isAdmin = userRoles.includes('admin');

  // Проверка минимальных прав
  if (!isAdmin && !isSuperAdmin) {
    throw new UnauthorizedError('Доступ запрещен. Требуются права администратора.');
  }

  if (!roleIds || !Array.isArray(roleIds)) {
    throw new BadRequestError('roleIds должен быть массивом');
  }

  // Проверяем назначаемые роли
  const rolesResult = await db.query(
    `SELECT id, key FROM roles WHERE id = ANY($1)`,
    [roleIds]
  );

  const assigningRoles = rolesResult.rows.map(role => role.key);

  // КРИТИЧЕСКАЯ ПРОВЕРКА: только super_admin может назначать super_admin
  if (assigningRoles.includes('super_admin') && !isSuperAdmin) {
    throw new UnauthorizedError('Только super_admin может назначать роль super_admin');
  }

  // Delete existing role assignments for this tenant
  await db.query(
    'DELETE FROM user_role_assignments WHERE user_id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  // Assign new roles
  for (const roleId of roleIds) {
    await db.query(
      `INSERT INTO user_role_assignments (user_id, role_id, tenant_id, assigned_by, assigned_at)
         VALUES ($1, $2, $3, $4, NOW())`,
      [id, roleId, tenantId, userId]
    );
  }

  res.status(200).json({
    success: true,
    message: 'Роли успешно назначены'
  });
});

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
 *       403:
 *         description: Доступ запрещен
 */
export const getAllRoles = catchAsync(async (req, res) => {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.userId;

  // Проверяем, является ли пользователь super_admin
  const userRolesResult = await db.query(
    `SELECT r.key 
       FROM user_role_assignments ura
       JOIN roles r ON ura.role_id = r.id
       WHERE ura.user_id = $1`,
    [userId]
  );

  const userRoles = userRolesResult.rows.map(row => row.key);
  const isSuperAdmin = userRoles.includes('super_admin');

  console.log(`🔍 usersController.getAllRoles:`);
  console.log(`   User: ${req.user?.email}`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Tenant ID: ${tenantId}`);
  console.log(`   User Roles: [${userRoles.join(', ')}]`);
  console.log(`   Is Super Admin: ${isSuperAdmin ? 'YES ✅' : 'NO ❌'}`);

  let result;

  if (isSuperAdmin) {
    // Super admin видит только глобальные роли (tenant_id IS NULL)
    result = await db.query(
      `SELECT 
          id,
          key,
          name,
          description,
          tenant_id
         FROM roles
         WHERE tenant_id IS NULL
         ORDER BY 
           CASE key
             WHEN 'super_admin' THEN 1
             WHEN 'admin' THEN 2
             ELSE 99
           END`
    );
    console.log(`✅ super_admin видит ${result.rows.length} глобальных ролей:`);
    result.rows.forEach(r => {
      console.log(`   - ${r.key}: ${r.name} (tenant_id: ${r.tenant_id || 'NULL'})`);
    });
  } else {
    // Tenant admin видит ТОЛЬКО не-admin роли своего тенанта
    result = await db.query(
      `SELECT 
          id,
          key,
          name,
          description,
          tenant_id
         FROM roles
         WHERE tenant_id = $1 AND key != 'admin'
         ORDER BY 
           CASE key
             WHEN 'manager' THEN 1
             WHEN 'estimator' THEN 2
             WHEN 'supplier' THEN 3
             ELSE 99
           END`,
      [tenantId]
    );
    console.log(`✅ tenant admin видит ${result.rows.length} редактируемых ролей (без admin):`);
    result.rows.forEach(r => {
      console.log(`   - ${r.key}: ${r.name} (tenant_id: ${r.tenant_id})`);
    });
  }

  res.status(200).json({
    success: true,
    data: result.rows
  });
});

/**
 * @swagger
 * /users/{id}/deactivate:
 *   post:
 *     tags: [Users]
 *     summary: Деактивировать пользователя
 *     description: Устанавливает status='inactive'. Пользователь не сможет войти. Только для администраторов.
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
 */
export const deactivateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;
  const userId = req.user?.userId;

  if (!tenantId || !userId) {
    throw new UnauthorizedError('Требуется аутентификация');
  }

  // Проверка прав администратора
  const adminCheck = await db.query(
    `SELECT EXISTS(
        SELECT 1 FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1 
        AND ura.tenant_id = $2
        AND r.key IN ('admin', 'super_admin')
      ) as "isAdmin"`,
    [userId, tenantId]
  );

  if (!adminCheck.rows[0]?.isAdmin) {
    throw new UnauthorizedError('Доступ запрещен');
  }

  if (id === userId) {
    throw new BadRequestError('Вы не можете деактивировать свой собственный аккаунт');
  }

  // 🔒 Tenant Isolation: проверяем что пользователь принадлежит к тому же tenant
  const userCheck = await db.query(
    `SELECT u.id FROM users u
       JOIN user_tenants ut ON u.id = ut.user_id
       WHERE u.id = $1 AND ut.tenant_id = $2`,
    [id, tenantId]
  );

  if (userCheck.rows.length === 0) {
    throw new NotFoundError('Пользователь не найден в вашей компании');
  }

  await db.query(
    "UPDATE users SET status = 'inactive', updated_at = NOW() WHERE id = $1",
    [id]
  );

  res.status(200).json({
    success: true,
    message: 'Пользователь деактивирован'
  });
});

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
 */
export const activateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;
  const userId = req.user?.userId;

  if (!tenantId || !userId) {
    throw new UnauthorizedError('Требуется аутентификация');
  }

  // Проверка прав администратора
  const adminCheck = await db.query(
    `SELECT EXISTS(
        SELECT 1 FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1 
        AND ura.tenant_id = $2
        AND r.key IN ('admin', 'super_admin')
      ) as "isAdmin"`,
    [userId, tenantId]
  );

  if (!adminCheck.rows[0]?.isAdmin) {
    throw new UnauthorizedError('Доступ запрещен');
  }

  // 🔒 Tenant Isolation: проверяем что пользователь принадлежит к тому же tenant
  const userCheck = await db.query(
    `SELECT u.id FROM users u
       JOIN user_tenants ut ON u.id = ut.user_id
       WHERE u.id = $1 AND ut.tenant_id = $2`,
    [id, tenantId]
  );

  if (userCheck.rows.length === 0) {
    throw new NotFoundError('Пользователь не найден в вашей компании');
  }

  await db.query(
    "UPDATE users SET status = 'active', updated_at = NOW() WHERE id = $1",
    [id]
  );

  res.status(200).json({
    success: true,
    message: 'Пользователь активирован'
  });
});

/**
 * @swagger
 * /users/{id}/avatar:
 *   post:
 *     tags: [Users]
 *     summary: Загрузить аватар пользователя
 *     description: Загружает изображение аватара (base64). Максимум 5MB.
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
 *               avatar:
 *                 type: string
 *                 format: byte
 *                 description: Base64 encoded image
 *     responses:
 *       200:
 *         description: Аватар загружен
 *       400:
 *         description: Неверный формат
 */
export const uploadAvatar = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthorizedError('Требуется аутентификация');
  }

  // Проверяем, что пользователь редактирует свой аватар
  if (id !== userId) {
    throw new UnauthorizedError('Вы можете изменять только свой аватар');
  }

  if (!req.file) {
    throw new BadRequestError('Файл не загружен');
  }

  // Конвертируем файл в base64
  const { buffer, mimetype } = req.file;
  const avatar_url = `data:${mimetype};base64,${buffer.toString('base64')}`;

  console.log('[uploadAvatar] Uploading avatar for user:', id);
  console.log('[uploadAvatar] File size:', buffer.length, 'bytes');
  console.log('[uploadAvatar] MIME type:', mimetype);

  // Обновляем аватар в базе данных
  await db.query(
    'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
    [avatar_url, id]
  );

  res.status(200).json({
    success: true,
    message: 'Аватар успешно загружен',
    avatar_url
  });
});






