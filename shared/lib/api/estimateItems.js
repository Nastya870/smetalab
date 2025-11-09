/**
 * API клиент для работы с позициями смет (estimate_items)
 */

import axiosInstance from 'utils/axiosInstance';

const estimateItemsAPI = {
  /**
   * Получить все позиции сметы
   * @param {string} estimateId - ID сметы
   * @returns {Promise<Array>} - Массив позиций
   */
  getAll: async (estimateId) => {
    try {
      const response = await axiosInstance.get(`/estimates/${estimateId}/items`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching estimate items:', error);
      throw error;
    }
  },

  /**
   * Получить позицию по ID
   * @param {string} id - ID позиции
   * @returns {Promise<Object>} - Объект позиции
   */
  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/estimates/items/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching estimate item ${id}:`, error);
      throw error;
    }
  },

  /**
   * Создать новую позицию
   * @param {string} estimateId - ID сметы
   * @param {Object} itemData - Данные позиции
   * @returns {Promise<Object>} - Созданная позиция
   */
  create: async (estimateId, itemData) => {
    try {
      const response = await axiosInstance.post(`/estimates/${estimateId}/items`, itemData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating estimate item:', error);
      throw error;
    }
  },

  /**
   * Обновить позицию
   * @param {string} id - ID позиции
   * @param {Object} itemData - Новые данные позиции
   * @returns {Promise<Object>} - Обновленная позиция
   */
  update: async (id, itemData) => {
    try {
      const response = await axiosInstance.put(`/estimates/items/${id}`, itemData);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating estimate item ${id}:`, error);
      throw error;
    }
  },

  /**
   * Удалить позицию
   * @param {string} id - ID позиции
   * @returns {Promise<Object>} - Результат удаления
   */
  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/estimates/items/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting estimate item ${id}:`, error);
      throw error;
    }
  },

  /**
   * Массовое добавление работ из справочника
   * @param {string} estimateId - ID сметы
   * @param {Array<string>} workIds - Массив ID работ
   * @param {Object} quantities - Объект { workId: quantity } с количествами
   * @returns {Promise<Array>} - Массив созданных позиций
   */
  bulkAddFromWorks: async (estimateId, workIds, quantities = {}) => {
    try {
      const response = await axiosInstance.post(
        `/estimates/${estimateId}/items/bulk-from-works`,
        { workIds, quantities }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error bulk adding works:', error);
      throw error;
    }
  },

  /**
   * Изменить порядок позиций
   * @param {string} estimateId - ID сметы
   * @param {Array<Object>} items - Массив { id, position }
   * @returns {Promise<Array>} - Обновленный массив позиций
   */
  reorder: async (estimateId, items) => {
    try {
      const response = await axiosInstance.put(
        `/estimates/${estimateId}/items/reorder`,
        { items }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error reordering items:', error);
      throw error;
    }
  }
};

export default estimateItemsAPI;
