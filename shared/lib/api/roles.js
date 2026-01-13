import axiosInstance from 'utils/axiosInstance';

/**
 * API клиент для работы с ролями
 * Базовый URL: /api/roles
 */

/**
 * Получить список всех ролей
 * @returns {Promise} - Список всех ролей
 */
export const getAllRoles = async () => {
  try {
    const response = await axiosInstance.get('/roles');
    return response.data;
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
};

/**
 * Получить роль по ID
 * @param {string} roleId - ID роли
 * @returns {Promise} - Данные роли
 */
export const getRoleById = async (roleId) => {
  try {
    const response = await axiosInstance.get(`/roles/${roleId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching role ${roleId}:`, error);
    throw error;
  }
};

/**
 * Создать новую роль
 * @param {Object} roleData - Данные роли (name, key, description)
 * @returns {Promise} - Созданная роль
 */
export const createRole = async (roleData) => {
  try {
    const response = await axiosInstance.post('/roles', roleData);
    return response.data;
  } catch (error) {
    console.error('Error creating role:', error);
    throw error;
  }
};

/**
 * Обновить роль
 * @param {string} roleId - ID роли
 * @param {Object} roleData - Обновленные данные роли
 * @returns {Promise} - Обновленная роль
 */
export const updateRole = async (roleId, roleData) => {
  try {
    const response = await axiosInstance.put(`/roles/${roleId}`, roleData);
    return response.data;
  } catch (error) {
    console.error(`Error updating role ${roleId}:`, error);
    throw error;
  }
};

/**
 * Удалить роль
 * @param {string} roleId - ID роли
 * @returns {Promise} - Результат удаления
 */
export const deleteRole = async (roleId) => {
  try {
    const response = await axiosInstance.delete(`/roles/${roleId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting role ${roleId}:`, error);
    throw error;
  }
};

/**
 * Назначить роли пользователю
 * @param {string} userId - ID пользователя
 * @param {Array<string>} roleIds - Массив ID ролей
 * @returns {Promise} - Результат назначения
 */
export const assignRolesToUser = async (userId, roleIds) => {
  try {
    const response = await axiosInstance.post(`/users/${userId}/roles`, { roleIds });
    return response.data;
  } catch (error) {
    console.error(`Error assigning roles to user ${userId}:`, error);
    throw error;
  }
};

/**
 * Получить роли пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise} - Роли пользователя
 */
export const getUserRoles = async (userId) => {
  try {
    const response = await axiosInstance.get(`/users/${userId}/roles`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching roles for user ${userId}:`, error);
    throw error;
  }
};

export default {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignRolesToUser,
  getUserRoles
};
