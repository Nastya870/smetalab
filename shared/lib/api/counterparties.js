import axiosInstance from 'utils/axiosInstance';

const counterpartiesAPI = {
  /**
   * Получить всех контрагентов
   * @param {Object} params - Параметры фильтрации
   * @param {string} params.entityType - Тип: 'individual' | 'legal'
   * @param {string} params.search - Поиск
   * @returns {Promise<Array>} Массив контрагентов
   */
  getAll: async (params = {}) => {
    const response = await axiosInstance.get('/counterparties', { params });
    return response.data.counterparties || [];
  },

  /**
   * Получить контрагента по ID
   * @param {string} id - ID контрагента
   * @returns {Promise<Object>} Контрагент
   */
  getById: async (id) => {
    const response = await axiosInstance.get(`/counterparties/${id}`);
    return response.data;
  },

  /**
   * Создать контрагента
   * @param {Object} data - Данные контрагента
   * @returns {Promise<Object>} Созданный контрагент
   */
  create: async (data) => {
    const response = await axiosInstance.post('/counterparties', data);
    return response.data.counterparty;
  },

  /**
   * Обновить контрагента
   * @param {string} id - ID контрагента
   * @param {Object} data - Данные для обновления
   * @returns {Promise<Object>} Обновленный контрагент
   */
  update: async (id, data) => {
    const response = await axiosInstance.put(`/counterparties/${id}`, data);
    return response.data.counterparty;
  },

  /**
   * Удалить контрагента
   * @param {string} id - ID контрагента
   * @returns {Promise<Object>} Результат удаления
   */
  delete: async (id) => {
    const response = await axiosInstance.delete(`/counterparties/${id}`);
    return response.data;
  }
};

export default counterpartiesAPI;
