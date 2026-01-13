import db from '../config/database.js';
import { catchAsync, BadRequestError, NotFoundError, ConflictError } from '../utils/errors.js';

/**
 * Контроллер для управления разрешениями и видимостью UI элементов
 */

/**
 * Получить все разрешения (группированные по ресурсам)
 */
export const getAllPermissions = catchAsync(async (req, res) => {
  const result = await db.query(
      `SELECT 
        id, 
        key, 
        name, 
        description, 
        resource, 
        action,
        is_hidden as "defaultHidden"
       FROM permissions
       ORDER BY resource, 
         CASE action
           WHEN 'create' THEN 1
           WHEN 'read' THEN 2
           WHEN 'update' THEN 3
           WHEN 'delete' THEN 4
           WHEN 'manage' THEN 5
           WHEN 'view' THEN 6
           WHEN 'view_menu' THEN 7
           ELSE 99
         END`
    );

    // Группировка по ресурсам
    const grouped = {};
    result.rows.forEach((perm) => {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = {
          resource: perm.resource,
          resourceName: getResourceName(perm.resource),
          icon: getResourceIcon(perm.resource),
          permissions: []
        };
      }
      grouped[perm.resource].permissions.push({
        id: perm.id,
        key: perm.key,
        name: perm.name,
        action: perm.action,
        description: perm.description,
        defaultHidden: perm.defaultHidden
      });
    });

  res.status(200).json({
    success: true,
    data: Object.values(grouped)
  });
});

/**
 * Получить разрешения роли (с флагом is_hidden)
 */
export const getRolePermissions = catchAsync(async (req, res) => {
  const { roleId } = req.params;

  console.log(`🔍 getRolePermissions: roleId = ${roleId}`);

  // Получаем информацию о роли
  const roleResult = await db.query(
    'SELECT id, key, name FROM roles WHERE id = $1',
    [roleId]
  );

  console.log(`🔍 getRolePermissions: найдено ${roleResult.rows.length} ролей`);
  if (roleResult.rows.length > 0) {
    console.log(`🔍 getRolePermissions: роль =`, roleResult.rows[0]);
  }

  if (roleResult.rows.length === 0) {
    throw new NotFoundError('Роль не найдена');
  }

  const role = roleResult.rows[0];

  // Получаем разрешения роли с флагом is_hidden
  const permissionsResult = await db.query(
      `SELECT 
        p.id as permission_id,
        p.key,
        p.name,
        p.resource,
        p.action,
        rp.is_hidden
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1
       ORDER BY p.resource, p.action`,
    [roleId]
  );

  // Формируем данные для frontend
  const permissions = permissionsResult.rows.map(row => ({
    id: row.permission_id,
    key: row.key,
    name: row.name,
    resource: row.resource,
    action: row.action,
    isHidden: row.is_hidden
  }));

  // Также возвращаем массив ID разрешений и массив ID скрытых
  const permissionIds = permissions.map(p => p.id);
  const hiddenPermissionIds = permissions.filter(p => p.isHidden).map(p => p.id);

  res.status(200).json({
    success: true,
    data: {
      roleId: role.id,
      roleKey: role.key,
      roleName: role.name,
      permissions: permissions,
      permissionIds: permissionIds,
      hiddenPermissionIds: hiddenPermissionIds
    }
  });
});

/**
 * Обновить разрешения роли (КРИТИЧЕСКАЯ ОПЕРАЦИЯ - только super_admin)
 * Поддерживает установку флага is_hidden для каждого разрешения
 */
