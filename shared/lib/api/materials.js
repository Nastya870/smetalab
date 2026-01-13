import axiosInstance from 'utils/axiosInstance';

/**
 * API клиент для работы со справочником Материалов
 */

const materialsAPI = {
  /**
   * Получить все материалы
   * @param {Object} params - Параметры запроса (category, supplier, search, sort, order)
   * @returns {Promise<Array>} - Массив материалов
   */
  getAll: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.category) queryParams.append('category', params.category);
      if (params.supplier) queryParams.append('supplier', params.supplier);
      if (params.search) queryParams.append('search', params.search);
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.order) queryParams.append('order', params.order);
      if (params.isGlobal) queryParams.append('isGlobal', params.isGlobal); // Фильтр по типу
      if (params.pageSize) queryParams.append('pageSize', params.pageSize); // Размер страницы
      if (params.page) queryParams.append('page', params.page); // Номер страницы
      if (params.skipCount) queryParams.append('skipCount', params.skipCount); // Пропустить COUNT(*) для ускорения
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/materials?${queryString}` : '/materials';
      
      const response = await axiosInstance.get(endpoint);
      // API возвращает { success: true, count: N, total: M, page: P, pageSize: S, data: [...] }
      // Возвращаем полный объект для поддержки пагинации
      return response.data;
    } catch (error) {
      console.error('Error fetching materials:', error);
      throw error;
    }
  },

  /**
   * Получить материал по ID
   * @param {number} id - ID материала
   * @returns {Promise<Object>} - Объект материала
   */
  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/materials/${id}`);
      // API возвращает { success: true, data: {...} }
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching material ${id}:`, error);
      throw error;
    }
  },

  /**
   * Создать новый материал
   * @param {Object} materialData - Данные материала
   * @returns {Promise<Object>} - Созданный материал
   */
  create: async (materialData) => {
    try {
      const response = await axiosInstance.post('/materials', materialData);
      // API возвращает { success: true, message: "...", data: {...} }
      return response.data.data;
    } catch (error) {
      console.error('Error creating material:', error);
      throw error;
    }
  },

  /**
   * Обновить материал
   * @param {number} id - ID материала
   * @param {Object} materialData - Новые данные материала
   * @returns {Promise<Object>} - Обновленный материал
   */
  update: async (id, materialData) => {
    try {
      const response = await axiosInstance.put(`/materials/${id}`, materialData);
      // API возвращает { success: true, message: "...", data: {...} }
      return response.data.data;
    } catch (error) {
      console.error(`Error updating material ${id}:`, error);
      throw error;
    }
  },

  /**
   * Удалить материал
   * @param {number} id - ID материала
   * @returns {Promise<Object>} - Удаленный материал
   */
  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/materials/${id}`);
      // API возвращает { success: true, message: "...", data: {...} }
      return response.data.data;
    } catch (error) {
      console.error(`Error deleting material ${id}:`, error);
      throw error;
    }
  },

  /**
   * Получить статистику по материалам
   * @returns {Promise<Object>} - Статистика
   */
  getStats: async () => {
    try {
      const response = await axiosInstance.get('/materials/stats');
      // API возвращает { success: true, data: {...} }
      return response.data.data;
    } catch (error) {
      console.error('Error fetching materials stats:', error);
      throw error;
    }
  },

  /**
   * Получить список категорий
   * @returns {Promise<Array>} - Массив категорий с количеством
   */
  getCategories: async () => {
    try {
      const response = await axiosInstance.get('/materials/categories');
      // API возвращает { success: true, data: [...] }
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching material categories:', error);
      throw error;
    }
  },

  /**
   * Получить список поставщиков
   * @returns {Promise<Array>} - Массив поставщиков с количеством
   */
  getSuppliers: async () => {
    try {
      const response = await axiosInstance.get('/materials/suppliers');
      // API возвращает { success: true, data: [...] }
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching material suppliers:', error);
      throw error;
    }
  }
};

export default materialsAPI;
