import axiosInstance from 'utils/axiosInstance';

/**
 * API клиент для работы со справочником Работ
 */

const worksAPI = {
  /**
   * Получить все работы
   * @param {Object} params - Параметры запроса (search, sort, order, page, pageSize)
   * @returns {Promise<Array|Object>} - Массив работ или объект с данными pagination
   */
  getAll: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.search) queryParams.append('search', params.search);
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.order) queryParams.append('order', params.order);
      if (params.isGlobal) queryParams.append('isGlobal', params.isGlobal); // Фильтр по типу
      if (params.page) queryParams.append('page', params.page); // Pagination
      if (params.pageSize) queryParams.append('pageSize', params.pageSize); // Pagination
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/works?${queryString}` : '/works';
      
      const response = await axiosInstance.get(endpoint);
      // API возвращает { success: true, count: N, total: X, page: Y, pageSize: Z, totalPages: W, data: [...] }
      
      // Если запрошена pagination, возвращаем полный response
      if (params.page || params.pageSize) {
        return response.data;
      }
      
      // Для обратной совместимости: без pagination возвращаем только массив data
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching works:', error);
      throw error;
    }
  },

  /**
   * Получить работу по ID
   * @param {number} id - ID работы
   * @returns {Promise<Object>} - Объект работы
   */
  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/works/${id}`);
      // API возвращает { success: true, data: {...} }
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching work ${id}:`, error);
      throw error;
    }
  },

  /**
   * Создать новую работу
   * @param {Object} workData - Данные работы { code, name, unit, basePrice, phase, section, subsection }
   * @returns {Promise<Object>} - Созданная работа
   */
  create: async (workData) => {
    try {
      const response = await axiosInstance.post('/works', workData);
      // API возвращает { success: true, message: "...", data: {...} }
      return response.data.data;
    } catch (error) {
      console.error('Error creating work:', error);
      throw error;
    }
  },

  /**
   * Обновить работу
   * @param {number} id - ID работы
   * @param {Object} workData - Новые данные работы
   * @returns {Promise<Object>} - Обновленная работа
   */
  update: async (id, workData) => {
    try {
      const response = await axiosInstance.put(`/works/${id}`, workData);
      // API возвращает { success: true, message: "...", data: {...} }
      return response.data.data;
    } catch (error) {
      console.error(`Error updating work ${id}:`, error);
      throw error;
    }
  },

  /**
   * Удалить работу
   * @param {number} id - ID работы
   * @returns {Promise<Object>} - Удаленная работа
   */
  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/works/${id}`);
      // API возвращает { success: true, message: "...", data: {...} }
      return response.data.data;
    } catch (error) {
      console.error(`Error deleting work ${id}:`, error);
      throw error;
    }
  },

  /**
   * Получить статистику по работам
   * @returns {Promise<Object>} - Статистика
   */
  getStats: async () => {
    try {
      const response = await axiosInstance.get('/works/stats');
      // API возвращает { success: true, data: {...} }
      return response.data.data;
    } catch (error) {
      console.error('Error fetching works stats:', error);
      throw error;
    }
  }
};

export default worksAPI;
