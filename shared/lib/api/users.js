import axiosInstance from 'utils/axiosInstance';

/**
 * Users Management API
 * Управление пользователями (только для администраторов)
 */

/**
 * Получить список всех пользователей компании
 * @param {Object} params - Параметры запроса
 * @param {number} params.page - Номер страницы
 * @param {number} params.pageSize - Размер страницы
 * @param {string} params.search - Поиск по имени/email
 * @returns {Promise<Object>} Список пользователей
 */
export const getAllUsers = async (params = {}) => {
  const { page = 1, pageSize = 50, search = '' } = params;
  
  const queryParams = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...(search && { search })
  });

  const response = await axiosInstance.get(`/users?${queryParams}`);
  return response.data;
};

/**
 * Получить пользователя по ID
 * @param {string} id - ID пользователя
 * @returns {Promise<Object>} Данные пользователя
 */
export const getUserById = async (id) => {
  const response = await axiosInstance.get(`/users/${id}`);
  return response.data;
};

/**
 * Создать нового пользователя (регистрация администратором)
 * @param {Object} userData - Данные пользователя
 * @param {string} userData.fullName - Полное имя
 * @param {string} userData.email - Email
 * @param {string} userData.password - Пароль
 * @param {string} [userData.phone] - Телефон
 * @param {Array<string>} [userData.roleIds] - Массив ID ролей
 * @returns {Promise<Object>} Созданный пользователь
 */
export const createUser = async (userData) => {
  const response = await axiosInstance.post('/users', userData);
  return response.data;
};

/**
 * Обновить пользователя
 * @param {string} id - ID пользователя
 * @param {Object} userData - Обновленные данные
 * @returns {Promise<Object>} Обновленный пользователь
 */
export const updateUser = async (id, userData) => {
  const response = await axiosInstance.put(`/users/${id}`, userData);
  return response.data;
};

/**
 * Удалить пользователя
 * @param {string} id - ID пользователя
 * @returns {Promise<Object>} Результат удаления
 */
export const deleteUser = async (id) => {
  const response = await axiosInstance.delete(`/users/${id}`);
  return response.data;
};

/**
 * Назначить роли пользователю
 * @param {string} userId - ID пользователя
 * @param {Array<string>} roleIds - Массив ID ролей
 * @returns {Promise<Object>} Результат назначения
 */
export const assignRoles = async (userId, roleIds) => {
  const response = await axiosInstance.post(`/users/${userId}/roles`, { roleIds });
  return response.data;
};

/**
 * Удалить роль у пользователя
 * @param {string} userId - ID пользователя
 * @param {string} roleId - ID роли
 * @returns {Promise<Object>} Результат удаления
 */
export const removeRole = async (userId, roleId) => {
  const response = await axiosInstance.delete(`/users/${userId}/roles/${roleId}`);
  return response.data;
};

/**
 * Получить список всех доступных ролей
 * @returns {Promise<Array>} Список ролей
 */
export const getAllRoles = async () => {
  const response = await axiosInstance.get('/roles');
  return response.data;
};

/**
 * Деактивировать пользователя
 * @param {string} id - ID пользователя
 * @returns {Promise<Object>} Результат деактивации
 */
export const deactivateUser = async (id) => {
  const response = await axiosInstance.patch(`/users/${id}/deactivate`);
  return response.data;
};

/**
 * Активировать пользователя
 * @param {string} id - ID пользователя
 * @returns {Promise<Object>} Результат активации
 */
export const activateUser = async (id) => {
  const response = await axiosInstance.patch(`/users/${id}/activate`);
  return response.data;
};

/**
 * Загрузить аватар пользователя
 * @param {string} id - ID пользователя
 * @param {FormData} formData - FormData с файлом аватара
 * @returns {Promise<Object>} Результат загрузки с avatar_url
 */
export const uploadAvatar = async (id, formData) => {
  const response = await axiosInstance.post(`/users/${id}/avatar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  assignRoles,
  removeRole,
  getAllRoles,
  deactivateUser,
  activateUser,
  uploadAvatar
};
