import db from '../config/database.js';

/**
 * Middleware для проверки роли super_admin
 * Используется для особо критичных операций
 */
export const requireSuperAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Требуется аутентификация'
      });
    }

    // Проверяем, есть ли у пользователя роль super_admin
    const superAdminCheck = await db.query(
      `SELECT EXISTS(
        SELECT 1 FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1 
        AND r.key = 'super_admin'
      ) as "isSuperAdmin"`,
      [userId]
    );

    if (!superAdminCheck.rows[0]?.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен. Требуются права super_admin.'
      });
    }

    next();
  } catch (error) {
    console.error('SuperAdmin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка проверки прав доступа'
    });
  }
};

/**
 * Middleware для проверки роли admin или super_admin
 * Стандартная проверка для административных операций
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const tenantId = req.user?.tenantId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Требуется аутентификация'
      });
    }

    // Проверяем роли admin или super_admin
    // Super_admin может работать БЕЗ tenantId (глобально)
    const adminCheck = await db.query(
      `SELECT EXISTS(
        SELECT 1 FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1 
        AND (
          (ura.tenant_id = $2 AND r.key = 'admin') OR
          (r.key = 'super_admin')
        )
      ) as "isAdmin"`,
      [userId, tenantId]
    );

    if (!adminCheck.rows[0]?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен. Требуются права администратора.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка проверки прав доступа'
    });
  }
};