export const updateRolePermissions = catchAsync(async (req, res) => {
  const { roleId } = req.params;
    const { permissions } = req.body; // [{permissionId: 'uuid', isHidden: false}, ...]
    const userId = req.user?.userId;
    const tenantId = req.user?.tenantId;
    const isSuperAdmin = req.user?.isSuperAdmin;

  if (!Array.isArray(permissions)) {
    throw new BadRequestError('permissions должен быть массивом объектов [{permissionId, isHidden}]');
  }

  // Проверяем существование роли
  const roleCheck = await db.query(
      'SELECT id, key, name, tenant_id FROM roles WHERE id = $1',
      [roleId]
    );

  if (roleCheck.rows.length === 0) {
    throw new NotFoundError('Роль не найдена');
  }

  const role = roleCheck.rows[0];

  // ПРОВЕРКА ПРАВ ДОСТУПА:
  // 1. Super admin может редактировать любые роли (включая глобальный шаблон admin)
  // 2. Tenant admin может редактировать только подчинённые роли своего тенанта (manager, estimator, supplier)
  if (!isSuperAdmin) {
    // Проверяем, что это tenant admin
    const isAdmin = await db.query(
      `SELECT EXISTS(
        SELECT 1 FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1 
        AND ura.tenant_id = $2 
        AND r.key = 'admin'
      ) as "isAdmin"`,
      [userId, tenantId]
    );

    if (!isAdmin.rows[0]?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещён. Требуются права администратора.'
      });
    }

    // Tenant admin НЕ может редактировать роль admin или роли других тенантов
    if (role.key === 'admin' || role.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Вы можете редактировать только подчинённые роли вашей компании (manager, estimator, supplier)'
      });
    }
  }

  // Переменные для подсчёта - объявляем ДО транзакции (для использования в audit_log)
  let addedCount = 0;
  let hiddenCount = 0;

  // Начинаем транзакцию
  await db.query('BEGIN');

  try {
    // Удаляем старые разрешения
    await db.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

    // Добавляем новые разрешения с флагом is_hidden
    for (const perm of permissions) {
      const { permissionId, isHidden } = perm;

      await db.query(
        'INSERT INTO role_permissions (role_id, permission_id, is_hidden) VALUES ($1, $2, $3)',
        [roleId, permissionId, isHidden || false]
      );
      
      addedCount++;
      if (isHidden) hiddenCount++;
    }

    // ✨ АВТОСИНХРОНИЗАЦИЯ: Если редактируется глобальный шаблон admin, синхронизируем все тенантные admin роли
    if (role.key === 'admin') {
      const roleWithTenant = await db.query(
        'SELECT tenant_id FROM roles WHERE id = $1',
        [roleId]
      );
      
      if (roleWithTenant.rows[0]?.tenant_id === null) {
        // Находим все тенантные admin роли
        const tenantAdminRoles = await db.query(`
          SELECT r.id, r.name, t.name as tenant_name
          FROM roles r
          JOIN tenants t ON r.tenant_id = t.id
          WHERE r.key = 'admin'
          ORDER BY t.name
        `);

        for (const tenantRole of tenantAdminRoles.rows) {
          try {
            // Удаляем старые разрешения
            await db.query('DELETE FROM role_permissions WHERE role_id = $1', [tenantRole.id]);
            
            // Копируем все разрешения из глобального шаблона
            await db.query(`
              INSERT INTO role_permissions (role_id, permission_id, is_hidden)
              SELECT $1, permission_id, is_hidden
              FROM role_permissions
              WHERE role_id = $2
            `, [tenantRole.id, roleId]);
          } catch (syncError) {
            console.error(`Ошибка синхронизации ${tenantRole.tenant_name}:`, syncError.message);
          }
        }
      }
    }

    // Фиксируем транзакцию
    await db.query('COMMIT');

  } catch (error) {
    // Откатываем транзакцию при ошибке
    await db.query('ROLLBACK');
    throw error;
  }

  // Логируем изменение (для аудита) - опционально, игнорируем ошибки если таблица не существует
  await db.query(
    `INSERT INTO audit_log (action, user_id, resource_type, resource_id, details, created_at)
     VALUES ('UPDATE_ROLE_PERMISSIONS', $1, 'role', $2, $3, NOW())`,
    [
      userId, 
      roleId, 
      JSON.stringify({ 
        roleName: role.name, 
        permissionsCount: addedCount,
        hiddenCount: hiddenCount 
      })
    ]
  ).catch(err => {
    // Тихо игнорируем ошибку если таблица audit_log не существует
    if (err.code !== '42P01') {
      console.error('⚠️  Ошибка audit_log:', err.message);
    }
  });

  res.status(200).json({
    success: true,
    message: 'Разрешения роли успешно обновлены',
    data: {
      roleId: role.id,
      roleName: role.name,
      permissionsCount: addedCount,
      hiddenCount: hiddenCount
    }
  });
});

