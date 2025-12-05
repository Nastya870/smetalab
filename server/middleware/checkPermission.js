/**
 * Middleware для проверки разрешений пользователя
 * 
 * Проверяет наличие разрешения в JWT токене пользователя
 * Используется для защиты API endpoints от несанкционированного доступа
 * 
 * @module middleware/checkPermission
 */

/**
 * Иерархия разрешений: дочерние ресурсы управляются родительскими
 * Если у пользователя есть admin.read, он автоматически получает users.read, roles.read и т.д.
 */
const PERMISSION_HIERARCHY = {
  // Администрирование → управляет пользователями, ролями, тенантами, настройками
  'admin': ['users', 'roles', 'tenants', 'settings'],
  
  // Справочники → управляет материалами, работами, контрагентами
  'references': ['materials', 'works', 'counterparties'],
  
  // Проекты → управляет сметами, шаблонами смет, закупками, отчётами
  'projects': ['estimates', 'estimate_templates', 'purchases', 'reports']
};

/**
 * Получить родительский ресурс для дочернего
 * @param {string} resource - Дочерний ресурс (например, 'users', 'materials')
 * @returns {string|null} - Родительский ресурс (например, 'admin', 'references') или null
 */
function getParentResource(resource) {
  for (const [parent, children] of Object.entries(PERMISSION_HIERARCHY)) {
    if (children.includes(resource)) {
      return parent;
    }
  }
  return null;
}

/**
 * Middleware для проверки одного разрешения
 * 
 * @param {string} resource - Ресурс (например, 'projects', 'users')
 * @param {string} action - Действие (например, 'create', 'read', 'update', 'delete')
 * @returns {Function} Express middleware
 * 
 * @example
 * // Защита DELETE endpoint проектов
 * router.delete('/projects/:id', 
 *   authenticateToken, 
 *   checkPermission('projects', 'delete'),
 *   deleteProject
 * );
 */
export const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      const permissions = req.user?.permissions || [];
      const isSuperAdmin = req.user?.isSuperAdmin;
      
      // Super admin имеет все права
      if (isSuperAdmin) {
        return next();
      }

      const permissionKey = `${resource}.${action}`;

      // ⭐ Проверка прямого разрешения
      let hasPermission = permissions.some(p => p.key === permissionKey);

      // ⭐ Проверка иерархического разрешения (если прямого нет)
      if (!hasPermission) {
        const parentResource = getParentResource(resource);
        if (parentResource) {
          const parentPermissionKey = `${parentResource}.${action}`;
          hasPermission = permissions.some(p => p.key === parentPermissionKey);
          
          if (hasPermission) {
            console.log(`✅ Permission granted via hierarchy: ${permissionKey} (через ${parentPermissionKey}) for user ${userId}`);
            return next();
          }
        }
      }

      if (hasPermission) {
        console.log(`✅ Permission granted: ${permissionKey} for user ${userId}`);
        return next();
      }

      // Логируем попытку несанкционированного доступа
      console.warn(`⛔ Permission denied: ${permissionKey} for user ${userId}`);

      // Если разрешения нет - возвращаем 403
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав для выполнения действия',
        error: 'PERMISSION_DENIED',
        required: permissionKey
      });
    } catch (error) {
      console.error('❌ Error checking permission:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка проверки прав доступа',
        error: error.message
      });
    }
  };
};

/**
 * Middleware для проверки одного из нескольких разрешений (OR)
 * Пользователь должен иметь ХОТЯ БЫ ОДНО из указанных разрешений
 * 
 * @param {...Array<string>} permissionPairs - Массивы [resource, action]
 * @returns {Function} Express middleware
 * 
 * @example
 * // Обновление проекта требует либо projects.update, либо projects.manage
 * router.put('/projects/:id', 
 *   authenticateToken, 
 *   checkAnyPermission(['projects', 'update'], ['projects', 'manage']),
 *   updateProject
 * );
 */
export const checkAnyPermission = (...permissionPairs) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      const permissions = req.user?.permissions || [];
      const isSuperAdmin = req.user?.isSuperAdmin;
      
      // Super admin имеет все права
      if (isSuperAdmin) {
        return next();
      }
      
      // ⭐ Проверяем каждую пару [resource, action] с поддержкой иерархии
      const hasPermission = permissionPairs.some(([resource, action]) => {
        const permissionKey = `${resource}.${action}`;
        
        // Прямая проверка
        if (permissions.some(p => p.key === permissionKey)) {
          return true;
        }
        
        // Проверка через иерархию
        const parentResource = getParentResource(resource);
        if (parentResource) {
          const parentPermissionKey = `${parentResource}.${action}`;
          if (permissions.some(p => p.key === parentPermissionKey)) {
            return true;
          }
        }
        
        return false;
      });

      if (hasPermission) {
        const grantedPermission = permissionPairs.find(([resource, action]) => {
          const permissionKey = `${resource}.${action}`;
          
          // Прямая проверка
          if (permissions.some(p => p.key === permissionKey)) {
            return true;
          }
          
          // Проверка через иерархию
          const parentResource = getParentResource(resource);
          if (parentResource) {
            const parentPermissionKey = `${parentResource}.${action}`;
            if (permissions.some(p => p.key === parentPermissionKey)) {
              return true;
            }
          }
          
          return false;
        });
        console.log(`✅ Permission granted: ${grantedPermission[0]}.${grantedPermission[1]} for user ${userId}`);
        return next();
      }

      // Логируем попытку несанкционированного доступа
      const requiredPerms = permissionPairs.map(([r, a]) => `${r}.${a}`);
      console.warn(`⛔ Permission denied: requires any of [${requiredPerms.join(', ')}] for user ${userId}`);

      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав для выполнения действия',
        error: 'PERMISSION_DENIED',
        requiredAny: requiredPerms
      });
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка проверки прав доступа',
        error: error.message
      });
    }
  };
};

