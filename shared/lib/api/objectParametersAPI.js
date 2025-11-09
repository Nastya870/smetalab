/**
 * API клиент для работы с параметрами объектов
 */

import axiosInstance from 'utils/axiosInstance';

/**
 * Получить все параметры помещений для сметы
 * @param {string} estimateId - ID сметы
 * @returns {Promise<Array>} - Массив параметров с проемами
 */
const getByEstimateId = async (estimateId) => {
  try {
    const response = await axiosInstance.get(`/estimates/${estimateId}/parameters`);
    return response.data;
  } catch (error) {
    console.error('Error fetching parameters:', error);
    throw error;
  }
};

/**
 * Получить параметр помещения по ID
 * @param {string} parameterId - ID параметра
 * @returns {Promise<Object>} - Параметр с проемами
 */
const getById = async (parameterId) => {
  try {
    const response = await axiosInstance.get(`/parameters/${parameterId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching parameter:', error);
    throw error;
  }
};

/**
 * Сохранить все параметры помещений (bulk save)
 * @param {string} estimateId - ID сметы
 * @param {Array} parameters - Массив параметров для сохранения
 * @returns {Promise<Object>} - Результат сохранения
 */
const saveAll = async (estimateId, parameters) => {
  try {
    const response = await axiosInstance.post(
      `/estimates/${estimateId}/parameters`,
      { parameters }
    );
    return response.data;
  } catch (error) {
    console.error('Error saving parameters:', error);
    throw error;
  }
};

/**
 * Обновить параметр помещения
 * @param {string} parameterId - ID параметра
 * @param {Object} data - Данные для обновления
 * @returns {Promise<Object>} - Обновленный параметр
 */
const update = async (parameterId, data) => {
  try {
    const response = await axiosInstance.put(`/parameters/${parameterId}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating parameter:', error);
    throw error;
  }
};

/**
 * Удалить параметр помещения
 * @param {string} parameterId - ID параметра
 * @returns {Promise<Object>} - Результат удаления
 */
const deleteParameter = async (parameterId) => {
  try {
    const response = await axiosInstance.delete(`/parameters/${parameterId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting parameter:', error);
    throw error;
  }
};

/**
 * Получить статистику по параметрам сметы
 * @param {string} estimateId - ID сметы
 * @returns {Promise<Object>} - Статистика
 */
const getStatistics = async (estimateId) => {
  try {
    const response = await axiosInstance.get(`/estimates/${estimateId}/parameters/statistics`);
    return response.data;
  } catch (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }
};

export const objectParametersAPI = {
  getByEstimateId,
  getById,
  saveAll,
  update,
  delete: deleteParameter,
  getStatistics
};

export default objectParametersAPI;