/**
 * Получить разрешения пользователя (с учетом is_hidden)
 * Используется для проверки видимости элементов UI
 */
export const getUserPermissions = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const requestUserId = req.user?.userId;

  // Пользователь может получить только свои разрешения (или super_admin все)
  if (userId !== requestUserId && !req.user?.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Доступ запрещен'
    });
  }

  // Получаем все разрешения пользователя через его роли
  const result = await db.query(
      `SELECT DISTINCT
        p.id,
        p.key,
        p.name,
        p.resource,
        p.action,
        p.description,
        rp.is_hidden,
        r.key as role_key,
        r.name as role_name
       FROM users u
       JOIN user_role_assignments ura ON u.id = ura.user_id
       JOIN roles r ON ura.role_id = r.id
       JOIN role_permissions rp ON r.id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE u.id = $1
       ORDER BY p.resource, p.action`,
    [userId]
  );

  // Группируем по ресурсам
  const grouped = {};
  const visiblePermissions = [];
  const hiddenPermissions = [];

  result.rows.forEach((row) => {
    const permission = {
      id: row.id,
      key: row.key,
      name: row.name,
      resource: row.resource,
      action: row.action,
      description: row.description,
      isHidden: row.is_hidden,
      fromRole: {
        key: row.role_key,
        name: row.role_name
      }
    };

    // Группировка по ресурсам
    if (!grouped[row.resource]) {
      grouped[row.resource] = {
        resource: row.resource,
        resourceName: getResourceName(row.resource),
        permissions: []
      };
    }
    grouped[row.resource].permissions.push(permission);

    // Разделяем видимые и скрытые
    if (row.is_hidden) {
      hiddenPermissions.push(permission);
    } else {
      visiblePermissions.push(permission);
    }
  });

  res.status(200).json({
    success: true,
    data: {
      userId,
      allPermissions: result.rows.length,
      visibleCount: visiblePermissions.length,
      hiddenCount: hiddenPermissions.length,
      grouped: Object.values(grouped),
      visible: visiblePermissions,
      hidden: hiddenPermissions
    }
  });
});

/**
 * Проверить видимость UI элемента для текущего пользователя
 */
export const checkUIVisibility = catchAsync(async (req, res) => {
  const { resource, action = 'view' } = req.query;
  const userId = req.user?.userId;

  if (!resource) {
    throw new BadRequestError('Параметр resource обязателен');
  }

  // Используем функцию из БД
  const result = await db.query(
    'SELECT check_ui_visibility($1, $2, $3) as is_visible',
    [userId, resource, action]
  );

  const isVisible = result.rows[0]?.is_visible || false;

  res.status(200).json({
    success: true,
    data: {
      resource,
      action,
      isVisible
    }
  });
});

// Утилита для получения русских названий ресурсов
function getResourceName(resource) {
  const names = {
    users: 'Пользователи',
    tenants: 'Компании',
    roles: 'Роли',
    projects: 'Проекты',
    estimates: 'Сметы',
    estimate_templates: 'Шаблоны смет',
    materials: 'Материалы',
    works: 'Работы',
    purchases: 'Закупки',
    suppliers: 'Поставщики',
    counterparties: 'Контрагенты',
    contracts: 'Договоры',
    reports: 'Отчеты',
    settings: 'Настройки',
    logs: 'Журналы',
    dashboard: 'Дашборд',
    references: 'Справочники',
    admin: 'Администрирование'
  };
  return names[resource] || resource;
}

// Утилита для получения иконок ресурсов
function getResourceIcon(resource) {
  const icons = {
    users: '👥',
    tenants: '🏢',
    roles: '🎭',
    projects: '🏗️',
    estimates: '📋',
    estimate_templates: '📑',
    materials: '🔧',
    works: '📝',
    purchases: '🛒',
    suppliers: '🚚',
    counterparties: '👔',
    contracts: '📄',
    reports: '📊',
    settings: '⚙️',
    logs: '📜',
    dashboard: '📈',
    references: '📚',
    admin: '🔐'
  };
  return icons[resource] || '📁';
}

export default {
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions,
  checkUIVisibility
};
