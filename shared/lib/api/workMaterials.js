import axiosInstance from 'utils/axiosInstance';

/**
 * API клиент для работы со связями Работа-Материал
 */

const workMaterialsAPI = {
  /**
   * Получить все связи
   * @param {Object} params - Параметры запроса (workId, materialId, isRequired)
   * @returns {Promise<Array>} - Массив связей
   */
  getAll: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.workId) queryParams.append('workId', params.workId);
      if (params.materialId) queryParams.append('materialId', params.materialId);
      if (params.isRequired !== undefined) queryParams.append('isRequired', params.isRequired);
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/work-materials?${queryString}` : '/work-materials';
      
      const response = await axiosInstance.get(endpoint);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching work-materials:', error);
      throw error;
    }
  },

  /**
   * Получить материалы для конкретной работы
   * @param {number} workId - ID работы
   * @returns {Promise<Array>} - Массив материалов
   */
  getMaterialsByWork: async (workId) => {
    try {
      const response = await axiosInstance.get(`/work-materials/by-work/${workId}`);
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching materials for work ${workId}:`, error);
      throw error;
    }
  },

  /**
   * Получить материалы для нескольких работ одним запросом (batch)
   * @param {Array<number>} workIds - Массив ID работ
   * @returns {Promise<Object>} - Объект { workId: [materials] }
   */
  getMaterialsForMultipleWorks: async (workIds) => {
    try {
      const response = await axiosInstance.post('/work-materials/batch', { workIds });
      return response.data.data || {};
    } catch (error) {
      console.error(`Error fetching materials for multiple works:`, error);
      throw error;
    }
  },

  /**
   * Получить работы для конкретного материала
   * @param {number} materialId - ID материала
   * @returns {Promise<Array>} - Массив работ
   */
  getWorksByMaterial: async (materialId) => {
    try {
      const response = await axiosInstance.get(`/work-materials/by-material/${materialId}`);
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching works for material ${materialId}:`, error);
      throw error;
    }
  },

  /**
   * Создать новую связь работа-материал
   * @param {Object} linkData - Данные связи { workId, materialId, consumption, isRequired, notes }
   * @returns {Promise<Object>} - Созданная связь
   */
  create: async (linkData) => {
    try {
      const response = await axiosInstance.post('/work-materials', linkData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating work-material link:', error);
      throw error;
    }
  },

  /**
   * Обновить связь
   * @param {number} id - ID связи
   * @param {Object} linkData - Новые данные связи
   * @returns {Promise<Object>} - Обновленная связь
   */
  update: async (id, linkData) => {
    try {
      const response = await axiosInstance.put(`/work-materials/${id}`, linkData);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating work-material ${id}:`, error);
      throw error;
    }
  },

  /**
   * Удалить связь
   * @param {number} id - ID связи
   * @returns {Promise<Object>} - Удаленная связь
   */
  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/work-materials/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error deleting work-material ${id}:`, error);
      throw error;
    }
  }
};

export default workMaterialsAPI;
