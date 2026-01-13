import axiosInstance from 'utils/axiosInstance';

/**
 * API клиент для работы с разрешениями (permissions)
 * Базовый URL: /api/permissions
 */

/**
 * Получить все разрешения (группированные по ресурсам)
 * @returns {Promise} - Данные всех разрешений
 */
export const getAllPermissions = async () => {
  try {
    const response = await axiosInstance.get('/permissions');
    return response.data;
  } catch (error) {
    console.error('Error fetching all permissions:', error);
    throw error;
  }
};

/**
 * Получить разрешения конкретной роли
 * @param {string} roleId - ID роли
 * @returns {Promise} - Разрешения роли с флагами is_hidden
 */
export const getRolePermissions = async (roleId) => {
  try {
    const response = await axiosInstance.get(`/permissions/roles/${roleId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching permissions for role ${roleId}:`, error);
    throw error;
  }
};

/**
 * Обновить разрешения роли (ТОЛЬКО super_admin)
 * @param {string} roleId - ID роли
 * @param {Array} permissions - Массив объектов [{permissionId: 'uuid', isHidden: boolean}, ...]
 * @returns {Promise} - Результат обновления
 */
export const updateRolePermissions = async (roleId, permissions) => {
  try {
    const response = await axiosInstance.put(`/permissions/roles/${roleId}`, {
      permissions
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating permissions for role ${roleId}:`, error);
    throw error;
  }
};

/**
 * Получить разрешения пользователя (через его роли)
 * @param {string} userId - ID пользователя
 * @returns {Promise} - Все разрешения пользователя с видимостью
 */
export const getUserPermissions = async (userId) => {
  try {
    const response = await axiosInstance.get(`/permissions/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching permissions for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Проверить видимость UI элемента для текущего пользователя
 * @param {string} resource - Ресурс (например, 'dashboard', 'materials')
 * @param {string} action - Действие (по умолчанию 'view')
 * @returns {Promise<boolean>} - Доступен ли элемент UI
 */
export const checkUIVisibility = async (resource, action = 'view') => {
  try {
    const response = await axiosInstance.get('/permissions/check-visibility', {
      params: { resource, action }
    });
    return response.data?.data?.isVisible || false;
  } catch (error) {
    console.error(`Error checking visibility for ${resource}.${action}:`, error);
    return false; // По умолчанию скрыт при ошибке
  }
};

/**
 * Вспомогательная функция: проверить несколько UI элементов одновременно
 * @param {Array<{resource: string, action?: string}>} checks - Массив проверок
 * @returns {Promise<Object>} - Объект с результатами {resource.action: boolean}
 */
export const checkMultipleUIVisibility = async (checks) => {
  try {
    const results = await Promise.all(
      checks.map(({ resource, action = 'view' }) =>
        checkUIVisibility(resource, action).then(isVisible => ({
          key: `${resource}.${action}`,
          isVisible
        }))
      )
    );

    return results.reduce((acc, { key, isVisible }) => {
      acc[key] = isVisible;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error checking multiple UI visibility:', error);
    return {};
  }
};

export default {
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions,
  checkUIVisibility,
  checkMultipleUIVisibility
};
