/**
 * API клиент для работы со сметами
 */

import axiosInstance from 'utils/axiosInstance';

/**
 * Получить все сметы проекта
 * @param {string} projectId - ID проекта
 * @returns {Promise<Array>} - Массив смет
 */
const getByProjectId = (projectId) => {
  return axiosInstance
    .get(`/projects/${projectId}/estimates`)
    .then((res) => res.data)
    .catch((error) => {
      console.error('Error fetching estimates:', error);
      throw error;
    });
};

/**
 * Получить смету по ID
 * @param {string} id - ID сметы
 * @returns {Promise<Object>} - Смета
 */
const getById = (id) => {
  return axiosInstance
    .get(`/estimates/${id}`)
    .then((res) => {
      return res.data;
    })
    .catch((error) => {
      console.error('Error fetching estimate:', error);
      throw error;
    });
};

/**
 * Создать новую смету
 * @param {string} projectId - ID проекта
 * @param {Object} data - Данные сметы
 * @returns {Promise<Object>} - Созданная смета
 */
const create = (projectId, data) => {
  return axiosInstance
    .post(`/projects/${projectId}/estimates`, data)
    .then((res) => res.data)
    .catch((error) => {
      console.error('Error creating estimate:', error);
      throw error;
    });
};

/**
 * Обновить смету
 * @param {string} id - ID сметы
 * @param {Object} data - Обновляемые данные
 * @returns {Promise<Object>} - Обновлённая смета
 */
const update = (id, data) => {
  return axiosInstance
    .put(`/estimates/${id}`, data)
    .then((res) => res.data)
    .catch((error) => {
      console.error('Error updating estimate:', error);
      throw error;
    });
};

/**
 * Удалить смету
 * @param {string} id - ID сметы
 * @returns {Promise<Object>} - Результат удаления
 */
const deleteEstimate = (id) => {
  return axiosInstance
    .delete(`/estimates/${id}`)
    .then((res) => res.data)
    .catch((error) => {
      console.error('Error deleting estimate:', error);
      throw error;
    });
};

/**
 * Получить статистику по смете
 * @param {string} id - ID сметы
 * @returns {Promise<Object>} - Статистика
 */
const getStatistics = (id) => {
  return axiosInstance
    .get(`/estimates/${id}/statistics`)
    .then((res) => res.data)
    .catch((error) => {
      console.error('Error fetching estimate statistics:', error);
      throw error;
    });
};

/**
 * Обновить смету с заменой всех позиций (атомарная операция)
 * @param {string} estimateId - ID сметы
 * @param {Object} payload - Данные для обновления
 * @param {Object} payload.estimateData - Данные самой сметы (name, estimateType, etc.)
 * @param {Array} payload.items - Массив позиций с материалами
 * @returns {Promise<Object>} - Обновлённая смета с позициями
 */
const updateWithItems = async (estimateId, payload) => {
  try {
    // 1. Обновляем основные данные сметы (если есть изменения)
    if (payload.estimateData && Object.keys(payload.estimateData).length > 0) {
      await axiosInstance.put(`/estimates/${estimateId}`, payload.estimateData);
    }

    // 2. Заменяем все позиции сметы атомарно
    const response = await axiosInstance.put(
      `/estimates/${estimateId}/items/replace`,
      { items: payload.items || [] }
    );

    return response.data;
  } catch (error) {
    console.error('Error updating estimate with items:', error);
    throw error;
  }
};

export const estimatesAPI = {
  getByProjectId,
  getById,
  create,
  update,
  delete: deleteEstimate,
  getStatistics,
  updateWithItems
};

export default estimatesAPI;
