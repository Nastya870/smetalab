import db from '../config/database.js';

/**
 * Контроллер для управления ролями (RBAC)
 */

/**
 * Получить все роли
 * - super_admin видит: super_admin + глобальный шаблон admin (tenant_id = NULL)
 * - tenant admin видит: ТОЛЬКО редактируемые роли своего тенанта (БЕЗ admin)
 */
export const getAllRoles = async (req, res) => {
  try {
    const { tenantId, userId } = req.user;
    
    // Проверяем, является ли пользователь super_admin (может быть несколько ролей!)
    const userRolesResult = await db.query(
      `SELECT r.key 
       FROM user_role_assignments ura
       JOIN roles r ON ura.role_id = r.id
       WHERE ura.user_id = $1`,
      [userId]
    );

    const userRoles = userRolesResult.rows.map(row => row.key);
    const isSuperAdmin = userRoles.includes('super_admin');
    
    console.log(`🔍 rolesController.getAllRoles:`);
    console.log(`   User: ${req.user.email}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   User Roles: [${userRoles.join(', ')}]`);
    console.log(`   Is Super Admin: ${isSuperAdmin ? 'YES ✅' : 'NO ❌'}`);
    
    let result;
    
    if (isSuperAdmin) {
      // Super admin видит только глобальные роли (super_admin и шаблонную admin)
      result = await db.query(
        `SELECT r.id, r.key, r.name, r.description, r.tenant_id, r.created_at, r.updated_at
         FROM roles r
         WHERE r.tenant_id IS NULL
         ORDER BY 
           CASE r.key
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
      // Tenant admin видит ТОЛЬКО не-admin роли своего тенанта (те, что может редактировать)
      result = await db.query(
        `SELECT id, key, name, description, tenant_id, created_at, updated_at
         FROM roles
         WHERE tenant_id = $1 AND key != 'admin'
         ORDER BY 
           CASE key
             WHEN 'manager' THEN 1
             WHEN 'estimator' THEN 2
             WHEN 'worker' THEN 3
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
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения ролей',
      error: error.message
    });
  }
};

/**
 * Получить роль по ID
 */
export const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, key, name, description, created_at, updated_at
       FROM roles
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Роль не найдена'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения роли',
      error: error.message
    });
  }
};

/**
 * Создать новую роль (для текущего тенанта)
 */
export const createRole = async (req, res) => {
  try {
    const { key, name, description } = req.body;
    const { tenantId, isSuperAdmin } = req.user;

    // Валидация
    if (!key || !name) {
      return res.status(400).json({
        success: false,
        message: 'Поля key и name обязательны'
      });
    }

    // Проверка уникальности key в пределах тенанта
    const existingRole = await db.query(
      'SELECT id FROM roles WHERE key = $1 AND (tenant_id = $2 OR tenant_id IS NULL)',
      [key, tenantId]
    );

    if (existingRole.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Роль с таким ключом уже существует в вашей компании'
      });
    }

    // Создание роли для текущего тенанта
    // Только super_admin может создавать глобальные роли (tenant_id = NULL)
    const roleTenantId = isSuperAdmin ? null : tenantId;
    
    const result = await db.query(
      `INSERT INTO roles (key, name, description, tenant_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, key, name, description, tenant_id, created_at`,
      [key, name, description || null, roleTenantId]
    );

    res.status(201).json({
      success: true,
      message: 'Роль успешно создана',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка создания роли',
      error: error.message
    });
  }
};

/**
 * Обновить роль
 * - super_admin может редактировать ТОЛЬКО глобальную шаблонную admin роль (tenant_id = NULL)
 * - tenant admin может редактировать ТОЛЬКО не-admin роли своего тенанта
 * - НИКТО не может редактировать admin роли тенантов (они автоматически синхронизируются с шаблоном)
 */
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const { roleKey, tenantId } = req.user;
    const isSuperAdmin = roleKey === 'super_admin';

    // Проверка существования роли
    const roleCheck = await db.query(
      'SELECT id, key, tenant_id FROM roles WHERE id = $1',
      [id]
    );

    if (roleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Роль не найдена'
      });
    }

    const role = roleCheck.rows[0];

    // Запрет на изменение глобальной роли super_admin
    if (role.key === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Нельзя изменять роль super_admin'
      });
    }

    if (isSuperAdmin) {
      // Super admin может редактировать ТОЛЬКО глобальную шаблонную admin роль
      if (role.key !== 'admin' || role.tenant_id !== null) {
        return res.status(403).json({
          success: false,
          message: 'Super admin может редактировать только глобальную шаблонную admin роль'
        });
      }
      console.log(`✅ super_admin редактирует глобальный шаблон admin роли`);
    } else {
      // Tenant admin может редактировать ТОЛЬКО не-admin роли своего тенанта
      if (role.tenant_id !== tenantId) {
        return res.status(403).json({
          success: false,
          message: 'Нельзя изменять роли других компаний'
        });
      }
      
      if (role.key === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Нельзя редактировать admin-роль. Она управляется администратором платформы'
        });
      }
      console.log(`✅ tenant admin редактирует роль ${role.key} своего тенанта`);
    }

    // Обновление роли
    const result = await db.query(
      `UPDATE roles 
       SET name = $1, description = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, key, name, description, tenant_id, created_at, updated_at`,
      [name, description || null, id]
    );

    res.status(200).json({
      success: true,
      message: 'Роль успешно обновлена',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка обновления роли',
      error: error.message
    });
  }
};

/**
 * Удалить роль (только super_admin)
 */
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    // Проверка существования роли
    const roleCheck = await db.query(
      'SELECT id, key, tenant_id FROM roles WHERE id = $1',
      [id]
    );

    if (roleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Роль не найдена'
      });
    }

    const role = roleCheck.rows[0];

    // Запрет на удаление глобальных ролей
    if (role.tenant_id === null) {
      return res.status(403).json({
        success: false,
        message: 'Нельзя удалять глобальные системные роли'
      });
    }
    
    // Проверка, что роль принадлежит тенанту пользователя
    if (role.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Нельзя удалять роли других компаний'
      });
    }

    // Проверка, используется ли роль
    const usageCheck = await db.query(
      'SELECT COUNT(*) as count FROM user_role_assignments WHERE role_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Невозможно удалить роль, так как она используется пользователями'
      });
    }

    // Удаление роли
    await db.query('DELETE FROM roles WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Роль успешно удалена'
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления роли',
      error: error.message
    });
  }
};

export default {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
};