/**
 * Middleware для проверки нескольких разрешений одновременно (AND)
 * Пользователь должен иметь ВСЕ указанные разрешения
 * 
 * @param {...Array<string>} permissionPairs - Массивы [resource, action]
 * @returns {Function} Express middleware
 * 
 * @example
 * // Специальная операция требует и projects.update, и estimates.approve
 * router.post('/projects/:id/finalize', 
 *   authenticateToken, 
 *   checkAllPermissions(['projects', 'update'], ['estimates', 'approve']),
 *   finalizeProject
 * );
 */
export const checkAllPermissions = (...permissionPairs) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      const permissions = req.user?.permissions || [];
      const isSuperAdmin = req.user?.isSuperAdmin;
      
      // Super admin имеет все права
      if (isSuperAdmin) {
        return next();
      }
      
      // ⭐ Проверяем каждую пару [resource, action] с поддержкой иерархии
      const missingPermissions = permissionPairs.filter(([resource, action]) => {
        const permissionKey = `${resource}.${action}`;
        
        // Прямая проверка
        if (permissions.some(p => p.key === permissionKey)) {
          return false; // Разрешение есть
        }
        
        // Проверка через иерархию
        const parentResource = getParentResource(resource);
        if (parentResource) {
          const parentPermissionKey = `${parentResource}.${action}`;
          if (permissions.some(p => p.key === parentPermissionKey)) {
            return false; // Разрешение есть через иерархию
          }
        }
        
        return true; // Разрешения нет
      });

      if (missingPermissions.length === 0) {
        console.log(`✅ All permissions granted for user ${userId}`);
        return next();
      }

      // Логируем отсутствующие разрешения
      const missing = missingPermissions.map(([r, a]) => `${r}.${a}`);
      console.warn(`⛔ Missing permissions: [${missing.join(', ')}] for user ${userId}`);

      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав для выполнения действия',
        error: 'PERMISSION_DENIED',
        missing: missing
      });
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка проверки прав доступа',
        error: error.message
      });
    }
  };
};

/**
 * Middleware для проверки владения ресурсом
 * Пользователь может выполнить действие только если он владелец ресурса ИЛИ имеет manage разрешение
 * 
 * @param {string} resource - Ресурс (например, 'projects')
 * @param {Function} getResourceOwner - Async функция для получения владельца: (req) => userId
 * @returns {Function} Express middleware
 * 
 * @example
 * // Удаление проекта только владельцем или админом
 * router.delete('/projects/:id', 
 *   authenticateToken,
 *   checkOwnership('projects', async (req) => {
 *     const project = await db.query('SELECT created_by FROM projects WHERE id = $1', [req.params.id]);
 *     return project.rows[0]?.created_by;
 *   }),
 *   deleteProject
 * );
 */
export const checkOwnership = (resource, getResourceOwner) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      const permissions = req.user?.permissions || [];
      const isSuperAdmin = req.user?.isSuperAdmin;
      
      // Super admin имеет все права
      if (isSuperAdmin) {
        return next();
      }

      // Проверяем, есть ли manage разрешение (обходит проверку владения)
      const managePermission = `${resource}.manage`;
      if (permissions.includes(managePermission)) {
        console.log(`✅ Manage permission granted: ${managePermission} for user ${userId}`);
        return next();
      }

      // Получаем владельца ресурса
      const ownerId = await getResourceOwner(req);
      
      if (!ownerId) {
        return res.status(404).json({
          success: false,
          message: 'Ресурс не найден',
          error: 'NOT_FOUND'
        });
      }

      // Проверяем, является ли пользователь владельцем
      if (ownerId === userId) {
        console.log(`✅ Ownership verified for user ${userId}`);
        return next();
      }

      // Не владелец и нет manage прав
      console.warn(`⛔ Ownership denied: user ${userId} is not owner of resource (owner: ${ownerId})`);

      return res.status(403).json({
        success: false,
        message: 'Вы можете изменять только свои ресурсы',
        error: 'NOT_OWNER'
      });
    } catch (error) {
      console.error('❌ Error checking ownership:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка проверки прав владения',
        error: error.message
      });
    }
  };
};

export default {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  checkOwnership
};
